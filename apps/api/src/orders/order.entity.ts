import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

export const ORDER_STATUS_PENDING_PAY = 0;
export const ORDER_STATUS_PAID = 1;
export const ORDER_STATUS_COMPLETED = 2;
export const ORDER_STATUS_CANCELLED = 3;

export interface ReceiverSnapshot {
  receiverName: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
}

@Entity('orders')
@Index('IDX_orders_user_id_status_created_at', [
  'userId',
  'status',
  'createdAt',
])
export class Order extends UuidTimedEntity {
  @Column({ name: 'order_no', type: 'varchar', length: 32, unique: true })
  orderNo!: string;

  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, (user) => user.orders, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount!: string;

  @Column({ type: 'tinyint' })
  status!: number;

  @Column({ name: 'receiver_snapshot', type: 'json' })
  receiverSnapshot!: ReceiverSnapshot;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt!: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];
}
