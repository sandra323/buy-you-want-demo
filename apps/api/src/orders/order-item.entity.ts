import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { Product } from '../products/product.entity';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem extends UuidTimedEntity {
  @Column({ name: 'order_id', type: 'char', length: 36 })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.orderItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ name: 'product_name', type: 'varchar', length: 120 })
  productName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 512 })
  image!: string;
}
