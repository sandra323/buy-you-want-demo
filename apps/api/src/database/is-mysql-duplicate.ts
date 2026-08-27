import { QueryFailedError } from 'typeorm';

/** 唯一索引冲突（errno 1062）。并发注册同一手机号时映射成 40202。 */
export function isMysqlDuplicateError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const driver = error.driverError as { code?: string; errno?: number };
  return driver?.code === 'ER_DUP_ENTRY' || driver?.errno === 1062;
}
