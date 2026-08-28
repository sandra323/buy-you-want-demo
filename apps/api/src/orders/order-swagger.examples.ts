const ITEM_EXAMPLE = {
  productId: 'c0ffee00-0000-4000-8000-000000000001',
  productName: '100% 纯棉毛巾',
  price: 19.9,
  quantity: 2,
  image: 'https://picsum.photos/id/10/400/400',
};

const ORDER_EXAMPLE = {
  id: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  orderNo: 'LB20260101120000123456',
  status: 0,
  totalAmount: 39.8,
  items: [ITEM_EXAMPLE],
  receiverSnapshot: {
    receiverName: '张三',
    phone: '13800000000',
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    detail: '示例路 1 号',
  },
  createdAt: '2026-01-01T12:00:00.000Z',
};

export const ORDER_DETAIL_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: ORDER_EXAMPLE,
};

export const ORDER_LIST_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    items: [ORDER_EXAMPLE],
    page: 1,
    pageSize: 10,
    total: 1,
  },
};

export const ORDER_UNAUTHORIZED_EXAMPLE = {
  code: 40110,
  message: '未登录',
  data: null,
};

export const ORDER_NOT_FOUND_EXAMPLE = {
  code: 40401,
  message: '资源不存在',
  data: null,
};

export const ORDER_CONFLICT_STOCK_EXAMPLE = {
  code: 40901,
  message: '库存不足',
  data: null,
};

export const ORDER_CONFLICT_STATE_EXAMPLE = {
  code: 40902,
  message: '当前状态不允许该操作',
  data: null,
};
