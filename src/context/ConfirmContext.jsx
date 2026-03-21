import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const resolveRef = useRef(null);
  const [config, setConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'OK',
    type: 'danger',
    singleButton: false,
  });

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfig({
        isOpen: true,
        title: opts.title || 'Confirm',
        message: opts.message || '',
        confirmText: opts.confirmText || 'OK',
        type: opts.type || 'danger',
        singleButton: opts.singleButton ?? false,
        onConfirm: () => {
          const r = resolveRef.current;
          resolveRef.current = null;
          if (opts.onConfirm) opts.onConfirm();
          if (r) r(true);
        },
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
    setConfig((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmationModal
        isOpen={config.isOpen}
        onClose={handleClose}
        onConfirm={config.onConfirm}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText}
        type={config.type}
        singleButton={config.singleButton}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
