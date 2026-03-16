import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmationModal } from '../components/ConfirmationModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
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
      setConfig({
        isOpen: true,
        title: opts.title || 'Confirm',
        message: opts.message || '',
        confirmText: opts.confirmText || 'OK',
        type: opts.type || 'danger',
        singleButton: opts.singleButton ?? false,
        onConfirm: () => {
          if (opts.onConfirm) opts.onConfirm();
          resolve(true);
        },
      });
    });
  }, []);

  const handleClose = useCallback(() => {
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
