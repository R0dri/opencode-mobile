/**
 * @fileoverview Persistent drawer component for SessionDrawer
 * Fixed sidebar for desktop/tablet views
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../shared/components/ThemeProvider';
import DrawerHeader from '../DrawerHeader';
import SessionList from '@/features/sessions/components/SessionListDrawer';
import { calculateDrawerDimensions } from './utils/drawerCalculations';
import { createDrawerStyles } from './utils/drawerStyles';

/**
 * Persistent drawer component - fixed sidebar for desktop/tablet
 * @param {SessionDrawerProps} props - Component props
 * @returns {JSX.Element} Persistent drawer component
 */
const SessionDrawerPersistent = React.memo(({
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
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const { width } = calculateDrawerDimensions(true);
  const drawerStyles = useMemo(() => createDrawerStyles(theme, insets, true), [theme, insets]);

  return (
    <View style={drawerStyles.drawer}>
      <DrawerHeader
        selectedProject={selectedProject}
        projects={projects}
        onProjectSelect={onProjectSelect}
        onClose={onClose}
        isPersistent={true}
      />
      <SessionList
        sessions={sessions}
        selectedSession={selectedSession}
        sessionStatuses={sessionStatuses}
        sessionLoading={sessionLoading}
        onSessionSelect={onSessionSelect}
        deleteSession={deleteSession}
        createSession={createSession}
      />
    </View>
  );
});

export default SessionDrawerPersistent;