import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  getOrderCompleteAfterSec,
  getOrderJobBatchSize,
  getOrderPayTimeoutSec,
} from './order-env';
import { OrdersService } from './orders.service';

/**
 * 未支付超时取消与已支付自动完成。
 * 任务必须幂等（条件更新），部署只跑一个 API 副本，没有选主。
 */
@Injectable()
export class OrderJobs {
  private readonly logger = new Logger(OrderJobs.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron(): Promise<void> {
    // e2e 只走 tick(注入时钟)；避免套件超过 60s 时 cron 误取消未支付单。
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.tick(new Date());
  }

  async tick(now: Date): Promise<void> {
    await this.cancelUnpaid(now);
    await this.completePaid(now);
  }

  private async cancelUnpaid(now: Date): Promise<void> {
    const deadline = new Date(now.getTime() - getOrderPayTimeoutSec() * 1000);
    const take = getOrderJobBatchSize();
    for (;;) {
      const ids = await this.ordersService.findExpiredPendingIds(
        deadline,
        take,
      );
      for (const id of ids) {
        await this.ordersService.cancelPendingById(id, now);
      }
      if (ids.length < take) {
        return;
      }
    }
  }

  private async completePaid(now: Date): Promise<void> {
    const deadline = new Date(
      now.getTime() - getOrderCompleteAfterSec() * 1000,
    );
    const take = getOrderJobBatchSize();
    for (;;) {
      const ids = await this.ordersService.findDueCompleteIds(deadline, take);
      for (const id of ids) {
        const done = await this.ordersService.completePaidById(id, now);
        if (!done) {
          this.logger.debug(`skip complete ${id} (state changed)`);
        }
      }
      if (ids.length < take) {
        return;
      }
    }
  }
}
