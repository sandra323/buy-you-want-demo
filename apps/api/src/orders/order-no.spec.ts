import { generateOrderNo } from './order-no';

describe('generateOrderNo', () => {
  it('uses LB + UTC timestamp + 6 digits', () => {
    const no = generateOrderNo(new Date('2026-01-02T03:04:05.000Z'));
    expect(no).toMatch(/^LB20260102030405\d{6}$/);
  });
});
