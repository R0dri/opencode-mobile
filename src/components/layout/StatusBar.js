import React, { useState, useEffect, useMemo, memo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Animated } from 'react-native';
import { getProjectDisplayName } from '@/shared';
import { useTheme } from '@/shared/components/ThemeProvider';
import { SessionBusyIndicator } from '@/features/sessions/components';
import { BreadcrumbSlider } from '@/shared/components';
import MenuToggleButton from './MenuToggleButton';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import SessionDropdown from './SessionDropdown';
import { useConnectionStatusDisplay, useSessionManagement } from '@/features/sessions/hooks';
import Svg, { Path } from 'react-native-svg';

/**
 * StatusBar component showing app title and connection status
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {boolean|null} props.isServerReachable - Whether server is reachable (null = not tested)
 * @param {import('@/features/projects/types/project.types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('@/shared/types/opencode.types.js').Session|null} props.selectedSession - Currently selected session
 * @param {Function} props.onProjectPress - Function called when project breadcrumb is pressed
 * @param {Function} props.onSessionPress - Function called when session breadcrumb is pressed
 * @param {Function} props.onReconnect - Function called to reconnect
 * @param {Function} props.onDisconnect - Function called to disconnect
 * @param {boolean} props.showMeta - Whether meta headers are shown
 * @param {Function} props.onToggleMeta - Function called to toggle meta headers
 */
const StatusBar = ({
  isConnected,
  isConnecting,
  isServerReachable,
  showInfoBar,
  onToggleInfoBar,
  selectedProject,
  selectedSession,
  onProjectPress,
  onSessionPress,
  projectSessions,
  onSessionSelect,
  onRefreshSession,
  onCreateSession,
  deleteSession,
  baseUrl,
  isSessionBusy,
  groupedUnclassifiedMessages,
  groupedAllMessages,
  events,
  onDebugPress,
  onMenuPress,
  sidebarVisible,
  isWideScreen,
  showMeta,
  onToggleMeta,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme, isWideScreen);

  const { showConnectedText } = useConnectionStatusDisplay(isConnected);
  const {
    dropdownVisible,
    creating,
    toggleDropdown,
    handleCreateSession,
    handleSessionSelect,
    handleDeleteSession,
  } = useSessionManagement(onCreateSession, deleteSession, onSessionSelect);

  // Title animation logic
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Get the title text to display
  const titleText = useMemo(() => {
    if (selectedSession) {
      return selectedSession.title || 'Untitled Session';
    } else if (selectedProject) {
      return getProjectDisplayName(selectedProject.worktree);
    } else {
      return 'SSE Chat';
    }
  }, [selectedSession, selectedProject]);

  // Animate when title changes
  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [titleText, fadeAnim]);

  return (
    <View style={styles.statusBarContainer}>
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.glassSurface || 'rgba(255,255,255,0.3)' },
          ]}
        />
      </View>
      <View style={styles.statusBarContent}>
        {/* Top Row: Controls and Status */}
        <View style={styles.topRow}>
          {/* Left: Menu and Status */}
          <View style={styles.leftContainer}>
            <MenuToggleButton
              style={styles.menuButton}
              onMenuPress={onMenuPress}
              isWideScreen={isWideScreen}
              sidebarVisible={sidebarVisible}
            />
            <ConnectionStatusIndicator
              isConnected={isConnected}
              isConnecting={isConnecting}
              isServerReachable={isServerReachable}
              showConnectedText={showConnectedText}
              isWideScreen={isWideScreen}
              onToggleInfoBar={onToggleInfoBar}
            />
            <TouchableOpacity style={styles.titleContainer} onPress={onToggleInfoBar}>
              <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
                  {titleText}
                </Text>
                {selectedSession?.description && (
                  <Text style={styles.descriptionText} numberOfLines={1} ellipsizeMode="tail">
                    {selectedSession.description}
                  </Text>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Middle Row: Breadcrumb */}
        {/* <View style={styles.middleRow}>
         <BreadcrumbSlider
           selectedProject={selectedProject}
           selectedSession={selectedSession}
           onProjectPress={onProjectPress}
           onSessionPress={onSessionPress}
         />
       </View> */}

        {/* Bottom Row: Session Title and Actions */}
        {/* <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.titleContainer} onPress={toggleDropdown}>
            <Text style={styles.appTitle} numberOfLines={1}>{truncateTitle(selectedSession?.title)}</Text>
            <Svg width={12} height={12} viewBox="0 0 24 24" style={styles.dropdownArrow}>
             <Path d={dropdownVisible ? "M7 10l5 5 5-5z" : "M10 7l5 5-5 5z"} fill="#666666" />
           </Svg>
         </TouchableOpacity>

         <View style={styles.rightContainer}>
           <TouchableOpacity style={styles.refreshButton} onPress={onRefreshSession}>
             <Svg width={16} height={16} viewBox="0 0 24 24">
               <Path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="#666666" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
             </Svg>
           </TouchableOpacity>

           <SessionBusyIndicator isBusy={isSessionBusy} />
         </View>
       </View> */}

        {/* <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <FlatList
              data={[{ id: 'create', type: 'create' }, ...projectSessions]}
              keyExtractor={(item) => item.id}
              renderItem={renderSessionItem}
              showsVerticalScrollIndicator={false}
              style={styles.sessionList}
            />
          </View>
        </TouchableOpacity>
       </Modal> */}
        <SessionDropdown
          visible={dropdownVisible}
          onClose={toggleDropdown}
          projectSessions={projectSessions}
          selectedSession={selectedSession}
          onSessionSelect={handleSessionSelect}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          creating={creating}
        />
      </View>
    </View>
  );
};

