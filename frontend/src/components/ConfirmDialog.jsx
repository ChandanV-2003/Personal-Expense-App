import { FaExclamationTriangle } from "react-icons/fa";

const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete", cancelText = "Cancel" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="centered" style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'rgba(248, 113, 113, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            marginBottom: 'var(--space-sm)'
          }}>
            <FaExclamationTriangle size={28} color="var(--danger)" />
          </div>
          <h3 style={{ margin: 0, textAlign: 'center' }}>{title}</h3>
        </div>
        
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 'var(--space-lg)' }}>
          {message}
        </p>
        
        <div className="modal-actions">
          <button className="btn btn-danger" onClick={onConfirm}>
            {confirmText}
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
