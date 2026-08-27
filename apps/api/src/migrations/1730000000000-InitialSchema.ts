import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';
import type { TableColumnOptions } from 'typeorm';

function uuidPk(): TableColumnOptions {
  return {
    name: 'id',
    type: 'char',
    length: '36',
    isPrimary: true,
  };
}

function timestamps(): TableColumnOptions[] {
  return [
    {
      name: 'created_at',
      type: 'datetime',
      default: 'CURRENT_TIMESTAMP',
    },
    {
      name: 'updated_at',
      type: 'datetime',
      default: 'CURRENT_TIMESTAMP',
      onUpdate: 'CURRENT_TIMESTAMP',
    },
  ];
}

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'phone',
            type: 'varchar',
            length: '11',
            isUnique: true,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            length: '72',
          },
          {
            name: 'nickname',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'avatar',
            type: 'varchar',
            length: '512',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'tinyint',
            default: 1,
          },
          ...timestamps(),
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'products',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'name',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'original_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'main_image',
            type: 'varchar',
            length: '512',
          },
          {
            name: 'images',
            type: 'json',
          },
          {
            name: 'stock',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'sales',
            type: 'int',
            unsigned: true,
            default: 0,
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'status',
            type: 'tinyint',
          },
          ...timestamps(),
        ],
        indices: [
          {
            name: 'IDX_products_status_sales',
            columnNames: ['status', 'sales'],
          },
          {
            name: 'IDX_products_status_created_at',
            columnNames: ['status', 'created_at'],
          },
          {
            name: 'IDX_products_status_price',
            columnNames: ['status', 'price'],
          },
        ],
      }),
    );

    // TypeORM has no prefix-length option; MySQL prefix 32 for LIKE on name.
    await queryRunner.query(
      'CREATE INDEX `IDX_products_name` ON `products` (`name`(32))',
    );

    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'user_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'token_hash',
            type: 'char',
            length: '64',
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'datetime',
          },
          {
            name: 'revoked',
            type: 'tinyint',
            width: 1,
            default: 0,
          },
          {
            name: 'revoked_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'replaced_by',
            type: 'char',
            length: '36',
            isNullable: true,
          },
          ...timestamps(),
        ],
        indices: [
          {
            name: 'IDX_refresh_tokens_user_id_revoked',
            columnNames: ['user_id', 'revoked'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_refresh_tokens_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'user_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'product_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'quantity',
            type: 'int',
            unsigned: true,
          },
          {
            name: 'selected',
            type: 'tinyint',
            width: 1,
            default: 1,
          },
          ...timestamps(),
        ],
        uniques: [
          {
            name: 'UQ_cart_items_user_id_product_id',
            columnNames: ['user_id', 'product_id'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_cart_items_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
          {
            name: 'FK_cart_items_product_id',
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'addresses',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'user_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'receiver_name',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '11',
          },
          {
            name: 'province',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'city',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'district',
            type: 'varchar',
            length: '32',
          },
          {
            name: 'detail',
            type: 'varchar',
            length: '128',
          },
          {
            name: 'is_default',
            type: 'tinyint',
            width: 1,
          },
          ...timestamps(),
        ],
        foreignKeys: [
          {
            name: 'FK_addresses_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'orders',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'order_no',
            type: 'varchar',
            length: '32',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'status',
            type: 'tinyint',
          },
          {
            name: 'receiver_snapshot',
            type: 'json',
          },
          {
            name: 'paid_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'cancelled_at',
            type: 'datetime',
            isNullable: true,
          },
          ...timestamps(),
        ],
        indices: [
          {
            name: 'IDX_orders_user_id_status_created_at',
            columnNames: ['user_id', 'status', 'created_at'],
          },
        ],
        foreignKeys: [
          {
            name: 'FK_orders_user_id',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        engine: 'InnoDB',
        columns: [
          uuidPk(),
          {
            name: 'order_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'product_id',
            type: 'char',
            length: '36',
          },
          {
            name: 'product_name',
            type: 'varchar',
            length: '120',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'quantity',
            type: 'int',
          },
          {
            name: 'image',
            type: 'varchar',
            length: '512',
          },
          ...timestamps(),
        ],
        foreignKeys: [
          {
            name: 'FK_order_items_order_id',
            columnNames: ['order_id'],
            referencedTableName: 'orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_order_items_product_id',
            columnNames: ['product_id'],
            referencedTableName: 'products',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_items');
    await queryRunner.dropTable('orders');
    await queryRunner.dropTable('addresses');
    await queryRunner.dropTable('cart_items');
    await queryRunner.dropTable('refresh_tokens');
    await queryRunner.dropTable('products');
    await queryRunner.dropTable('users');
  }
}
