import { useState, useEffect } from "react";
import axiosInstance from "../config/axios";
import { useDispatch, useSelector } from "react-redux";
import { loginSuccess } from "../slices/authSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaArrowLeft, FaLock, FaEnvelope } from "react-icons/fa";
import "../styles/auth.css";

const OtpAuth = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // read auth token from store
  const { token } = useSelector((state) => state.auth);

  // if already logged in, redirect straight away
  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Email required");
      return;
    }

    setLoading(true);
    try {
      await axiosInstance.post("/users/send-otp", { email });
      toast.success("OTP Sent!");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("OTP required");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosInstance.post("/users/verify-otp", {
        email,
        otp,
      });

      dispatch(loginSuccess(data));
      toast.success("Login Successful!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP");
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  const handleSendAgain = () => {
    setOtp("");
    handleSendOtp({ preventDefault: () => {} });
  };

  const handleBackToEmail = () => {
    setEmail("");
    setOtp("");
    setStep(1);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {/* Brand Header */}
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <FaLock />
            </div>
            <h1>Expense Tracker</h1>
            <p>Secure login with OTP</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="auth-form">
              <h2>Welcome Back</h2>
              
              <div className="form-group">
                <label htmlFor="email">
                  <FaEnvelope style={{ marginRight: '8px', fontSize: '0.9em' }} />
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="auth-input"
                  required
                />
              </div>
              
              <button type="submit" disabled={loading} className="auth-btn">
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Sending OTP...
                  </>
                ) : (
                  "Send OTP"
                )}
              </button>

              <p className="security-note">
                <FaLock style={{ fontSize: '0.9em' }} />
                Secured with OTP verification
              </p>
            </form>
          ) : (
            <>
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <h2>Verify OTP</h2>
                
                <div className="email-display">
                  Sent to: <strong>{email}</strong>
                </div>
                
                <div className="form-group">
                  <label htmlFor="otp">Enter OTP Code</label>
                  <input
                    id="otp"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={loading}
                    className="auth-input"
                    maxLength={6}
                    required
                  />
                </div>
                
                <button type="submit" disabled={loading} className="auth-btn">
                  {loading ? (
                    <>
                      <span className="spinner-small"></span>
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </button>
              </form>

              <div className="otp-actions">
                <button 
                  type="button" 
                  onClick={handleSendAgain}
                  disabled={loading}
                  className="auth-btn-secondary"
                >
                  Resend OTP
                </button>
              </div>

              <button 
                type="button" 
                onClick={handleBackToEmail}
                disabled={loading}
                className="back-link"
              >
                <FaArrowLeft />
                Change Email
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpAuth;