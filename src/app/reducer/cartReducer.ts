// context/cartReducer.ts

export interface CartItem {
    productId?: string;
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    quantity: number;
  }
  
  interface CartState {
    items: CartItem[];
  }
  
  export type CartAction =
    | { type: 'ADD_ITEM'; payload: CartItem }
    | { type: 'REMOVE_ITEM'; payload: string }
    | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
    | { type: 'CLEAR_CART' };
  
  export const cartReducer = (state: CartState, action: CartAction): CartState => {
    switch (action.type) {
      case 'ADD_ITEM': {
        const itemExists = state.items.find(item => item.id === action.payload.id);
  
        if (itemExists) {
          return {
            ...state,
            items: state.items.map(item =>
              item.id === action.payload.id
                ? { ...item, quantity: item.quantity + action.payload.quantity }
                : item
            ),
          };
        }
        return { ...state, items: [...state.items, action.payload] };
      }
      case 'REMOVE_ITEM':
        return { ...state, items: state.items.filter(item => item.id !== action.payload) };
  
      case 'UPDATE_QUANTITY':
        return {
          ...state,
          items: state.items.map(item =>
            item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item
          ),
        };
  
      case 'CLEAR_CART':
        return { ...state, items: [] };
  
      default:
        return state;
    }
  };
  