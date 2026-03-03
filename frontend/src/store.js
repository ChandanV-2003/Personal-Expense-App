import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "redux";

import authReducer from "../src/slices/authSlice";
import expenseReducer from "../src/slices/expenseSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  expense: expenseReducer,
});

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth"], // only auth will persist
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);