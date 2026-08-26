import type { PaginationQuery } from './pagination';
import type { ProductSort } from './product-sort';

/** Product card on home / search lists. */
export interface ProductCard {
  id: string;
  name: string;
  price: number;
  originalPrice: number | null;
  mainImage: string;
  sales: number;
  stock: number;
  /** Present when keyword search missed and server substituted recommendations. */
  isFallback?: boolean;
}

/** Product detail: card fields + gallery, description, status. */
export interface ProductDetail extends ProductCard {
  images: string[];
  description: string;
  /** 1 = on sale, 0 = off shelf. */
  status: 0 | 1;
}

export interface CatalogListQuery extends PaginationQuery {
  sort?: ProductSort;
  keyword?: string;
}
