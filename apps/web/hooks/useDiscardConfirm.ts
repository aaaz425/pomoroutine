'use client';

import { useState } from 'react';

export function useDiscardConfirm(onClose: () => void, dirty: boolean) {
  const [confirming, setConfirming] = useState(false);

  return {
    requestClose: () => (dirty ? setConfirming(true) : onClose()),
    confirmProps: {
      open: confirming,
      onConfirm: () => {
        setConfirming(false);
        onClose();
      },
      onCancel: () => setConfirming(false),
    },
  };
}
