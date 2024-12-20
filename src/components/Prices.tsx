import { CartItem } from "@/app/reducer/cartReducer";

export function Prices({ amount }: { amount: number }) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "CFA",
  }).format(amount);
}

export const TotalPrice = ({
  cart,
  shippingPrice,
}: {
  cart: CartItem[];
  shippingPrice: number;
}) => {
  const amount = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  return <Prices amount={amount + shippingPrice} />;
};
