import type { CartData, CartItem as CartItemDto } from '@lightbuy/shared';
import { fromCents, toCents } from '../http/money';
import { PRODUCT_STATUS_ON_SALE, Product } from '../products/product.entity';
import { CartItem } from './cart-item.entity';

export function isCartLineInvalid(product: Product | undefined): boolean {
  if (!product) {
    return true;
  }
  return product.status !== PRODUCT_STATUS_ON_SALE || product.stock === 0;
}

export function toCartLine(row: CartItem): CartItemDto {
  const product = row.product;
  const invalid = isCartLineInvalid(product);
  return {
    id: row.id,
    productId: row.productId,
    name: product?.name ?? '',
    image: product?.mainImage ?? '',
    price: product ? Number(product.price) : 0,
    quantity: row.quantity,
    selected: row.selected,
    stock: product?.stock ?? 0,
    invalid,
  };
}

export function toCartData(rows: CartItem[]): CartData {
  const items = rows.map(toCartLine);
  let selectedCents = 0;
  for (const item of items) {
    if (item.selected && !item.invalid) {
      selectedCents += toCents(item.price) * item.quantity;
    }
  }
  return {
    items,
    selectedAmount: fromCents(selectedCents),
  };
}
