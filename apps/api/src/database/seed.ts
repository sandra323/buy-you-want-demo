import { compare, hash } from 'bcryptjs';
import type { DataSource, EntityManager } from 'typeorm';
import { PRODUCT_STATUS_ON_SALE, Product } from '../products/product.entity';
import {
  USER_STATUS_ACTIVE,
  USER_STATUS_BANNED,
  User,
} from '../users/user.entity';

/**
 * Demo catalog images use stable picsum.photos ids (`/id/{n}/…`).
 *
 * Fallback if picsum is blocked or an id 404s (empty waterfall):
 * 1. Swap `picsumUrl` to `https://placehold.co/400x400/png` (or per-product
 *    `https://picsum.photos/seed/lightbuy-{slug}/400/400`).
 * 2. Or host JPEGs under a CDN / later object storage and replace these URLs.
 * Do not use http:// or relative paths — catalog expects HTTPS.
 */
function picsumUrl(id: number, size = 400): string {
  return `https://picsum.photos/id/${id}/${size}/${size}`;
}

const SEED_PASSWORD = 'password123';
const BCRYPT_COST = 10;

/**
 * Stable fixture PKs. `upsertUser` looks up by `id` first (not phone), so these
 * constants always match the seeded rows on a normal DB. If phone is taken by
 * another id, seed fails loudly — use a fresh DB or fix the conflicting row.
 */
export const DEMO_USER_ID = 'c0ffee00-0000-4000-8000-00000000d000';
export const BANNED_USER_ID = 'c0ffee00-0000-4000-8000-00000000b000';

export const DEMO_USER_PHONE = '13800000000';
/** Auth e2e / guard fixture only — not the README demo login. */
export const BANNED_USER_PHONE = '13800000001';

interface ProductSeed {
  id: string;
  name: string;
  price: string;
  originalPrice: string | null;
  picsumId: number;
  extraPicsumId: number;
  stock: number;
  sales: number;
  description: string;
  createdAt: Date;
}

