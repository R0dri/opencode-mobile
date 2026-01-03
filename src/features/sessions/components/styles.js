// styles.js - Centralized styles for session drawer components
export const createStyles = (theme, insets) => ({
  // OVERLAY & POSITIONING
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  fullTouchable: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },

  // DRAWER CONTAINERS
  drawer: {
    position: "absolute",
    left: 0,
    top: insets.top,
    bottom: 0,
    width: "80%", // CSS percentage instead of JavaScript calculation
    maxWidth: 360, // Prevent overly wide drawers
    minWidth: 280, // Ensure usable width on small screens
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  persistentDrawer: {
    width: 320,
    elevation: 5,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // HEADER & NAVIGATION
  drawerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },

  sectionHeader: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginTop: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    minHeight: 36,
    padding: 0,
  },
  sectionHeaderNoMargin: {
    marginBottom: 0,
  },
  sectionHeaderLeft: {
    justifyContent: "center",
    paddingLeft: 12,
    // paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },

  // BUTTONS & CONTROLS
  closeButton: {
    padding: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.success,
  },
  createIcon: {
    marginRight: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  disabledText: {
    color: theme.colors.textMuted,
  },
  inlineNewSessionButton: {
    backgroundColor: "rgba(34, 197, 94, 0.1)", // Light green transparent background
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  inlineNewSessionText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  editButton: {
    backgroundColor: "rgba(251, 191, 36, 0.1)", // Light yellow transparent background
    borderRadius: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 12,
    color: theme.colors.warning, // Yellow text color
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // SESSION ITEMS
  sessionItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  sessionTouchable: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  activeSessionItem: {
    backgroundColor: theme.colors.surface,
  },
  activeSessionTitle: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  childSessionItem: {
    backgroundColor: theme.colors.surfaceSecondary, // Subtle background to indicate hierarchy
  },
  childSessionTouchable: {
    paddingVertical: 10, // Thinner than parent sessions (14px)
  },
  orphanedSessionItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  childIndent: {
    width: 16,
  },
  childSessionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  expandIcon: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    transition: "transform 0.2s ease",
  },
  sessionContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  sessionHeader: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
    gap: 8,
    flexShrink: 0,
  },
  sessionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionCount: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 8,
    flexShrink: 0,
  },
  compactDeleteButton: {
    padding: 8,
    marginLeft: 8,
    minWidth: 32,
    minHeight: 32,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
    flexShrink: 0,
  },
  compactDeleteIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.textMuted,
  },
  sessionSummary: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 1,
    marginBottom: 1,
  },
  summaryAdditions: {
    color: theme.colors.success,
  },
  summaryDeletions: {
    color: theme.colors.error,
  },
  sessionTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  titleTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  childIndicator: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 4,
  },
  sessionTitle: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  sessionTitleRow: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  newSessionTitle: {
    color: theme.colors.success,
    fontWeight: "600",
    textAlign: "center",
  },
  busySessionTitle: {
    fontWeight: "bold",
  },
  childSessionTitle: {
    color: theme.colors.textMuted, // Muted text color for child sessions
  },
  inlineSummary: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: "400",
  },
  titleContainer: {
    flex: 1,
  },
  timeContainer: {
    width: 60,
    alignItems: "center",
    justifyContent: "center",
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

  activeIndicator: {
    marginLeft: 8,
  },

  // DELETE FUNCTIONALITY

  deleteText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.error,
  },

  // PROJECT ITEMS
  projectSelector: {
    flex: 1,
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  dropdownIcon: {
    flexShrink: 0,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 100,
  },
  dropdownContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    maxHeight: 450,
    width: "90%",
    elevation: 5,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownHeader: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  projectList: {
    maxHeight: 350,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 8,
    backgroundColor: theme.colors.surface,
  },
  activeProjectItem: {
    backgroundColor: theme.colors.surfaceSecondary,
    borderColor: theme.colors.accent,
    borderWidth: 1,
  },
  projectInfo: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  projectItemTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    flex: 1,
  },
  activeProjectTitle: {
    color: theme.colors.accent,
    fontWeight: "600",
  },
  vcsBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  vcsBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.success,
  },
  projectFooter: {
    flexDirection: "column",
  },
  projectPath: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  lastUpdated: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },

  // SCROLLVIEW & CONTAINERS
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    paddingHorizontal: 8,
  },
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },

  // LOADING & SKELETON
  skeletonItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  skeletonText: {
    height: 16,
    backgroundColor: theme.colors.surfaceSecondary,
    borderRadius: 4,
    marginBottom: 8,
  },

  // ANIMATIONS
  animatedExpand: {
    transform: [{ rotate: "0deg" }],
  },
  animatedCollapse: {
    transform: [{ rotate: "180deg" }],
  },

  // ICONS & VISUAL ELEMENTS
  icon: {
    marginRight: 8,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotConnected: {
    backgroundColor: theme.colors.statusConnected,
  },
  statusDotConnecting: {
    backgroundColor: theme.colors.statusConnecting,
  },
  statusDotError: {
    backgroundColor: theme.colors.statusUnreachable,
  },
});
