import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../config/axios";

export const fetchExpenses = createAsyncThunk(
  "expense/fetchExpenses",
  async (params = {}) => {
    const { page = 1, search = "", category = "" } = params;

    const { data } = await axiosInstance.get(
      `/expenses?page=${page}&search=${search}&category=${category}`
    );

    return data;
  }
);

export const createExpense = createAsyncThunk(
  "expense/createExpense",
  async (expense) => {
    const { data } = await axiosInstance.post("/expenses", expense);
    return data;
  }
);

export const deleteExpense = createAsyncThunk(
  "expense/deleteExpense",
  async (id) => {
    await axiosInstance.delete(`/expenses/${id}`);
    return id;
  }
);

export const updateExpense = createAsyncThunk(
  "expense/updateExpense",
  async ({ id, updatedData }) => {
    const { data } = await axiosInstance.put(
      `/expenses/${id}`,
      updatedData
    );
    return data;
  }
);

// fetch dashboard summary (limit, spent, remaining etc)
export const fetchDashboard = createAsyncThunk(
  "expense/fetchDashboard",
  async () => {
    const { data } = await axiosInstance.get("/dashboard");
    return data;
  }
);

// update monthly limit through user endpoint
export const updateMonthlyLimit = createAsyncThunk(
  "expense/updateMonthlyLimit",
  async (limit) => {
    const { data } = await axiosInstance.put("/users/monthly-limit", {
      monthlyLimit: limit,
    });
    return data;
  }
);

const expenseSlice = createSlice({
  name: "expense",
  initialState: {
    expenses: [],
    loading: false,
    error: null,
    // dashboard info
    monthlyLimit: 0,
    totalSpent: 0,
    remaining: 0,
    percentageUsed: 0,
  },
  extraReducers: (builder) => {
    builder
      // Fetch expenses
      .addCase(fetchExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenses.fulfilled, (state, action) => {
        state.loading = false;
        // handle payload which might be an array or object
        if (Array.isArray(action.payload)) {
          state.expenses = action.payload;
        } else {
          state.expenses = action.payload.expenses || [];
        }
        state.error = null;
      })
      .addCase(fetchExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch expenses";
        state.expenses = [];
      })
      // Create expense
      .addCase(createExpense.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(createExpense.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create expense";
      })
      // Delete expense
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter(
          (exp) => exp._id !== action.payload
        );
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.error = action.error.message || "Failed to delete expense";
      })
      // Update expense
      .addCase(updateExpense.fulfilled, (state, action) => {
        const index = state.expenses.findIndex(
          (exp) => exp._id === action.payload._id
        );
        if (index !== -1) {
          state.expenses[index] = action.payload;
        }
      })
      .addCase(updateExpense.rejected, (state, action) => {
        state.error = action.error.message || "Failed to update expense";
      })
      // Dashboard
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.monthlyLimit = action.payload.monthlyLimit;
        state.totalSpent = action.payload.totalSpent;
        state.remaining = action.payload.remaining;
        state.percentageUsed = action.payload.percentageUsed;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.error = action.error.message || "Failed to fetch dashboard info";
      })
      // Monthly limit update
      .addCase(updateMonthlyLimit.fulfilled, (state, action) => {
        state.monthlyLimit = action.payload.monthlyLimit;
      })
      .addCase(updateMonthlyLimit.rejected, (state, action) => {
        state.error = action.error.message || "Failed to update monthly limit";
      });
  },
});

export default expenseSlice.reducer;