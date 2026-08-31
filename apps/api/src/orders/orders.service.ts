import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  ErrorCode,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_DEFAULT_PAGE_SIZE,
  type Order as OrderDto,
  type PaginatedData,
} from '@lightbuy/shared';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Address } from '../addresses/address.entity';
import { CartItem } from '../cart/cart-item.entity';
import { assertPurchasableQty } from '../cart/cart-qty';
import { isMysqlDuplicateError } from '../database/is-mysql-duplicate';
import { AppException } from '../http/app.exception';
import { decimalStringFromCents, toCents } from '../http/money';
import { PRODUCT_STATUS_ON_SALE, Product } from '../products/product.entity';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { OrderListQueryDto } from './dto/order-query.dto';
import { toOrderDto } from './map-order';
import { OrderItem } from './order-item.entity';
import { generateOrderNo } from './order-no';
import {
  ORDER_STATUS_AWAITING_RECEIPT,
  ORDER_STATUS_CANCELLED,
  ORDER_STATUS_COMPLETED,
  ORDER_STATUS_PAID,
  ORDER_STATUS_PENDING_PAY,
  Order,
  type ReceiverSnapshot,
} from './order.entity';

type ResolvedLine = {
  productId: string;
  quantity: number;
  cartLineIds: string[];
};

