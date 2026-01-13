/**
 * @fileoverview Modal drawer component for SessionDrawer
 * Handles overlay and gesture-based interactions for mobile
 */
import React, { useMemo, useEffect } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/components/ThemeProvider';
import SessionList from '@/features/sessions/components/SessionListDrawer';
import { useSessionDrawerAnimation } from '@/features/sessions/hooks';

import DrawerOverlay from './DrawerOverlay';
import DrawerHeader from './DrawerHeader';
import DrawerBottomBar from './DrawerBottomBar';
import { useDrawerState } from '@/features/sessions/hooks';
import { createDrawerStyles, createOverlayStyles } from './utils/drawerStyles';

/**
 * Modal drawer component - slides in from side with overlay
 * @param {SessionDrawerProps} props - Component props
 * @returns {JSX.Element|null} Modal drawer component
 */
const SessionDrawerModal = React.memo(
  ({
    visible = false,
    sessions = [],
    selectedSession = null,
    selectedProject = null,
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
    const { width: screenWidth } = useWindowDimensions();

    const drawerWidth = screenWidth && screenWidth > 0 ? Math.min(screenWidth * 0.8, 360) : 320;
    const overlayStyles = useMemo(() => createOverlayStyles(theme, insets), [theme, insets]);
    const drawerStyles = useMemo(() => createDrawerStyles(theme, insets, false), [theme, insets]);

    const { gestureHandler, openDrawer, closeDrawer } = useSessionDrawerAnimation(
      false,
      onClose,
      drawerWidth,
    );
    const { handleClose } = useDrawerState(visible, false, openDrawer, closeDrawer, onClose);

    // Refresh sessions when drawer opens
    useEffect(() => {
      if (visible && refreshSessions) {
        refreshSessions();
      }
    }, [visible, refreshSessions]);

    return (
      <View
        style={{
          flex: 1,
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        }}
      >
        <DrawerOverlay visible={visible} onPress={handleClose}>
          <GestureDetector gesture={gestureHandler}>
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
                  onClose={handleClose}
                  isPersistent={false}
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
          </GestureDetector>
        </DrawerOverlay>
      </View>
    );
  },
);

export default SessionDrawerModal;
