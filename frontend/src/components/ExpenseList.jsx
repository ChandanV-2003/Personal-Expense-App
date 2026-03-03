import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteExpense } from "../slices/expenseSlice";
import { toast } from "react-toastify";
import EditModal from "./EditModal";
import ConfirmDialog from "./ConfirmDialog";
import { FaTrash } from "react-icons/fa";

const ExpenseList = () => {
  const { expenses, loading } = useSelector((state) => state.expense);
  const dispatch = useDispatch();
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, expense: null });

  if (loading) {
    return (
      <div className="centered" style={{ padding: 'var(--space-lg)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!expenses || expenses.length === 0) {
    return null;
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleDeleteClick = (expense) => {
    setDeleteConfirm({ isOpen: true, expense });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm.expense) {
      dispatch(deleteExpense(deleteConfirm.expense._id))
        .unwrap()
        .then(() => {
          toast.success("Expense deleted successfully");
        })
        .catch((error) => {
          toast.error(error.message || "Failed to delete expense");
        });
    }
    setDeleteConfirm({ isOpen: false, expense: null });
  };

  const handleCancelDelete = () => {
    setDeleteConfirm({ isOpen: false, expense: null });
  };

  return (
    <>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Description</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp._id}>
                <td>{formatDate(exp.date || exp.createdAt)}</td>
                <td>
                  <span className="badge">{exp.category || 'Uncategorized'}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{formatAmount(exp.amount)}</td>
                <td className="text-muted">{exp.description || '-'}</td>
                <td>
                  <div className="flex justify-center gap-sm">
                    <EditModal expense={exp} />
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteClick(exp)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Expense"
        message={deleteConfirm.expense 
          ? `Are you sure you want to delete the expense "${deleteConfirm.expense.category || 'Uncategorized'}" for ${formatAmount(deleteConfirm.expense.amount)}? This action cannot be undone.`
          : "Are you sure you want to delete this expense?"
        }
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};

export default ExpenseList;