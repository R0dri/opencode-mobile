/**
 * @fileoverview Modal drawer component for SessionDrawer
 * Handles overlay and gesture-based interactions for mobile
 */
import React, { useMemo } from "react";
import { View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../../shared/components/ThemeProvider";
import DrawerOverlay from "../DrawerOverlay";
import DrawerHeader from "../DrawerHeader";
import SessionList from "@/features/sessions/components/SessionListDrawer";
import { useDrawerAnimation } from "./hooks/useDrawerAnimation";
import { useDrawerState } from "./hooks/useDrawerState";
import { createDrawerStyles, createOverlayStyles } from "./utils/drawerStyles";

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
  }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { width: screenWidth } = useWindowDimensions();

    const drawerWidth =
      screenWidth && screenWidth > 0 ? Math.min(screenWidth * 0.8, 360) : 320;
    const overlayStyles = useMemo(
      () => createOverlayStyles(theme, insets),
      [theme, insets],
    );
    const drawerStyles = useMemo(
      () => createDrawerStyles(theme, insets, false),
      [theme, insets],
    );

    const { gestureHandler, openDrawer, closeDrawer } = useDrawerAnimation(
      false,
      onClose,
      drawerWidth,
    );
    const { handleClose } = useDrawerState(
      visible,
      false,
      openDrawer,
      closeDrawer,
      onClose,
    );

    return (
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: "hidden",
        }}
      >
        <DrawerOverlay visible={visible} onPress={handleClose}>
          <GestureDetector gesture={gestureHandler}>
            <View style={[drawerStyles.drawer]}>
              {/* <View>*/}
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
              />
            </View>
          </GestureDetector>
        </DrawerOverlay>
      </View>
    );
  },
);

export default SessionDrawerModal;
