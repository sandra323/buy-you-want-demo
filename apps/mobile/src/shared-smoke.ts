/**
 * Smoke import for @lightbuy/shared (Tasks 1.2 / 1.4).
 */
import {
  ApiResponse,
  ErrorCode,
  ProductSort,
  type User,
} from '@lightbuy/shared';

export const sharedSmoke: {
  ok: ErrorCode;
  sort: ProductSort;
  sample: ApiResponse<User>;
} = {
  ok: ErrorCode.OK,
  sort: ProductSort.Comprehensive,
  sample: {
    code: ErrorCode.OK,
    message: 'ok',
    data: {
      id: '00000000-0000-0000-0000-000000000000',
      phoneMask: '138****0000',
      nickname: '',
      avatar: '',
    },
  },
};
