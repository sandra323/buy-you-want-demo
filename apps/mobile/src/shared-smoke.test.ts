import { ErrorCode, ProductSort } from '@lightbuy/shared';

import { sharedSmoke } from './shared-smoke';

describe('shared workspace import', () => {
  it('compiles and resolves @lightbuy/shared', () => {
    expect(sharedSmoke.ok).toBe(ErrorCode.OK);
    expect(sharedSmoke.sort).toBe(ProductSort.Comprehensive);
    expect(sharedSmoke.sample.code).toBe(ErrorCode.OK);
  });
});
