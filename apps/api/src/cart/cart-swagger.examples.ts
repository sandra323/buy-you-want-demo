const CART_ITEM_EXAMPLE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  productId: 'c0ffee00-0000-4000-8000-000000000001',
  name: '100% 纯棉毛巾',
  image: 'https://picsum.photos/id/10/400/400',
  price: 19.9,
  quantity: 2,
  selected: true,
  stock: 120,
  invalid: false,
};

export const CART_OK_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    items: [CART_ITEM_EXAMPLE],
    selectedAmount: 39.8,
  },
};

export const CART_UNAUTHORIZED_EXAMPLE = {
  code: 40110,
  message: '未登录',
  data: null,
};

export const CART_NOT_FOUND_EXAMPLE = {
  code: 40401,
  message: '资源不存在',
  data: null,
};

export const CART_STOCK_EXAMPLE = {
  code: 40901,
  message: '库存不足',
  data: null,
};
