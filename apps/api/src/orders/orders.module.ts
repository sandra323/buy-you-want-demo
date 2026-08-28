import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Address } from '../addresses/address.entity';
import { CartItem } from '../cart/cart-item.entity';
import { Product } from '../products/product.entity';
import { OrderItem } from './order-item.entity';
import { OrderJobs } from './order-jobs';
import { Order } from './order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, CartItem, Address]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderJobs],
  exports: [OrdersService, OrderJobs],
})
export class OrdersModule {}
