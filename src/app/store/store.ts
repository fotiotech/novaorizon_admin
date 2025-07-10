import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";
import userReducer from "./slices/userSlice";
import productReducer from "./slices/productSlice";
import categoryReducer from "./slices/categorySlice";
import offerReducer from "./slices/offerSlice";
import orderReducer from "./slices/orderSlice";
import attributeReducer from "./slices/attributeSlice";
import attributeGroupReducer from "./slices/attributeGroupSlice";
import shippingReducer from "./slices/shippingSlice";

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["category", "product"], // Only persist category and product states
};

const rootReducer = combineReducers({
  user: userReducer,
  category: categoryReducer,
  product: productReducer,
  offer: offerReducer,
  order: orderReducer,
  shipping: shippingReducer,
  attribute: attributeReducer,
  attributeGroup: attributeGroupReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Disable serializable check for redux-persist
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
