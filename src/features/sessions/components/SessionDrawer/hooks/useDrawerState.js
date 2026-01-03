/**
 * @fileoverview State management hook for SessionDrawer visibility
 * Handles visibility logic and external prop synchronization
 */
import { useEffect, useCallback } from 'react';

/**
 * State management hook for drawer visibility
 * @param {boolean} visible - External visibility prop
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @param {Function} onOpenDrawer - Function to open drawer
 * @param {Function} onCloseDrawer - Function to close drawer
 * @param {Function} onClose - External close callback
 * @returns {Object} State management functions
 */
export const useDrawerState = (visible, isPersistent, onOpenDrawer, onCloseDrawer, onClose) => {
  // Handle visibility changes for modal drawers
  useEffect(() => {
    if (!isPersistent) {
      if (visible) {
        onOpenDrawer?.();
      } else {
        onCloseDrawer?.();
      }
    }
  }, [visible, isPersistent, onOpenDrawer, onCloseDrawer]);

  // Stable callback for closing drawer
  const handleClose = useCallback(() => {
    if (!isPersistent) {
      onCloseDrawer?.();
      onClose?.();
    }
  }, [isPersistent, onCloseDrawer, onClose]);

  return {
    handleClose,
  };
};