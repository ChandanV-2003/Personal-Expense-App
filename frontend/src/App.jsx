import { Routes, Route } from "react-router-dom";
import OtpAuth from "./pages/OtpAuth";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<OtpAuth />} />

      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<OtpAuth />} />
    </Routes>
  );
}

export default App;