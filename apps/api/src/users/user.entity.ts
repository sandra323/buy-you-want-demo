import { Column, Entity, OneToMany } from 'typeorm';
import { Address } from '../addresses/address.entity';
import { RefreshToken } from '../auth/refresh-token.entity';
import { CartItem } from '../cart/cart-item.entity';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { Order } from '../orders/order.entity';

export const USER_STATUS_ACTIVE = 1;
export const USER_STATUS_BANNED = 0;

@Entity('users')
export class User extends UuidTimedEntity {
  @Column({ type: 'varchar', length: 11, unique: true })
  phone!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 72 })
  passwordHash!: string;

  /** Application default is `用户` + last 4 digits of phone (not a static DB default). */
  @Column({ type: 'varchar', length: 32 })
  nickname!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatar!: string | null;

  @Column({ type: 'tinyint', default: USER_STATUS_ACTIVE })
  status!: number;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => CartItem, (item) => item.user)
  cartItems!: CartItem[];

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];
}
