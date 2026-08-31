import { emptyOrderCopy, orderStatusLabel } from './order-status';

describe('order status copy', () => {
  it('maps all server states without assuming paid means completed', () => {
    expect(orderStatusLabel(0)).toBe('待支付');
    expect(orderStatusLabel(1)).toBe('待发货');
    expect(orderStatusLabel(4)).toBe('待收货');
    expect(orderStatusLabel(2)).toBe('已完成');
    expect(orderStatusLabel(3)).toBe('已取消');
  });

  it('uses per-tab empty copy', () => {
    expect(emptyOrderCopy('all')).toBe('还没有订单');
    expect(emptyOrderCopy(1)).toBe('暂无待发货订单');
    expect(emptyOrderCopy(4)).toBe('暂无待收货订单');
  });
});