const getStyles = (theme, isWideScreen) =>
  StyleSheet.create({
    statusBarContainer: {
      position: 'relative',
      overflow: 'hidden',
    },
    statusBarContent: {
      backgroundColor: 'transparent',
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    statusBar: {
      backgroundColor: theme.colors.glassSurface || 'rgba(255, 255, 255, 0.5)',
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 16,
      paddingRight: 16,
      flexDirection: 'column',
      alignItems: 'stretch',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.glassBorder || 'rgba(0, 0, 0, 0.1)',
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    topControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    middleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    bottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    leftContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minWidth: 0, // Allow shrinking
    },
    rightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    infoToggle: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    infoToggleText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
    },
    appTitle: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    statusInfo: {
      flexDirection: 'column',
    },
    statusText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '500',
    },
    projectText: {
      color: theme.colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 2,
    },
    loadingIndicator: {
      marginLeft: 8,
    },
    titleContainer: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
    },
    titleText: {
      fontSize: isWideScreen ? 14 : 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 2,
    },
    descriptionText: {
      fontSize: isWideScreen ? 11 : 13,
      color: theme.colors.textSecondary,
    },
    dropdownArrow: {
      marginLeft: 4,
    },
    dropdownOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      justifyContent: 'flex-start',
      paddingTop: 60, // Below status bar
    },
    dropdownContainer: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 16,
      borderRadius: 8,
      maxHeight: 300,
      elevation: 5,
      shadowColor: theme.colors.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    sessionList: {
      maxHeight: 300,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.borderLight,
    },
    sessionContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteButton: {
      padding: 8,
      marginLeft: 8,
    },
    deleteIcon: {
      marginLeft: 8,
    },
    activeSessionItem: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    sessionInfo: {
      flex: 1,
    },
    sessionTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.textPrimary,
    },
    activeSessionTitle: {
      color: theme.colors.accentSecondary,
      fontWeight: '600',
    },
    sessionMeta: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    activeIndicator: {
      marginRight: 8,
    },
    createItem: {
      backgroundColor: theme.colors.successBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.statusConnected,
    },
    createTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.success,
    },
    menuButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsButton: {
      padding: 8,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    debugButton: {
      padding: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    refreshButton: {
      padding: 8,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default memo(StatusBar);
