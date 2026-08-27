import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity('cart_items')
@Unique('UQ_cart_items_user_id_product_id', ['userId', 'productId'])
export class CartItem extends UuidTimedEntity {
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, (user) => user.cartItems, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'product_id', type: 'char', length: 36 })
  productId!: string;

  @ManyToOne(() => Product, (product) => product.cartItems, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @Column({ type: 'int', unsigned: true })
  quantity!: number;

  @Column({ type: 'boolean', default: true })
  selected!: boolean;
}
