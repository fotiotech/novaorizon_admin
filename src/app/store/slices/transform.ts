import { createTransform } from "redux-persist";
import { ProductState } from "./productSlice";

export const variantTransform = createTransform<ProductState, ProductState>(
//   (inboundState, key) => {
//     if (key === "product") {
//       // Filter out removed variants before persisting
//       return {
//         ...inboundState,
//         variants: inboundState.variants.filter((variant) => variant !== null), // Example filter logic
//       };
//     }
//     return inboundState;
//   },
//   (outboundState, key) => outboundState, // Optionally, you can modify the state after reading it, but in this case we don't need it
//   { whitelist: ["product"] } // Apply the transform to the 'product' slice of state
);
