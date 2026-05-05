'use client';

import { ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
  title?: string;
  description?: string;
}

export function Modal({ children, onClose, maxWidth = 480, title, description }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            {title && <h2 style={{ fontSize: 20, fontWeight: 700 }}>{title}</h2>}
            {description && <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{description}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, fontWeight: 300, lineHeight: 1 }}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
