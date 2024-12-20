import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { configureStore } from "@reduxjs/toolkit";
import productReducer from "./slices/productSlice";
import { variantTransform } from "./slices/transform";

const persistConfig = {
  key: "root",
  storage, // You can use localStorage, sessionStorage, or another storage type
  // transforms: [variantTransform], // Add the transform to the persist config
  // whitelist: ["product"], // Ensure only the 'product' slice is persisted
};

const persistedReducer = persistReducer(persistConfig, productReducer);

export const store = configureStore({
  reducer: { product: productReducer },
});

// export const persistor = persistStore(store);
// TypeScript types for store
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
