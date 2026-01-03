/**
 * @fileoverview Type definitions for SessionDrawer components
 * Ensures zero breaking changes during refactoring
 */

/**
 * @typedef {Object} SessionDrawerProps
 * @property {boolean} [visible=false] - Modal visibility control
 * @property {boolean} [isPersistent=false] - Modal vs persistent sidebar mode
 * @property {Array} [sessions=[]] - Session data array
 * @property {Object} [selectedSession] - Active session reference
 * @property {Object} [selectedProject] - Active project reference
 * @property {Array} [projects=[]] - Available projects array
 * @property {Object} [sessionStatuses={}] - Session status mapping
 * @property {boolean} [sessionLoading=false] - Loading state indicator
 * @property {Function} [onProjectSelect] - Project selection callback
 * @property {Function} [onSessionSelect] - Session selection callback
 * @property {Function} [deleteSession] - Session deletion callback
 * @property {Function} [onClose] - Drawer close callback
 * @property {Function} [createSession] - Session creation callback
 */

/**
 * @typedef {Object} DrawerAnimationConfig
 * @property {number} duration - Animation duration in milliseconds
 * @property {boolean} useNativeDriver - Whether to use native driver
 */

/**
 * @typedef {Object} DrawerGestureConfig
 * @property {number} edgeZoneWidth - Width of edge zone for gesture detection
 * @property {number} gestureThreshold - Minimum distance for gesture recognition
 * @property {number} velocityThreshold - Minimum velocity for gesture completion
 */

/**
 * @typedef {Object} DrawerDimensions
 * @property {number} modalWidth - Width for modal drawer (percentage of screen)
 * @property {number} persistentWidth - Fixed width for persistent sidebar
 * @property {number} screenWidth - Current screen width
 */