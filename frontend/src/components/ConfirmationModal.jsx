import React, { useState } from 'react';

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary', // 'primary' | 'danger'
  confirmVariant, // backwards compatibility
  confirmLabel,   // backwards compatibility
  requiresReason = false,
  requireReason = false, // backwards compatibility
  reasonPlaceholder = 'Please provide a reason...',
  requiresCondition = false,
  onConfirm,
  onClose,
  loading = false,
}) {
  const [reason, setReason] = useState('');
  const [condition, setCondition] = useState('good');

  if (!isOpen) return null;

  const resolvedConfirmText = confirmLabel || confirmText;
  const isDanger = (confirmVariant || type) === 'danger';
  const needReason = requiresReason || requireReason;

  const handleConfirm = () => {
    onConfirm({ reason, condition });
    setReason('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </p>

        {requiresCondition && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Asset Condition
            </label>
            <select
              className="input-control"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="excellent">Excellent - Like new</option>
              <option value="good">Good - Normal minor wear</option>
              <option value="fair">Fair - Noticeable wear</option>
              <option value="damaged">Damaged - Requires repair</option>
              <option value="lost">Lost</option>
            </select>
          </div>
        )}

        {needReason && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Reason / Notes
            </label>
            <textarea
              className="input-control"
              rows={3}
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={isDanger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={handleConfirm}
            disabled={loading || (needReason && !reason.trim())}
          >
            {loading ? <span className="spinner" /> : resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
