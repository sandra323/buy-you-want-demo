import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { User } from '../users/user.entity';

@Entity('addresses')
export class Address extends UuidTimedEntity {
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, (user) => user.addresses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'receiver_name', type: 'varchar', length: 32 })
  receiverName!: string;

  @Column({ type: 'varchar', length: 11 })
  phone!: string;

  @Column({ type: 'varchar', length: 32 })
  province!: string;

  @Column({ type: 'varchar', length: 32 })
  city!: string;

  @Column({ type: 'varchar', length: 32 })
  district!: string;

  @Column({ type: 'varchar', length: 128 })
  detail!: string;

  @Column({ name: 'is_default', type: 'boolean' })
  isDefault!: boolean;
}