function productId(n: number): string {
  return `c0ffee00-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/**
 * ≥20 on-sale SKUs. Varied price / sales / created_at for sort tests.
 * Name with `%` is for catalog LIKE-escape tests.
 */
const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: productId(1),
    name: '100% 纯棉毛巾',
    price: '19.90',
    originalPrice: '29.90',
    picsumId: 10,
    extraPicsumId: 11,
    stock: 120,
    sales: 840,
    description: '柔软吸水，适合日常家用。名称含 % 供搜索转义测试。',
    createdAt: new Date('2024-01-05T02:00:00.000Z'),
  },
  {
    id: productId(2),
    name: '北欧风台灯',
    price: '89.00',
    originalPrice: '129.00',
    picsumId: 12,
    extraPicsumId: 13,
    stock: 40,
    sales: 210,
    description: '暖光护眼，书桌床头两用。',
    createdAt: new Date('2024-01-18T08:30:00.000Z'),
  },
  {
    id: productId(3),
    name: '无线蓝牙耳机',
    price: '159.00',
    originalPrice: '199.00',
    picsumId: 20,
    extraPicsumId: 21,
    stock: 80,
    sales: 1560,
    description: '入耳降噪，续航约 24 小时。',
    createdAt: new Date('2024-02-02T04:15:00.000Z'),
  },
  {
    id: productId(4),
    name: '不锈钢保温杯',
    price: '49.90',
    originalPrice: null,
    picsumId: 24,
    extraPicsumId: 25,
    stock: 200,
    sales: 320,
    description: '双层真空，保冷保温。',
    createdAt: new Date('2024-02-14T11:00:00.000Z'),
  },
  {
    id: productId(5),
    name: '极简双肩包',
    price: '129.00',
    originalPrice: '169.00',
    picsumId: 26,
    extraPicsumId: 28,
    stock: 55,
    sales: 95,
    description: '15 寸电脑仓，通勤旅行均可。',
    createdAt: new Date('2024-03-01T01:20:00.000Z'),
  },
  {
    id: productId(6),
    name: '香薰蜡烛三件套',
    price: '39.00',
    originalPrice: '59.00',
    picsumId: 29,
    extraPicsumId: 30,
    stock: 90,
    sales: 410,
    description: '低烟大豆蜡，三种气味。',
    createdAt: new Date('2024-03-12T09:45:00.000Z'),
  },
  {
    id: productId(7),
    name: '机械键盘青轴',
    price: '299.00',
    originalPrice: '359.00',
    picsumId: 33,
    extraPicsumId: 36,
    stock: 25,
    sales: 67,
    description: '热插拔轴体，RGB 灯效。',
    createdAt: new Date('2024-03-28T16:00:00.000Z'),
  },
  {
    id: productId(8),
    name: '亚麻沙发靠垫',
    price: '35.50',
    originalPrice: null,
    picsumId: 37,
    extraPicsumId: 39,
    stock: 150,
    sales: 22,
    description: '可拆洗外套，填充饱满。',
    createdAt: new Date('2024-04-06T03:10:00.000Z'),
  },
  {
    id: productId(9),
    name: '便携榨汁杯',
    price: '79.00',
    originalPrice: '99.00',
    picsumId: 40,
    extraPicsumId: 42,
    stock: 70,
    sales: 188,
    description: 'USB-C 充电，出门即榨。',
    createdAt: new Date('2024-04-20T07:25:00.000Z'),
  },
  {
    id: productId(10),
    name: '羊毛围巾',
    price: '88.00',
    originalPrice: '128.00',
    picsumId: 43,
    extraPicsumId: 48,
    stock: 60,
    sales: 54,
    description: '秋冬保暖，中性配色。',
    createdAt: new Date('2024-05-03T12:40:00.000Z'),
  },
  {
    id: productId(11),
    name: '硅胶厨具套装',
    price: '56.00',
    originalPrice: null,
    picsumId: 49,
    extraPicsumId: 50,
    stock: 110,
    sales: 8,
    description: '不伤锅，耐高温。',
    createdAt: new Date('2024-05-19T05:05:00.000Z'),
  },
  {
    id: productId(12),
    name: '桌面收纳盒',
    price: '22.80',
    originalPrice: '32.80',
    picsumId: 54,
    extraPicsumId: 55,
    stock: 300,
    sales: 990,
    description: '分层抽屉，文具杂物分类。',
    createdAt: new Date('2024-06-01T18:00:00.000Z'),
  },
  {
    id: productId(13),
    name: '运动速干T恤',
    price: '69.00',
    originalPrice: '89.00',
    picsumId: 57,
    extraPicsumId: 58,
    stock: 140,
    sales: 275,
    description: '轻薄透气，跑步健身。',
    createdAt: new Date('2024-06-15T10:10:00.000Z'),
  },
  {
    id: productId(14),
    name: '护颈记忆枕',
    price: '119.00',
    originalPrice: '159.00',
    picsumId: 60,
    extraPicsumId: 64,
    stock: 45,
    sales: 133,
    description: '慢回弹，可水洗外套。',
    createdAt: new Date('2024-07-02T14:50:00.000Z'),
  },
  {
    id: productId(15),
    name: '迷你加湿器',
    price: '45.00',
    originalPrice: null,
    picsumId: 65,
    extraPicsumId: 66,
    stock: 95,
    sales: 41,
    description: '静音夜灯，办公室桌面款。',
    createdAt: new Date('2024-07-18T06:30:00.000Z'),
  },
  {
    id: productId(16),
    name: '不锈钢炒锅 32cm',
    price: '189.00',
    originalPrice: '249.00',
    picsumId: 67,
    extraPicsumId: 70,
    stock: 30,
    sales: 19,
    description: '三层钢，电磁炉燃气通用。',
    createdAt: new Date('2024-08-04T09:00:00.000Z'),
  },
  {
    id: productId(17),
    name: '儿童益智积木',
    price: '99.90',
    originalPrice: '139.90',
    picsumId: 74,
    extraPicsumId: 76,
    stock: 85,
    sales: 610,
    description: '大颗粒，适合 3 岁以上。',
    createdAt: new Date('2024-08-22T13:15:00.000Z'),
  },
  {
    id: productId(18),
    name: '真皮卡包',
    price: '59.00',
    originalPrice: null,
    picsumId: 77,
    extraPicsumId: 82,
    stock: 75,
    sales: 3,
    description: '超薄多卡槽，RFID 挡片。',
    createdAt: new Date('2024-09-08T20:20:00.000Z'),
  },
  {
    id: productId(19),
    name: '瑜伽垫 8mm',
    price: '72.00',
    originalPrice: '92.00',
    picsumId: 83,
    extraPicsumId: 84,
    stock: 65,
    sales: 147,
    description: '防滑 TPE，附收纳绑带。',
    createdAt: new Date('2024-09-25T01:40:00.000Z'),
  },
  {
    id: productId(20),
    name: '玻璃保鲜盒五件套',
    price: '64.50',
    originalPrice: '84.50',
    picsumId: 88,
    extraPicsumId: 91,
    stock: 100,
    sales: 0,
    description: '可进微波炉，密封防漏。',
    createdAt: new Date('2024-10-11T15:55:00.000Z'),
  },
  {
    id: productId(21),
    name: '便携折叠伞',
    price: '28.00',
    originalPrice: '38.00',
    picsumId: 96,
    extraPicsumId: 101,
    stock: 180,
    sales: 520,
    description: '一键开合，抗风骨架。',
    createdAt: new Date('2024-11-02T08:05:00.000Z'),
  },
  {
    id: productId(22),
    name: '陶瓷马克杯',
    price: '16.80',
    originalPrice: null,
    picsumId: 102,
    extraPicsumId: 106,
    stock: 250,
    sales: 1200,
    description: '大容量把手杯，哑光釉面。',
    createdAt: new Date('2024-12-16T17:35:00.000Z'),
  },
];

async function upsertUser(
  manager: EntityManager,
  row: {
    id: string;
    phone: string;
    passwordHash: string;
    nickname: string;
    status: number;
  },
): Promise<void> {
  const repo = manager.getRepository(User);
  const existing = await repo.findOne({ where: { id: row.id } });

  if (!existing) {
    const phoneTaken = await repo.findOne({ where: { phone: row.phone } });
    if (phoneTaken) {
      throw new Error(
        `[seed] Fixture conflict: phone ${row.phone} is bound to id ${phoneTaken.id}, expected ${row.id}. Use a fresh DB or fix the row manually.`,
      );
    }

    await repo.save(
      repo.create({
        id: row.id,
        phone: row.phone,
        passwordHash: row.passwordHash,
        nickname: row.nickname,
        avatar: null,
        status: row.status,
      }),
    );
    return;
  }

  let dirty = false;
  if (existing.phone !== row.phone) {
    existing.phone = row.phone;
    dirty = true;
  }
  if (existing.nickname !== row.nickname) {
    existing.nickname = row.nickname;
    dirty = true;
  }
  if (existing.status !== row.status) {
    existing.status = row.status;
    dirty = true;
  }

  const passwordMatches = await compare(SEED_PASSWORD, existing.passwordHash);
  if (!passwordMatches) {
    existing.passwordHash = row.passwordHash;
    dirty = true;
  }

  if (dirty) {
    await repo.save(existing);
  }
}

async function upsertProduct(
  manager: EntityManager,
  seed: ProductSeed,
): Promise<void> {
  const repo = manager.getRepository(Product);
  const mainImage = picsumUrl(seed.picsumId);
  const extraImage = picsumUrl(seed.extraPicsumId, 600);
  const images = [mainImage, extraImage];

  const existing = await repo.findOne({ where: { id: seed.id } });
  const fields = {
    name: seed.name,
    price: seed.price,
    originalPrice: seed.originalPrice,
    mainImage,
    images,
    stock: seed.stock,
    sales: seed.sales,
    description: seed.description,
    status: PRODUCT_STATUS_ON_SALE,
  };

  if (existing) {
    Object.assign(existing, fields);
    await repo.save(existing);
    return;
  }

  await repo.save(
    repo.create({
      id: seed.id,
      ...fields,
      createdAt: seed.createdAt,
      updatedAt: seed.createdAt,
    }),
  );
}

export async function runSeed(dataSource: DataSource): Promise<void> {
  const passwordHash = await hash(SEED_PASSWORD, BCRYPT_COST);

  await dataSource.transaction(async (manager) => {
    await upsertUser(manager, {
      id: DEMO_USER_ID,
      phone: DEMO_USER_PHONE,
      passwordHash,
      nickname: '用户0000',
      status: USER_STATUS_ACTIVE,
    });

    await upsertUser(manager, {
      id: BANNED_USER_ID,
      phone: BANNED_USER_PHONE,
      passwordHash,
      nickname: '用户0001',
      status: USER_STATUS_BANNED,
    });

    for (const product of PRODUCT_SEEDS) {
      await upsertProduct(manager, product);
    }
  });
}
