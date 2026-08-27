import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './cart-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem])],
})
export class CartModule {}
