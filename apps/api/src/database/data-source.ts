import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

/** TypeORM CLI entry (`migration:run`, `migration:generate`). */
export default new DataSource(buildTypeOrmOptions());
