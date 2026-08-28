import { toOrderDto } from './map-order';
import { OrderItem } from './order-item.entity';
import { ORDER_STATUS_PENDING_PAY, Order } from './order.entity';

describe('map-order', () => {
  it('exposes numeric money and ISO createdAt', () => {
    const dto = toOrderDto(
      {
        id: 'o1',
        orderNo: 'LB1',
        status: ORDER_STATUS_PENDING_PAY,
        totalAmount: '39.80',
        receiverSnapshot: {
          receiverName: '甲',
          phone: '13800000000',
          province: '沪',
          city: '沪',
          district: '浦东',
          detail: '1 号',
        },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      } as Order,
      [
        {
          productId: 'p1',
          productName: '毛巾',
          price: '19.90',
          quantity: 2,
          image: 'https://example.com/a.jpg',
        } as OrderItem,
      ],
    );

    expect(dto.totalAmount).toBe(39.8);
    expect(dto.items[0].price).toBe(19.9);
    expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(dto.status).toBe(0);
  });
});
