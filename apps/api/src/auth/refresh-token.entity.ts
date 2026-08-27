import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UuidTimedEntity } from '../database/uuid-timed.base';
import { User } from '../users/user.entity';

@Entity('refresh_tokens')
@Index('IDX_refresh_tokens_user_id_revoked', ['userId', 'revoked'])
export class RefreshToken extends UuidTimedEntity {
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId!: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by', type: 'char', length: 36, nullable: true })
  replacedBy!: string | null;
}
