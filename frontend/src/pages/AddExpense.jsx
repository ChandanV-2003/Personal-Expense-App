import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createExpense, fetchDashboard, fetchExpenses } from "../slices/expenseSlice";
import { toast } from "react-toastify";
import { FaPlus, FaSpinner } from "react-icons/fa";

const AddExpense = () => {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.expense);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date || !amount) {
      toast.error("Date and amount are required");
      return;
    }

    const expenseData = {
      date,
      amount: parseFloat(amount),
      category: category || "Uncategorized",
      description: description || "",
    };

    try {
      await dispatch(createExpense(expenseData)).unwrap();
      
      // Refresh data dynamically
      await Promise.all([
        dispatch(fetchDashboard()),
        dispatch(fetchExpenses())
      ]);
      
      toast.success("Expense added successfully!");
      
      // Reset form
      setDate("");
      setAmount("");
      setCategory("");
      setDescription("");
    } catch (error) {
      toast.error(error.message || "Failed to add expense");
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="grid grid-2">
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="form-input"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="form-input"
            required
          />
        </div>
      </div>
      
      <div className="form-group">
        <label className="form-label">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g., Food, Transport, Shopping"
          className="form-input"
          list="categories"
        />
        <datalist id="categories">
          <option value="Food" />
          <option value="Transport" />
          <option value="Shopping" />
          <option value="Entertainment" />
          <option value="Bills" />
          <option value="Health" />
          <option value="Education" />
          <option value="Other" />
        </datalist>
      </div>
      
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details about this expense (optional)"
          className="form-textarea"
          rows="3"
        />
      </div>
      
      <button 
        type="submit" 
        className="btn btn-primary" 
        style={{ alignSelf: 'flex-start' }}
        disabled={loading}
      >
        {loading ? (
          <>
            <FaSpinner className="spinner-icon" />
            <span>Adding...</span>
          </>
        ) : (
          <>
            <FaPlus />
            <span>Add Expense</span>
          </>
        )}
      </button>
    </form>
  );
};

export default AddExpense;