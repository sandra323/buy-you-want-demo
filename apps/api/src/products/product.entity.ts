import { Column, Entity, Index, OneToMany } from 'typeorm';
import { CartItem } from '../cart/cart-item.entity';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { OrderItem } from '../orders/order-item.entity';

export const PRODUCT_STATUS_ON_SALE = 1;
export const PRODUCT_STATUS_OFF = 0;

@Entity('products')
@Index('IDX_products_status_sales', ['status', 'sales'])
@Index('IDX_products_status_created_at', ['status', 'createdAt'])
@Index('IDX_products_status_price', ['status', 'price'])
export class Product extends UuidTimedEntity {
  /** LIKE prefix index `name`(32) is created in the initial migration (TypeORM has no prefix option). */
  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: string;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  originalPrice!: string | null;

  @Column({ name: 'main_image', type: 'varchar', length: 512 })
  mainImage!: string;

  @Column({ type: 'json' })
  images!: string[];

  @Column({ type: 'int', unsigned: true })
  stock!: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  sales!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'tinyint' })
  status!: number;

  @OneToMany(() => CartItem, (item) => item.product)
  cartItems!: CartItem[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[];
}
