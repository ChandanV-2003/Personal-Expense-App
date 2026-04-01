import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchExpenses, fetchDashboard, updateMonthlyLimit } from "../slices/expenseSlice";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import AddExpense from "./AddExpense";
import ExpenseList from "../components/ExpenseList";
import AdvancedCharts from "../components/AdvancedCharts";
import BillScan from "../components/BillScan";

// Sub-component for setting monthly limit with loading state
const SetLimitForm = ({ limitInput, setLimitInput, dispatch, updateMonthlyLimit, fetchDashboard }) => {
  const { loading } = useSelector((state) => state.expense);

  const handleSetLimit = async () => {
    const val = Number(limitInput);
    if (isNaN(val) || val < 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      await dispatch(updateMonthlyLimit(val)).unwrap();
      await dispatch(fetchDashboard());
      toast.success("Monthly limit updated successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to update limit");
    }
  };

  return (
    <div className="flex gap-md items-center">
      <input
        type="number"
        min="0"
        value={limitInput}
        onChange={(e) => setLimitInput(e.target.value)}
        placeholder="Enter amount"
        className="form-input"
        style={{ maxWidth: '200px' }}
        disabled={loading}
      />
      <button
        type="button"
        onClick={handleSetLimit}
        className="btn btn-accent"
        disabled={loading}
      >
        {loading ? (
          <>
            <FaSpinner className="spinner-icon" />
            <span>Updating...</span>
          </>
        ) : (
          <span>Set Limit</span>
        )}
      </button>
    </div>
  );
};

const Dashboard = () => {
  const dispatch = useDispatch();
  const { loading, error, expenses, monthlyLimit, totalSpent, remaining } = useSelector((state) => state.expense);

  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [categoryTerm, setCategoryTerm] = useState("");
  const [category, setCategory] = useState("");
  const [limitInput, setLimitInput] = useState(monthlyLimit);

  useEffect(() => {
    setLimitInput(monthlyLimit);
  }, [monthlyLimit]);

  useEffect(() => {
    dispatch(fetchExpenses({ search, category }));
  }, [dispatch, search, category]);

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchTerm), 300);
    return () => clearTimeout(id);
  }, [searchTerm]);

  useEffect(() => {
    const id = setTimeout(() => setCategory(categoryTerm), 300);
    return () => clearTimeout(id);
  }, [categoryTerm]);

  // No need for setPage(1) anymore as pagination is removed

  // fetchDashboard is called on mount, and child components handle re-fetching after actions

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <Navbar />
      <main className="main">
        <div className="container">
          {/* Summary Cards */}
          <section className="section">
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-value">{formatCurrency(monthlyLimit)}</div>
                <div className="summary-label">Monthly Limit</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{formatCurrency(totalSpent)}</div>
                <div className="summary-label">Total Used</div>
              </div>
              <div className="summary-card">
                <div className="summary-value">{formatCurrency(remaining)}</div>
                <div className="summary-label">Remaining</div>
              </div>
            </div>
          </section>

          {/* Error Display */}
          {error && (
            <Card className="mb-md">
              <p style={{ color: 'var(--danger)', margin: 0 }}>
                {typeof error === 'string' ? error : 'An error occurred'}
              </p>
            </Card>
          )}

          {/* Loading State */}
          {loading && (
            <div className="centered" style={{ padding: 'var(--space-xl)' }}>
              <div className="spinner"></div>
              <p className="text-muted">Loading expenses...</p>
            </div>
          )}

          {/* Main Content */}
          {!loading && (
            <>
              {/* Filters */}
              <Card>
                <div className="grid grid-2">
                  <input
                    type="text"
                    placeholder="Search expenses..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                  />
                  <select
                    value={categoryTerm}
                    onChange={(e) => setCategoryTerm(e.target.value)}
                    className="form-input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">All Categories</option>
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Housing">Housing</option>
                    <option value="Bills">Bills</option>
                    <option value="Health">Health</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Education">Education</option>
                    <option value="Groceries">Groceries</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </Card>

              {/* Expenses Table */}
              {expenses && expenses.length === 0 ? (
                <Card>
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p>No expenses found. Add your first expense!</p>
                  </div>
                </Card>
              ) : (
                <>
                  <Card title="Your Expenses">
                    <ExpenseList />
                  </Card>

                </>
              )}

              {/* Add Expense Form with Bill Scan */}
              <Card title="Add New Expense">
                <AddExpense />
                
                {/* Divider */}
                <div style={{ 
                  margin: 'var(--space-lg) 0', 
                  borderTop: '1px solid rgba(255,255,255,0.08)',
                  position: 'relative'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--card)',
                    padding: '0 var(--space-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--muted)'
                  }}>
                    OR
                  </span>
                </div>
                
                {/* Bill Scan Upload */}
                <BillScan />
              </Card>

              {/* Monthly Limit */}
              <Card title="Set Monthly Limit">
                <SetLimitForm 
                  limitInput={limitInput} 
                  setLimitInput={setLimitInput} 
                  dispatch={dispatch} 
                  updateMonthlyLimit={updateMonthlyLimit}
                  fetchDashboard={fetchDashboard}
                />
              </Card>

              {/* Charts */}
              <Card title="Analytics Overview">
                <AdvancedCharts />
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Dashboard;
