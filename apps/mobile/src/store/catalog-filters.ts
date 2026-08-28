import { create } from 'zustand';
import { ProductSort } from '@lightbuy/shared';

type CatalogFiltersState = {
  sort: ProductSort;
  keyword: string;
  setSort: (sort: ProductSort) => void;
  setKeyword: (keyword: string) => void;
  resetKeyword: () => void;
};

export const useCatalogFiltersStore = create<CatalogFiltersState>((set) => ({
  sort: ProductSort.Comprehensive,
  keyword: '',
  setSort: (sort) => set({ sort }),
  setKeyword: (keyword) => set({ keyword }),
  resetKeyword: () => set({ keyword: '' }),
}));
