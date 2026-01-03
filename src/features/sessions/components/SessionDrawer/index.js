/**
 * @fileoverview Main SessionDrawer component with backward compatibility
 * Conditionally renders modal or persistent drawer while preserving exact API
 */
import React from 'react';
import SessionDrawerModal from './SessionDrawerModal';
import SessionDrawerPersistent from './SessionDrawerPersistent';
import SessionDrawerErrorBoundary from './SessionDrawerErrorBoundary';

/**
 * SessionDrawer - Main component with zero breaking changes
 * Maintains exact same API while using refactored internal architecture
 * @param {SessionDrawerProps} props - Component props
 * @returns {JSX.Element|null} Appropriate drawer component based on mode
 */
const SessionDrawer = (props) => {
  const {
    visible = false,
    isPersistent = false,
    sessions = [],
    selectedSession,
    selectedProject,
    projects = [],
    sessionStatuses = {},
    sessionLoading = false,
    onProjectSelect,
    onSessionSelect,
    deleteSession,
    onClose,
    createSession,
  } = props;

  // Render persistent sidebar for desktop/tablet
  if (isPersistent) {
    return (
      <SessionDrawerPersistent
        sessions={sessions}
        selectedSession={selectedSession}
        selectedProject={selectedProject}
        projects={projects}
        sessionStatuses={sessionStatuses}
        sessionLoading={sessionLoading}
        onProjectSelect={onProjectSelect}
        onSessionSelect={onSessionSelect}
        deleteSession={deleteSession}
        onClose={onClose}
        createSession={createSession}
      />
    );
  }

  // Render modal drawer for mobile (only when visible)
  if (visible) {
    return (
      <SessionDrawerModal
        visible={visible}
        sessions={sessions}
        selectedSession={selectedSession}
        selectedProject={selectedProject}
        projects={projects}
        sessionStatuses={sessionStatuses}
        sessionLoading={sessionLoading}
        onProjectSelect={onProjectSelect}
        onSessionSelect={onSessionSelect}
        deleteSession={deleteSession}
        onClose={onClose}
        createSession={createSession}
      />
    );
  }

  // Return null when modal drawer is not visible
  return null;
};

export default SessionDrawer;