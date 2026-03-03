import { useSelector } from "react-redux";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const AdvancedCharts = () => {
  const { expenses } = useSelector((state) => state.expense);

  if (!expenses || expenses.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <p>Add expenses to see charts</p>
      </div>
    );
  }

  const categoryData = {};
  const monthlyData = {};

  expenses.forEach((exp) => {
    const category = exp.category || 'Uncategorized';
    categoryData[category] = (categoryData[category] || 0) + exp.amount;

    const month = new Date(exp.createdAt).toLocaleString("default", {
      month: "short",
    });

    monthlyData[month] = (monthlyData[month] || 0) + exp.amount;
  });

  const pieData = Object.keys(categoryData).map((key) => ({
    name: key,
    value: categoryData[key],
  }));

  const lineData = Object.keys(monthlyData).map((key) => ({
    month: key,
    amount: monthlyData[key],
  }));

  const COLORS = ['#7C3AED', '#F472B6', '#3B82F6', '#34D399', '#FBBF24', '#F87171'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '8px',
          padding: '8px 12px',
        }}>
          <p style={{ margin: 0, color: 'var(--text)', fontWeight: 600, fontSize: '0.875rem' }}>
            {label || payload[0].name}
          </p>
          <p style={{ margin: '4px 0 0 0', color: 'var(--primary)', fontSize: '0.8rem' }}>
            ₹{payload[0].value?.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-wrapper">
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ textAlign: 'center', marginBottom: 'var(--space-sm)', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Expenses by Category
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {pieData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p style={{ textAlign: 'center', marginBottom: 'var(--space-sm)', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Monthly Trend
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" stroke="var(--muted)" fontSize={11} tickLine={false} />
            <YAxis stroke="var(--muted)" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="amount" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#F472B6', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdvancedCharts;