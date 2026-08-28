import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ErrorCode,
  PAGINATION_DEFAULT_PAGE,
  PAGINATION_DEFAULT_PAGE_SIZE,
  ProductSort,
  type PaginatedData,
  type ProductCard,
  type ProductDetail,
} from '@lightbuy/shared';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppException } from '../http/app.exception';
import { escapeLikePattern } from './escape-like';
import { toProductCard, toProductDetail } from './map-product';
import { PRODUCT_STATUS_ON_SALE, Product } from './product.entity';

export type CatalogListResult = PaginatedData<ProductCard> & {
  isFallback?: true;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly products: Repository<Product>,
  ) {}

  async list(query: {
    sort?: ProductSort;
    page?: number;
    pageSize?: number;
    keyword?: string;
  }): Promise<CatalogListResult> {
    const page = query.page ?? PAGINATION_DEFAULT_PAGE;
    const pageSize = query.pageSize ?? PAGINATION_DEFAULT_PAGE_SIZE;
    const sort = query.sort ?? ProductSort.Comprehensive;
    const keyword = query.keyword;

    if (keyword) {
      const matched = await this.queryOnSale({ keyword, sort, page, pageSize });
      if (matched.total > 0) {
        return {
          items: matched.rows.map((row) => toProductCard(row)),
          page,
          pageSize,
          total: matched.total,
        };
      }

      // 无命中换成综合推荐，从第 1 页开始，避免沿用空搜的 page。
      const recommended = await this.queryOnSale({
        sort: ProductSort.Comprehensive,
        page: PAGINATION_DEFAULT_PAGE,
        pageSize,
      });
      return {
        items: recommended.rows.map((row) =>
          toProductCard(row, { isFallback: true }),
        ),
        page: PAGINATION_DEFAULT_PAGE,
        pageSize,
        total: recommended.total,
        isFallback: true,
      };
    }

    const listed = await this.queryOnSale({ sort, page, pageSize });
    return {
      items: listed.rows.map((row) => toProductCard(row)),
      page,
      pageSize,
      total: listed.total,
    };
  }

  async getById(id: string): Promise<ProductDetail> {
    const product = await this.products.findOne({ where: { id } });
    if (!product || product.status !== PRODUCT_STATUS_ON_SALE) {
      throw new AppException(ErrorCode.NOT_FOUND);
    }
    return toProductDetail(product);
  }

  private async queryOnSale(params: {
    keyword?: string;
    sort: ProductSort;
    page: number;
    pageSize: number;
  }): Promise<{ rows: Product[]; total: number }> {
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.status = :onSale', { onSale: PRODUCT_STATUS_ON_SALE });

    let escaped: string | undefined;
    if (params.keyword) {
      escaped = escapeLikePattern(params.keyword);
      qb.andWhere(`p.name LIKE :kw ESCAPE '\\\\'`, {
        kw: `%${escaped}%`,
      });
    }

    this.applySort(qb, params.sort, escaped);
    qb.skip((params.page - 1) * params.pageSize).take(params.pageSize);

    const [rows, total] = await qb.getManyAndCount();
    return { rows, total };
  }

  private applySort(
    qb: SelectQueryBuilder<Product>,
    sort: ProductSort,
    escapedKeyword?: string,
  ): void {
    let primary = false;
    const order = (column: string, direction: 'ASC' | 'DESC') => {
      if (!primary) {
        qb.orderBy(column, direction);
        primary = true;
      } else {
        qb.addOrderBy(column, direction);
      }
    };

    // 有 keyword 时忽略客户端 sort：前缀命中优先，然后销量（build-spec §5）。
    if (escapedKeyword !== undefined) {
      order(
        `CASE WHEN p.name LIKE :prefix ESCAPE '\\\\' THEN 0 ELSE 1 END`,
        'ASC',
      );
      qb.setParameter('prefix', `${escapedKeyword}%`);
      order('p.sales', 'DESC');
      order('p.id', 'DESC');
      return;
    }

    switch (sort) {
      case ProductSort.PriceDesc:
        order('p.price', 'DESC');
        order('p.id', 'DESC');
        break;
      case ProductSort.PriceAsc:
        order('p.price', 'ASC');
        order('p.id', 'ASC');
        break;
      case ProductSort.Sales:
        order('p.sales', 'DESC');
        order('p.id', 'DESC');
        break;
      case ProductSort.Newest:
        order('p.createdAt', 'DESC');
        order('p.id', 'DESC');
        break;
      case ProductSort.Comprehensive:
      default:
        order('p.sales', 'DESC');
        order('p.createdAt', 'DESC');
        order('p.id', 'DESC');
        break;
    }
  }
}
