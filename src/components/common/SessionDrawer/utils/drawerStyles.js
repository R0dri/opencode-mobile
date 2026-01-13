/**
 * @fileoverview Dynamic style generation for SessionDrawer components
 * Extracted for consistency and reusability
 */

/**
 * Create overlay styles for modal drawer
 * @param {Object} theme - Theme object with colors
 * @param {Object} insets - Safe area insets
 * @returns {Object} Overlay style object
 */
export const createOverlayStyles = (theme, insets) => ({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: insets.top, // Account for status bar
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  fullTouchable: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
});

/**
 * Create drawer container styles
 * @param {Object} theme - Theme object with colors
 * @param {Object} insets - Safe area insets
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @returns {Object} Drawer style object
 */
export const createDrawerStyles = (theme, insets, isPersistent) => ({
  drawer: {
    position: 'absolute',
    left: 0,
    top: insets.top,
    bottom: 0,
    width: isPersistent ? 320 : '80%', // CSS percentage for modal, fixed for persistent
    maxWidth: isPersistent ? 320 : 360, // Prevent overly wide drawers
    minWidth: isPersistent ? 320 : 280, // Ensure usable width on small screens
    backgroundColor: theme.colors.glassSurface || theme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: theme.colors.glassBorder || 'transparent',
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: isPersistent ? 0.1 : 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

/**
 * Create header styles for drawer
 * @param {Object} theme - Theme object with colors
 * @returns {Object} Header style object
 */
export const createHeaderStyles = theme => ({
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder || theme.colors.border,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder || theme.colors.border,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

/**
 * Create styles for session items and lists
 * @param {Object} theme - Theme object with colors
 * @returns {Object} Session item style object
 */
export const createSessionStyles = theme => ({
  sessionItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder || theme.colors.borderLight,
    backgroundColor: 'transparent',
  },
  sessionTouchable: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSessionItem: {
    backgroundColor: theme.colors.glassHighlight || theme.colors.surfaceSecondary,
  },
  activeSessionTitle: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  sessionTitle: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  sessionTime: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
});

/**
 * Create close button and control styles
 * @param {Object} theme - Theme object with colors
 * @returns {Object} Control style object
 */
export const createControlStyles = theme => ({
  closeButton: {
    padding: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.success,
  },
});
