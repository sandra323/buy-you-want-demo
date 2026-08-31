import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn, TableIndex } from 'typeorm';

export class AddOrderAwaitingReceipt1788100000000 implements MigrationInterface {
  name = 'AddOrderAwaitingReceipt1788100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'awaiting_receipt_at',
        type: 'datetime',
        isNullable: true,
      }),
    );
    await queryRunner.query(
      'UPDATE `orders` SET `awaiting_receipt_at` = `updated_at` WHERE `status` = 4 AND `awaiting_receipt_at` IS NULL',
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_status_paid_at',
        columnNames: ['status', 'paid_at'],
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_status_awaiting_receipt_at',
        columnNames: ['status', 'awaiting_receipt_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'orders',
      'IDX_orders_status_awaiting_receipt_at',
    );
    await queryRunner.dropIndex('orders', 'IDX_orders_status_paid_at');
    await queryRunner.dropColumn('orders', 'awaiting_receipt_at');
  }
}
