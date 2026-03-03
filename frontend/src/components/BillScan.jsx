import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { FaCamera, FaSpinner, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "../config/axios";
import { fetchExpenses, fetchDashboard } from "../slices/expenseSlice";

const BillScan = () => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, WEBP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size too large. Max 5MB allowed.');
      return;
    }

    await scanBill(file);
  };

  const scanBill = async (file) => {
    setScanning(true);
    setScannedData(null);

    const formData = new FormData();
    formData.append('billImage', file);

    try {
      const response = await axios.post('/expenses/scan-bill', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const { expense, parsedData } = response.data.data;
        setScannedData({ expense, parsedData });
        toast.success('Bill scanned and expense added successfully!');
        
        // Refresh dashboard data
        await Promise.all([
          dispatch(fetchExpenses()),
          dispatch(fetchDashboard())
        ]);

        // Clear scanned data after 3 seconds
        setTimeout(() => setScannedData(null), 3000);
      }
    } catch (error) {
      console.error('Bill scan error:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to scan bill. Please try again.';
      
      if (error.response) {
        // Server responded with error
        const status = error.response.status;
        errorMessage = error.response.data?.message || `Server error: ${status}`;
        console.error('Server error details:', error.response.data);
        
        // Handle duplicate bill (409 Conflict)
        if (status === 409 && error.response.data?.duplicate) {
          const duplicate = error.response.data.duplicate;
          toast.warning(
            <div>
              <strong>Duplicate Bill Detected!</strong>
              <br />
              Amount: ₹{duplicate.amount} | Category: {duplicate.category}
              <br />
              <small>You already added this bill on {new Date(duplicate.date).toLocaleDateString()}</small>
            </div>,
            { autoClose: 5000 }
          );
          setScannedData({ 
            expense: null, 
            parsedData: error.response.data.parsedData,
            isError: true,
            isDuplicate: true,
            duplicate: duplicate
          });
          return;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      toast.error(errorMessage);
      
      // If parsing failed but we have preview data, show it
      if (error.response?.data?.parsedData && !error.response?.data?.duplicate) {
        setScannedData({ 
          expense: null, 
          parsedData: error.response.data.parsedData,
          isError: true 
        });
        toast.info('You can add the expense manually with the detected information.');
      }
    } finally {
      setScanning(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      {/* Upload Button */}
      <div className="flex gap-md items-center">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/jpeg,image/png,image/jpg,image/webp"
          style={{ display: 'none' }}
          disabled={scanning}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn btn-accent"
          disabled={scanning}
        >
          {scanning ? (
            <>
              <FaSpinner className="spinner-icon" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <FaCamera />
              <span>Scan Bill</span>
            </>
          )}
        </button>

        <span className="text-muted" style={{ fontSize: '0.875rem' }}>
          Upload a bill image to auto-extract details
        </span>
      </div>

      {/* Scanning Progress */}
      {scanning && (
        <div style={{ 
          marginTop: 'var(--space-md)', 
          padding: 'var(--space-md)',
          background: 'var(--card)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center'
        }}>
          <div className="spinner" style={{ margin: '0 auto var(--space-sm)' }}></div>
          <p className="text-muted">Processing your bill...</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
            Extracting text with OCR and parsing with AI
          </p>
        </div>
      )}

      {/* Success/Partial Preview */}
      {scannedData && (
        <div style={{ 
          marginTop: 'var(--space-md)', 
          padding: 'var(--space-md)',
          background: scannedData.isError ? 'rgba(251, 191, 36, 0.1)' : 'rgba(52, 211, 153, 0.1)',
          border: scannedData.isError ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(52, 211, 153, 0.3)',
          borderRadius: 'var(--radius-md)',
        }}>
          <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--space-sm)' }}>
            <FaCheckCircle color={scannedData.isError ? 'var(--warning)' : 'var(--success)'} size={20} />
            <span style={{ fontWeight: 600, color: scannedData.isError ? 'var(--warning)' : 'var(--success)' }}>
              {scannedData.isError ? 'Partial Data Extracted' : 'Expense Added Successfully!'}
            </span>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 'var(--space-sm)',
            fontSize: '0.9rem'
          }}>
            <div>
              <span className="text-muted">Amount:</span>
              <span style={{ marginLeft: 'var(--space-xs)', fontWeight: 600 }}>
                ₹{scannedData.parsedData.amount}
              </span>
            </div>
            <div>
              <span className="text-muted">Category:</span>
              <span style={{ marginLeft: 'var(--space-xs)', fontWeight: 600 }}>
                {scannedData.parsedData.category}
              </span>
            </div>
            <div>
              <span className="text-muted">Date:</span>
              <span style={{ marginLeft: 'var(--space-xs)' }}>
                {scannedData.parsedData.date}
              </span>
            </div>
            <div>
              <span className="text-muted">Description:</span>
              <span style={{ marginLeft: 'var(--space-xs)' }}>
                {scannedData.parsedData.description || '-'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillScan;
