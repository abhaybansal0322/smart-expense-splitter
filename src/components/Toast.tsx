'use client';

import React, { useEffect, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icon = type === 'success' ? '✓' : '✕';

  return (
    <div className={`toast toast-${type}`}>
      <span style={{ fontWeight: 700 }}>{icon}</span>
      {message}
    </div>
  );
}

// ─── Hook for toast management ───
interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => remove(t.id)} />
      ))}
    </>
  ), [toasts, remove]);

  return { show, ToastContainer };
}
