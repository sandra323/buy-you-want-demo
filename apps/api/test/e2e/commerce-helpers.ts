import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import {
  PRODUCT_STATUS_ON_SALE,
} from '../../src/products/product.entity';

export async function insertProduct(
  dataSource: DataSource,
  overrides: {
    id?: string;
    name?: string;
    price?: string;
    stock?: number;
    sales?: number;
    status?: number;
    mainImage?: string;
  } = {},
): Promise<string> {
  const id = overrides.id ?? randomUUID();
  const mainImage = overrides.mainImage ?? 'https://example.com/p.jpg';
  await dataSource.query(
    `INSERT INTO products
      (id, name, price, original_price, main_image, images, stock, sales, description, status)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      overrides.name ?? '测试商品',
      overrides.price ?? '19.90',
      mainImage,
      JSON.stringify([mainImage]),
      overrides.stock ?? 10,
      overrides.sales ?? 0,
      'plain',
      overrides.status ?? PRODUCT_STATUS_ON_SALE,
    ],
  );
  return id;
}

export function addressBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    receiverName: '张三',
    phone: '13800001111',
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    detail: '示例路 1 号',
    ...overrides,
  };
}
