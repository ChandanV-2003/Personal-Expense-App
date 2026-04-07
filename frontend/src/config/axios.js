import axios from "axios";
import { store } from "../store";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://personal-expense-app-backend.onrender.com/api",
});

axiosInstance.interceptors.request.use((config) => {
  const token = store.getState().auth.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;