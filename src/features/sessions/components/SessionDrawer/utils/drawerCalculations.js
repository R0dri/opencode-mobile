/**
 * @fileoverview Calculation utilities for SessionDrawer positioning and dimensions
 * Extracted for reusability and testability
 */

/**
 * Calculate drawer dimensions - simplified for CSS-based approach
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @returns {Object} Dimension calculations
 */
export const calculateDrawerDimensions = (isPersistent) => {
  const modalWidth = 320; // Fixed fallback width - CSS handles actual responsiveness
  const persistentWidth = 320; // Fixed width for persistent sidebar

  return {
    modalWidth,
    persistentWidth,
    width: isPersistent ? persistentWidth : modalWidth,
  };
};

/**
 * Calculate initial animation position for drawer
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @param {number} drawerWidth - Drawer width in pixels
 * @returns {number} Initial translateX value
 */
export const calculateInitialTranslateX = (isPersistent, drawerWidth = 320) => {
  if (isPersistent) {
    return 0; // Persistent sidebar starts visible
  }
  return -drawerWidth; // Modal starts off-screen
};

/**
 * Calculate gesture thresholds - proportional to drawer width
 * @param {number} drawerWidth - Drawer width in pixels
 * @returns {Object} Gesture threshold values
 */
export const calculateGestureThresholds = (drawerWidth = 320) => {
  return {
    edgeZoneWidth: 20, // px from left edge
    gestureThreshold: drawerWidth * 0.25, // Threshold based on drawer width
    velocityThreshold: 400, // points per second
  };
};