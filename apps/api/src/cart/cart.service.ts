import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, type CartData } from '@lightbuy/shared';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AppException } from '../http/app.exception';
import { PRODUCT_STATUS_ON_SALE, Product } from '../products/product.entity';
import { CartItem } from './cart-item.entity';
import { assertPurchasableQty } from './cart-qty';
import { isCartLineInvalid, toCartData } from './map-cart';
import type { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly items: Repository<CartItem>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async list(userId: string): Promise<CartData> {
    const rows = await this.items.find({
      where: { userId },
      relations: { product: true },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return toCartData(rows);
  }

  async add(userId: string, dto: AddCartItemDto): Promise<CartData> {
    await this.dataSource.transaction(async (em) => {
      const product = await this.lockProduct(em, dto.productId);
      if (!product || product.status !== PRODUCT_STATUS_ON_SALE) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }

      const existing = await em
        .createQueryBuilder(CartItem, 'c')
        .setLock('pessimistic_write')
        .where('c.userId = :userId AND c.productId = :productId', {
          userId,
          productId: dto.productId,
        })
        .getOne();

      const nextQty = (existing?.quantity ?? 0) + dto.quantity;
      assertPurchasableQty(nextQty, product.stock);

      if (existing) {
        existing.quantity = nextQty;
        await em.save(existing);
      } else {
        const row = em.create(CartItem, {
          userId,
          productId: dto.productId,
          quantity: nextQty,
          selected: true,
        });
        await em.save(row);
      }
    });

    return this.list(userId);
  }

  async patch(
    userId: string,
    lineId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartData> {
    await this.dataSource.transaction(async (em) => {
      const line = await em
        .createQueryBuilder(CartItem, 'c')
        .innerJoinAndSelect('c.product', 'p')
        .setLock('pessimistic_write')
        .where('c.id = :lineId AND c.userId = :userId', { lineId, userId })
        .getOne();

      if (!line) {
        throw new AppException(ErrorCode.NOT_FOUND);
      }

      if (dto.quantity !== undefined) {
        if (isCartLineInvalid(line.product) && dto.quantity > line.quantity) {
          throw new AppException(ErrorCode.CONFLICT_STOCK);
        }
        if (!isCartLineInvalid(line.product)) {
          assertPurchasableQty(dto.quantity, line.product.stock);
        } else if (dto.quantity < 1) {
          throw new AppException(ErrorCode.VALIDATION);
        }
        line.quantity = dto.quantity;
      }

      if (dto.selected !== undefined) {
        line.selected = dto.selected;
      }

      await em.save(line);
    });

    return this.list(userId);
  }

  async remove(userId: string, lineId: string): Promise<CartData> {
    const result = await this.items.delete({ id: lineId, userId });
    if (!result.affected) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }
    return this.list(userId);
  }

  private lockProduct(
    em: EntityManager,
    productId: string,
  ): Promise<Product | null> {
    return em
      .createQueryBuilder(Product, 'p')
      .setLock('pessimistic_write')
      .where('p.id = :productId', { productId })
      .getOne();
  }
}
