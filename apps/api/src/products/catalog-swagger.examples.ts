const CARD_EXAMPLE = {
  id: 'c0ffee00-0000-4000-8000-000000000001',
  name: '100% 纯棉毛巾',
  price: 19.9,
  originalPrice: 29.9,
  mainImage: 'https://picsum.photos/id/10/400/400',
  sales: 840,
  stock: 120,
};

export const CATALOG_LIST_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    items: [CARD_EXAMPLE],
    page: 1,
    pageSize: 10,
    total: 22,
  },
};

export const CATALOG_FALLBACK_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    items: [{ ...CARD_EXAMPLE, isFallback: true }],
    page: 1,
    pageSize: 10,
    total: 22,
    isFallback: true,
  },
};

export const CATALOG_DETAIL_EXAMPLE = {
  code: 0,
  message: 'ok',
  data: {
    ...CARD_EXAMPLE,
    images: [
      'https://picsum.photos/id/10/400/400',
      'https://picsum.photos/id/11/600/600',
    ],
    description: '柔软吸水，适合日常家用。名称含 % 供搜索转义测试。',
    status: 1,
  },
};

export const CATALOG_NOT_FOUND_EXAMPLE = {
  code: 40401,
  message: '资源不存在',
  data: null,
};
