import { ErrorCode, type ApiResponse } from '@lightbuy/shared';

import { ApiError } from './errors';

export function unwrapData<T>(envelope: ApiResponse<T>): T {
  if (envelope.code !== ErrorCode.OK || envelope.data == null) {
    throw new ApiError(envelope.code, envelope.message);
  }
  return envelope.data;
}
