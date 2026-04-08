import axios from "axios";
import { store } from "../store";

const normalizedApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const fallbackApiUrl = import.meta.env.DEV
  ? "http://localhost:5000/api"
  : "https://personal-expense-app-backend.onrender.com/api";

const axiosInstance = axios.create({
  baseURL: normalizedApiUrl || fallbackApiUrl,
});

axiosInstance.interceptors.request.use((config) => {
  const token = store.getState().auth.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default axiosInstance;