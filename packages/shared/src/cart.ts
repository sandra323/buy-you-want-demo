export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  selected: boolean;
  stock: number;
  invalid: boolean;
}

export interface CartData {
  items: CartItem[];
  selectedAmount: number;
}

export interface AddCartItemRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  selected?: boolean;
}
