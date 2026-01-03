/**
 * @fileoverview Gesture handling hook for SessionDrawer components
 * Separated from animation logic for better modularity
 */
import { Gesture } from 'react-native-gesture-handler';
import { calculateGestureThresholds } from '../utils/drawerCalculations';

/**
 * Gesture hook for drawer interactions
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @param {Function} onOpenDrawer - Callback to open drawer
 * @param {Function} onCloseDrawer - Callback to close drawer
 * @param {number} screenWidth - Current screen width
 * @returns {Object} Gesture handler configuration
 */
export const useDrawerGesture = (isPersistent, onOpenDrawer, onCloseDrawer, screenWidth) => {
  const { gestureThreshold, velocityThreshold, edgeZoneWidth } = calculateGestureThresholds(screenWidth);

  const gestureHandler = Gesture.Pan()
    .activeOffsetX([-edgeZoneWidth, edgeZoneWidth])
    .onUpdate((event) => {
      // Gesture updates handled in animation hook
    })
    .onEnd((event) => {
      if (!isPersistent && Math.abs(event.translationX) > Math.abs(event.translationY)) {
        const { translationX, velocityX } = event;
        const shouldOpen = translationX > gestureThreshold || velocityX > velocityThreshold;
        const shouldClose = translationX < -gestureThreshold || velocityX < -velocityThreshold;

        if (shouldOpen) {
          onOpenDrawer?.();
        } else if (shouldClose) {
          onCloseDrawer?.();
        }
      }
    });

  return {
    gestureHandler,
    gestureThreshold,
    velocityThreshold,
    edgeZoneWidth,
  };
};