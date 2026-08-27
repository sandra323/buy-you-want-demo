import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type HealthDb = 'up' | 'down';

export type HealthPayload = {
  status: 'ok' | 'error';
  db: HealthDb;
  uptimeSec: number;
};

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<HealthPayload> {
    const db = await this.pingDb();
    return {
      status: db === 'up' ? 'ok' : 'error',
      db,
      uptimeSec: Math.floor(process.uptime()),
    };
  }

  private async pingDb(): Promise<HealthDb> {
    try {
      if (!this.dataSource.isInitialized) {
        return 'down';
      }
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    }
  }
}
