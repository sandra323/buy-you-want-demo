import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { SentryModule } from '@sentry/nestjs/setup';
import { LoggerModule } from 'nestjs-pino';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { createValidationPipe } from './http/configure-http-app';
import { buildPinoHttpOptions } from './http/logger-options';
import { TransformInterceptor } from './http/transform.interceptor';
import { OrdersModule } from './orders/orders.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: buildPinoHttpOptions(),
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CartModule,
    AddressesModule,
    OrdersModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: createValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
