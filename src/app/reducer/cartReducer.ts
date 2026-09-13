// reducer/cartReducer.ts
export interface CartItem {
  _id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  variant?: string;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  total: number;
  loading: boolean;
  error: string | null;
}

export const initialCartState: CartState = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  shippingCost: 0,
  total: 0,
  loading: false,
  error: null,
};

export type CartAction =
  | { type: "SET_CART"; payload: any }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SET_CART": {
      const cart = action.payload;
      const items = (cart?.items || []).map((item: any) => ({
        _id: item._id.toString(),
        productId:
          item.productId?._id?.toString() || item.productId?.toString() || "",
        name: item.productId?.name || item.name || "",
        image: item.productId?.images?.[0] || item.image || "",
        price: item.price,
        quantity: item.quantity,
        variant: item.variant,
      }));
      return {
        ...state,
        items,
        subtotal: cart?.subtotal || 0,
        tax: cart?.tax || 0,
        discount: cart?.discount || 0,
        shippingCost: cart?.shippingCost || 0,
        total: cart?.total || 0,
        loading: false,
        error: null,
      };
    }
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}
