import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateExpense, fetchExpenses, fetchDashboard } from "../slices/expenseSlice";
import { toast } from "react-toastify";
import { FaEdit, FaSpinner, FaTimes } from "react-icons/fa";
import { createPortal } from "react-dom";

const EditModal = ({ expense }) => {
  const [show, setShow] = useState(false);
  const [date, setDate] = useState(
    expense.date ? new Date(expense.date).toISOString().slice(0, 10) : ""
  );
  const [amount, setAmount] = useState(expense.amount);
  const [category, setCategory] = useState(expense.category || "");
  const [description, setDescription] = useState(expense.description || "");

  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.expense);

  const handleUpdate = async () => {
    try {
      await dispatch(updateExpense({
        id: expense._id,
        updatedData: { date, amount: parseFloat(amount), category, description },
      })).unwrap();
      
      // Refresh data dynamically
      await Promise.all([
        dispatch(fetchExpenses()),
        dispatch(fetchDashboard())
      ]);
      
      toast.success("Expense updated successfully!");
      setShow(false);
    } catch (error) {
      toast.error(error.message || "Failed to update expense");
    }
  };

  const handleClose = () => {
    setDate(expense.date ? new Date(expense.date).toISOString().slice(0, 10) : "");
    setAmount(expense.amount);
    setCategory(expense.category || "");
    setDescription(expense.description || "");
    setShow(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  const today = new Date().toISOString().split('T')[0];

  if (!show) {
    return (
      <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>
        <FaEdit />
      </button>
    );
  }

  const modalContent = (
    <div className="modal-overlay" onClick={handleClose} style={{ isolation: 'isolate' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Edit Expense</h3>
          <button 
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '0.5rem',
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--muted)'}
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={today}
            className="form-input"
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
            className="form-input"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="form-input"
            list="edit-categories"
          />
          <datalist id="edit-categories">
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
            className="form-textarea"
            rows="3"
          />
        </div>
        
        <div className="modal-actions">
          <button 
            className="btn btn-primary" 
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <>
                <FaSpinner className="spinner-icon" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </button>
          <button className="btn btn-ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditModal;