import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildTypeOrmOptions(true),
        autoLoadEntities: true,
        // Avoid double-registering the CLI entity glob once forFeature entities exist.
        entities: [],
      }),
    }),
  ],
})
export class DatabaseModule {}
