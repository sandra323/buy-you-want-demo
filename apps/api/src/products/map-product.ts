import type { ProductCard, ProductDetail } from '@lightbuy/shared';
import { Product } from './product.entity';

function money(value: string | null): number | null {
  if (value == null) {
    return null;
  }
  return Number(value);
}

export function toProductCard(
  product: Product,
  options?: { isFallback?: boolean },
): ProductCard {
  const card: ProductCard = {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    originalPrice: money(product.originalPrice),
    mainImage: product.mainImage,
    sales: product.sales,
    stock: product.stock,
  };
  if (options?.isFallback) {
    card.isFallback = true;
  }
  return card;
}

export function toProductDetail(product: Product): ProductDetail {
  return {
    ...toProductCard(product),
    images: product.images,
    description: product.description,
    status: product.status === 1 ? 1 : 0,
  };
}
