/**
 * @fileoverview Persistent drawer component for SessionDrawer
 * Fixed sidebar for desktop/tablet views
 */
import React, { useMemo, useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/components/ThemeProvider';
import DrawerHeader from './DrawerHeader';
import DrawerBottomBar from './DrawerBottomBar';
import SessionList from '@/features/sessions/components/SessionListDrawer';
import { calculateDrawerDimensions } from './utils/drawerCalculations';
import { createDrawerStyles } from './utils/drawerStyles';

/**
 * Persistent drawer component - fixed sidebar for desktop/tablet
 * @param {SessionDrawerProps} props - Component props
 * @returns {JSX.Element} Persistent drawer component
 */
const SessionDrawerPersistent = React.memo(
  ({
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
    onToggleInfoBar,
    onDebugPress,
    showMeta,
    onToggleMeta,
    refreshSessions = null,
  }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const { width } = calculateDrawerDimensions(true);
    const drawerStyles = useMemo(() => createDrawerStyles(theme, insets, true), [theme, insets]);

    // Refresh sessions when sidebar becomes visible (on wide screens)
    useEffect(() => {
      if (refreshSessions) {
        refreshSessions();
      }
    }, [refreshSessions]);

    return (
      <View
        style={[
          drawerStyles.drawer,
          {
            flex: 1,
            backgroundColor: theme.colors.glassSurface || 'rgba(255, 255, 255, 0.5)',
            justifyContent: 'space-between',
          },
        ]}
      >
        <View style={{ flex: 1 }}>
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
            refreshSessions={refreshSessions}
          />
        </View>
        <DrawerBottomBar
          onToggleInfoBar={onToggleInfoBar}
          onDebugPress={onDebugPress}
          showMeta={showMeta}
          onToggleMeta={onToggleMeta}
        />
      </View>
    );
  },
);

export default SessionDrawerPersistent;