const ORDER_NO_RETRY = 5;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<OrderDto> {
    const orderId = await this.dataSource.transaction(async (em) => {
      const address = await em.findOne(Address, {
        where: { id: dto.addressId, userId },
      });
      if (!address) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }

      const lines = await this.resolveLines(em, userId, dto);
      const locked = await this.lockProducts(em, lines);

      let totalCents = 0;
      const snapshots: Array<{
        product: Product;
        quantity: number;
      }> = [];

      for (const line of lines) {
        const product = locked.get(line.productId);
        if (!product || product.status !== PRODUCT_STATUS_ON_SALE) {
          throw new AppException(ErrorCode.NOT_FOUND);
        }
        assertPurchasableQty(line.quantity, product.stock);

        const deducted = await em.query(
          `UPDATE products
           SET stock = stock - ?
           WHERE id = ? AND stock >= ? AND status = ?`,
          [
            line.quantity,
            line.productId,
            line.quantity,
            PRODUCT_STATUS_ON_SALE,
          ],
        );
        if (mysqlAffected(deducted) === 0) {
          throw new AppException(ErrorCode.CONFLICT_STOCK);
        }

        totalCents += toCents(product.price) * line.quantity;
        snapshots.push({ product, quantity: line.quantity });
      }

      const now = new Date();
      const order = await this.insertOrder(em, {
        userId,
        totalAmount: decimalStringFromCents(totalCents),
        status: ORDER_STATUS_PENDING_PAY,
        receiverSnapshot: snapshotAddress(address),
        paidAt: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
      });

      for (const snap of snapshots) {
        await em.save(
          em.create(OrderItem, {
            orderId: order.id,
            productId: snap.product.id,
            productName: snap.product.name,
            price: snap.product.price,
            quantity: snap.quantity,
            image: snap.product.mainImage,
          }),
        );
      }

      if (dto.fromCart === true) {
        const cartIds = lines.flatMap((line) => line.cartLineIds);
        if (cartIds.length > 0) {
          await em.delete(CartItem, { id: In(cartIds), userId });
        }
      }

      return order.id;
    });

    return this.getById(userId, orderId);
  }

  async getById(userId: string, orderId: string): Promise<OrderDto> {
    const order = await this.orders.findOne({
      where: { id: orderId, userId },
    });
    if (!order) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }
    const items = await this.orderItems.find({
      where: { orderId: order.id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return toOrderDto(order, items);
  }

  async list(
    userId: string,
    query: OrderListQueryDto,
  ): Promise<PaginatedData<OrderDto>> {
    const page = query.page ?? PAGINATION_DEFAULT_PAGE;
    const pageSize = query.pageSize ?? PAGINATION_DEFAULT_PAGE_SIZE;

    const qb = this.orders
      .createQueryBuilder('o')
      .where('o.userId = :userId', { userId })
      .orderBy('o.createdAt', 'DESC')
      .addOrderBy('o.id', 'DESC');

    if (query.status !== undefined) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    const [rows, total] = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const itemsByOrder = await this.loadItems(rows.map((row) => row.id));

    return {
      items: rows.map((row) => toOrderDto(row, itemsByOrder.get(row.id) ?? [])),
      page,
      pageSize,
      total,
    };
  }

  async pay(userId: string, orderId: string): Promise<OrderDto> {
    await this.requireOwned(userId, orderId);

    await this.dataSource.transaction(async (em) => {
      const now = new Date();
      const updated = await em
        .createQueryBuilder()
        .update(Order)
        .set({ status: ORDER_STATUS_PAID, paidAt: now })
        .where('id = :id AND user_id = :userId AND status = :expected', {
          id: orderId,
          userId,
          expected: ORDER_STATUS_PENDING_PAY,
        })
        .execute();

      if (!updated.affected) {
        throw new AppException(ErrorCode.CONFLICT_STATE);
      }

      const items = await em.find(OrderItem, { where: { orderId } });
      for (const item of items) {
        await em.query(`UPDATE products SET sales = sales + ? WHERE id = ?`, [
          item.quantity,
          item.productId,
        ]);
      }
    });

    return this.getById(userId, orderId);
  }

  async cancel(userId: string, orderId: string): Promise<OrderDto> {
    await this.requireOwned(userId, orderId);
    const cancelled = await this.cancelPendingById(orderId, new Date());
    if (!cancelled) {
      throw new AppException(ErrorCode.CONFLICT_STATE);
    }
    return this.getById(userId, orderId);
  }

  /** 条件更新 0→3 并回库存；0 行视为失败（用户侧 40902，任务侧幂等跳过）。 */
  async cancelPendingById(orderId: string, now: Date): Promise<boolean> {
    return this.dataSource.transaction(async (em) => {
      const updated = await em
        .createQueryBuilder()
        .update(Order)
        .set({ status: ORDER_STATUS_CANCELLED, cancelledAt: now })
        .where('id = :id AND status = :expected', {
          id: orderId,
          expected: ORDER_STATUS_PENDING_PAY,
        })
        .execute();

      if (!updated.affected) {
        return false;
      }

      const items = await em.find(OrderItem, { where: { orderId } });
      for (const item of items) {
        await em.query(`UPDATE products SET stock = stock + ? WHERE id = ?`, [
          item.quantity,
          item.productId,
        ]);
      }
      return true;
    });
  }

  async markAwaitingReceiptById(orderId: string, now: Date): Promise<boolean> {
    const updated = await this.orders
      .createQueryBuilder()
      .update(Order)
      .set({
        status: ORDER_STATUS_AWAITING_RECEIPT,
        awaitingReceiptAt: now,
      })
      .where('id = :id AND status = :expected', {
        id: orderId,
        expected: ORDER_STATUS_PAID,
      })
      .execute();
    return Boolean(updated.affected);
  }

  async completePaidById(orderId: string, now: Date): Promise<boolean> {
    const updated = await this.orders
      .createQueryBuilder()
      .update(Order)
      .set({ status: ORDER_STATUS_COMPLETED, completedAt: now })
      .where('id = :id AND status = :expected', {
        id: orderId,
        expected: ORDER_STATUS_AWAITING_RECEIPT,
      })
      .execute();
    return Boolean(updated.affected);
  }

  async findExpiredPendingIds(
    createdAtOnOrBefore: Date,
    take: number,
  ): Promise<string[]> {
    const rows = await this.orders
      .createQueryBuilder('o')
      .select(['o.id'])
      .where('o.status = :status AND o.createdAt <= :deadline', {
        status: ORDER_STATUS_PENDING_PAY,
        deadline: createdAtOnOrBefore,
      })
      .orderBy('o.createdAt', 'ASC')
      .take(take)
      .getMany();
    return rows.map((row) => row.id);
  }

  async findDueShipIds(
    paidAtOnOrBefore: Date,
    take: number,
  ): Promise<string[]> {
    return this.findIdsByStatusAndPaidAt(
      ORDER_STATUS_PAID,
      paidAtOnOrBefore,
      take,
    );
  }

  async findDueCompleteIds(
    awaitingReceiptAtOnOrBefore: Date,
    take: number,
  ): Promise<string[]> {
    const rows = await this.orders
      .createQueryBuilder('o')
      .select(['o.id'])
      .where('o.status = :status AND o.awaitingReceiptAt <= :deadline', {
        status: ORDER_STATUS_AWAITING_RECEIPT,
        deadline: awaitingReceiptAtOnOrBefore,
      })
      .orderBy('o.awaitingReceiptAt', 'ASC')
      .take(take)
      .getMany();
    return rows.map((row) => row.id);
  }

  private async findIdsByStatusAndPaidAt(
    status: number,
    paidAtOnOrBefore: Date,
    take: number,
  ): Promise<string[]> {
    const rows = await this.orders
      .createQueryBuilder('o')
      .select(['o.id'])
      .where('o.status = :status AND o.paidAt <= :deadline', {
        status,
        deadline: paidAtOnOrBefore,
      })
      .orderBy('o.paidAt', 'ASC')
      .take(take)
      .getMany();
    return rows.map((row) => row.id);
  }

  private async requireOwned(userId: string, orderId: string): Promise<void> {
    const exists = await this.orders.exists({ where: { id: orderId, userId } });
    if (!exists) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }
  }

  private async resolveLines(
    em: EntityManager,
    userId: string,
    dto: CreateOrderDto,
  ): Promise<ResolvedLine[]> {
    if (dto.fromCart === true) {
      // FOR UPDATE：串行同一用户的 fromCart，避免两笔并发都读到同一批已选行后各下一单。
      const cartRows = await em
        .createQueryBuilder(CartItem, 'c')
        .setLock('pessimistic_write')
        .where('c.userId = :userId AND c.selected = :selected', {
          userId,
          selected: true,
        })
        .orderBy('c.createdAt', 'ASC')
        .addOrderBy('c.id', 'ASC')
        .getMany();
      if (cartRows.length === 0) {
        throw new AppException(ErrorCode.VALIDATION);
      }
      return mergeLines(
        cartRows.map((row) => ({
          productId: row.productId,
          quantity: row.quantity,
          cartLineIds: [row.id],
        })),
      );
    }

    const items = dto.items ?? [];
    if (items.length === 0) {
      throw new AppException(ErrorCode.VALIDATION);
    }
    return mergeLines(
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        cartLineIds: [],
      })),
    );
  }

  private async lockProducts(
    em: EntityManager,
    lines: ResolvedLine[],
  ): Promise<Map<string, Product>> {
    const ids = [...new Set(lines.map((line) => line.productId))].sort();
    const locked = new Map<string, Product>();
    for (const id of ids) {
      const product = await em
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id })
        .getOne();
      if (!product) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }
      locked.set(id, product);
    }
    return locked;
  }

  private async insertOrder(
    em: EntityManager,
    fields: {
      userId: string;
      totalAmount: string;
      status: number;
      receiverSnapshot: ReceiverSnapshot;
      paidAt: Date | null;
      completedAt: Date | null;
      cancelledAt: Date | null;
      createdAt: Date;
    },
  ): Promise<Order> {
    let lastError: unknown;
    for (let attempt = 0; attempt < ORDER_NO_RETRY; attempt += 1) {
      try {
        const row = em.create(Order, {
          ...fields,
          orderNo: generateOrderNo(fields.createdAt),
        });
        return await em.save(row);
      } catch (error) {
        lastError = error;
        if (!isMysqlDuplicateError(error)) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  private async loadItems(
    orderIds: string[],
  ): Promise<Map<string, OrderItem[]>> {
    const map = new Map<string, OrderItem[]>();
    if (orderIds.length === 0) {
      return map;
    }
    const rows = await this.orderItems.find({
      where: { orderId: In(orderIds) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    for (const row of rows) {
      const list = map.get(row.orderId) ?? [];
      list.push(row);
      map.set(row.orderId, list);
    }
    return map;
  }
}

function snapshotAddress(address: Address): ReceiverSnapshot {
  return {
    receiverName: address.receiverName,
    phone: address.phone,
    province: address.province,
    city: address.city,
    district: address.district,
    detail: address.detail,
  };
}

function mergeLines(lines: ResolvedLine[]): ResolvedLine[] {
  const merged = new Map<string, ResolvedLine>();
  for (const line of lines) {
    const current = merged.get(line.productId);
    if (!current) {
      merged.set(line.productId, {
        productId: line.productId,
        quantity: line.quantity,
        cartLineIds: [...line.cartLineIds],
      });
    } else {
      current.quantity += line.quantity;
      current.cartLineIds.push(...line.cartLineIds);
    }
  }
  return [...merged.values()];
}

function mysqlAffected(raw: unknown): number {
  if (Array.isArray(raw)) {
    const header = raw[0] as { affectedRows?: number } | undefined;
    return Number(header?.affectedRows ?? 0);
  }
  if (raw && typeof raw === 'object' && 'affectedRows' in raw) {
    return Number((raw as { affectedRows: number }).affectedRows);
  }
  return 0;
}
