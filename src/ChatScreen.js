import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { logger } from '@/shared/services/logger';
import { storage } from '@/shared/services/storage';
import { STORAGE_KEYS } from '@/shared/constants/storage';

import StatusBar from '@/components/layout/StatusBar';
import SendIcon from '@/components/common/PaperPlaneIcon';
import LogModal from '@/components/modals/LogModal';
import { BreadcrumbNavigation } from '@/shared/components';
import { BreadcrumbSlider } from '@/shared/components';
import { ThinkingIndicator } from '@/shared/components/common';
import { useTheme } from '@/shared/components/ThemeProvider';
import { getProjectDisplayName } from '@/shared';
import { useKeyboardState, useSidebarState } from '@/shared/hooks';

import { ChatInputBar } from '@/features/connection/components';
import { ConnectionModal } from '@/features/connection/components';
import { ConnectionStatusBar } from '@/features/connection/components';
import { ConnectionStatusIndicator } from '@/features/connection/components';
import { ServerConnectionInfoBar } from '@/features/connection/components';

import { EventList } from '@/features/messaging/components';
import { MessageDebugModal } from '@/features/messaging/components';
import { SessionMessageFilter } from '@/features/messaging/components';

import { ModelSelector } from '@/features/models/components';

import { NotificationSettings } from '@/features/notifications/components';

import { EmbeddedProjectSelector } from '@/features/projects/components';
import { ProjectList } from '@/features/projects/components';
import { ProjectSelectionModal } from '@/features/projects/components';
import { EmbeddedServerConnector } from '@/features/servers/components';

import { SessionDrawer, EdgeSwipeDetector } from '@/features/sessions/components';
import { SessionBusyIndicator } from '@/features/sessions/components';
import { SessionDropdown } from '@/features/sessions/components';
import { SessionListModal } from '@/features/sessions/components';
import { StatusBarActions } from '@/features/sessions/components';

import TodoDrawer from '@/features/todos/components/TodoDrawer';
import TodoStatusIcon from '@/features/todos/components/TodoStatusIcon';

export default function ChatScreen(props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [showLogs, setShowLogs] = useState(false);
  const [showInfoBar, setShowInfoBar] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [showEmbeddedSelector, setShowEmbeddedSelector] = useState(false);
  const [showEmbeddedServerSelector, setShowEmbeddedServerSelector] = useState(false);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isWideScreen = screenWidth >= 768;
  const {
    sidebarVisible,
    sessionDrawerVisible,
    toggleSidebar,
    setSidebarVisible,
    setSessionDrawerVisible,
  } = useSidebarState(isWideScreen);
  const keyboardState = useKeyboardState();
  const [debugSidebarVisible, setDebugSidebarVisible] = useState(false); // For debug sidebar
  const [showMeta, setShowMeta] = useState(true);
  const viewAnimation = useRef(new Animated.Value(0)).current; // For project selector transitions
  const serverAnimation = useRef(new Animated.Value(0)).current; // For server selector transitions

  // Load showMeta preference on mount
  useEffect(() => {
    const loadShowMeta = async () => {
      try {
        const preferences = await storage.get(STORAGE_KEYS.USER_PREFERENCES);
        if (preferences && typeof preferences.showMeta === 'boolean') {
          setShowMeta(preferences.showMeta);
        }
      } catch (error) {
        logger.tag('ChatScreen').error('Failed to load showMeta preference', error);
      }
    };
    loadShowMeta();
  }, []);

  // Save showMeta preference when changed
  const toggleShowMeta = async () => {
    const newValue = !showMeta;
    setShowMeta(newValue);
    try {
      const preferences = (await storage.get(STORAGE_KEYS.USER_PREFERENCES)) || {};
      preferences.showMeta = newValue;
      await storage.set(STORAGE_KEYS.USER_PREFERENCES, preferences);
    } catch (error) {
      logger.tag('ChatScreen').error('Failed to save showMeta preference', error);
    }
  };

  // Animate view transitions
  useEffect(() => {
    Animated.timing(viewAnimation, {
      toValue: showEmbeddedSelector ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showEmbeddedSelector]);

  // Animate server selector transitions
  useEffect(() => {
    Animated.timing(serverAnimation, {
      toValue: showEmbeddedServerSelector ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showEmbeddedServerSelector]);

  // Handle auto-connect project selector trigger
  const { shouldShowProjectSelector, shouldShowServerSelector } = props;
  useEffect(() => {
    const chatLogger = logger.tag('ChatScreen');
    if (shouldShowProjectSelector) {
      chatLogger.debug('shouldShowProjectSelector changed to true, showing embedded selector');
      setShowEmbeddedSelector(true);
    }
  }, [shouldShowProjectSelector]);

  // Handle auto-connect server selector trigger
  useEffect(() => {
    const chatLogger = logger.tag('ChatScreen');
    if (shouldShowServerSelector) {
      chatLogger.debug(
        'shouldShowServerSelector changed to true, showing embedded server selector',
      );
      setShowEmbeddedServerSelector(true);
    }
  }, [shouldShowServerSelector]);

  const {
    events,
    groupedUnclassifiedMessages,
    groupedAllMessages,
    isConnected,
    isConnecting,
    isServerReachable,
    error,
    inputUrl,
    setInputUrl,
    baseUrl,
    projects,
    projectSessions,
    sessionStatuses,
    selectedProject,
    selectedSession,
    sessionLoading,
    isSessionBusy,
    todos,
    providers,
    selectedModel,
    modelsLoading,
    onModelSelect,
    loadModels,
    deleteSession,
    connect,
    disconnectFromEvents,
    selectProject,
    selectSession,
    refreshSession,
    createSession,
    clearError,
    sendMessage,
    sendCommand,
    todoDrawerExpanded,
    setTodoDrawerExpanded,
    clearDebugMessages, // New function for clearing debug messages
    loadOlderMessages,
    refreshProjectSessions,
  } = props;

  // Handle session selection - close drawer on mobile after selection
  const handleSessionSelect = session => {
    selectSession(session);
    // Close drawer on mobile after session selection
    if (!isWideScreen) {
      setSessionDrawerVisible(false);
    }
  };

  const styles = StyleSheet.create({
    persistentSidebar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 320,
      zIndex: 100,
    },
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    safeAreaShiftedLeft: {
      marginLeft: 320,
    },
    safeAreaShiftedRight: {
      marginRight: 320,
    },
    debugSidebarContainer: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 320,
      zIndex: 1000,
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    fullScreen: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    inputBar: {
      backgroundColor: 'transparent',
      borderTopWidth: 0,
    },
    touchableArea: {
      // Area for keyboard dismiss
    },
    overlayContainer: {
      alignItems: 'center',
      pointerEvents: 'none',
    },
    errorContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.errorBackground,
      padding: 12,
      marginBottom: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.errorText,
      fontSize: 14,
      flex: 1,
    },
    errorClose: {
      color: theme.colors.errorText,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },

    sessionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    createButton: {
      backgroundColor: theme.colors.success,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    createButtonText: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
    },
    sessionScrollContainer: {
      paddingRight: 20,
    },
    sessionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 16,
      marginRight: 12,
      minWidth: 180,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    sessionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 4,
    },
    sessionDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    deleteButton: {
      position: 'absolute',
      top: 8,
      right: 8,
      padding: 4,
    },
    deleteButtonText: {
      fontSize: 12,
    },
  });

  return (
    <LinearGradient
      colors={theme.isDark ? ['#000000', '#000000'] : ['#ffffff', '#ffffff']}
      style={{ flex: 1 }}
    >
      <View style={{ flex: 1 }}>
        <SafeAreaView
          style={[
            styles.safeArea,
            { backgroundColor: 'transparent' },
            isWideScreen && sidebarVisible && styles.safeAreaShiftedLeft,
            isWideScreen && debugSidebarVisible && styles.safeAreaShiftedRight,
          ]}
          edges={['top', 'left', 'right']}
        >
          <StatusBar
            isConnected={isConnected}
            isConnecting={isConnecting}
            isServerReachable={isServerReachable}
            showInfoBar={showInfoBar}
            onToggleInfoBar={() => setShowInfoBar(!showInfoBar)}
            selectedProject={selectedProject}
            selectedSession={selectedSession}
            onProjectPress={() => setShowEmbeddedSelector(true)}
            onSessionPress={() => setSessionModalVisible(true)}
            projectSessions={projectSessions}
            onSessionSelect={selectSession}
            onRefreshSession={refreshSession}
            onCreateSession={createSession}
            deleteSession={deleteSession}
            baseUrl={inputUrl}
            isSessionBusy={isSessionBusy}
            groupedUnclassifiedMessages={groupedUnclassifiedMessages}
            groupedAllMessages={groupedAllMessages}
            events={events}
            onDebugPress={() => setDebugVisible(true)}
            onMenuPress={toggleSidebar}
            onReconnect={() => connect(inputUrl, { forceReconnect: true })}
            onDisconnect={disconnectFromEvents}
            sidebarVisible={sidebarVisible}
            isWideScreen={isWideScreen}
            showMeta={showMeta}
            onToggleMeta={toggleShowMeta}
          />
          {showInfoBar && (
            <ConnectionStatusBar
              isConnected={isConnected}
              isConnecting={isConnecting}
              onReconnect={() => connect(inputUrl, { forceReconnect: true })}
              onDisconnect={disconnectFromEvents}
              selectedProject={selectedProject}
              selectedSession={selectedSession}
              serverUrl={baseUrl}
              providers={providers}
              selectedModel={selectedModel}
              onModelSelect={onModelSelect}
              modelsLoading={modelsLoading}
              onFetchModels={loadModels}
              groupedUnclassifiedMessages={groupedUnclassifiedMessages}
              onDebugPress={() => {
                setDebugVisible(true);
                if (isWideScreen) {
                  setDebugSidebarVisible(true);
                }
              }}
              isSessionBusy={isSessionBusy}
            />
          )}
          <TodoDrawer
            todos={todos}
            expanded={todoDrawerExpanded}
            setExpanded={setTodoDrawerExpanded}
          />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <View
              style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: 'transparent',
              }}
            >
              <Animated.View
                style={[
                  styles.fullScreen,
                  {
                    transform: [
                      {
                        translateX: viewAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -screenWidth],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={showEmbeddedSelector ? 'none' : 'auto'}
              >
                <SessionMessageFilter
                  events={events}
                  selectedSession={selectedSession}
                  groupedUnclassifiedMessages={groupedUnclassifiedMessages}
                  onClearError={clearError}
                  allUnclassifiedMessages={groupedUnclassifiedMessages}
                  isThinking={isSessionBusy}
                  allMessages={groupedAllMessages}
                  onLoadOlderMessages={loadOlderMessages}
                  showMeta={showMeta}
                />
              </Animated.View>
              <Animated.View
                style={[
                  styles.fullScreen,
                  {
                    transform: [
                      {
                        translateX: viewAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [screenWidth, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={showEmbeddedSelector ? 'auto' : 'none'}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <EmbeddedProjectSelector
                    projects={projects}
                    onProjectPress={async project => {
                      await selectProject(project);
                      setShowEmbeddedSelector(false);
                      // Open sidebar on wide screens, drawer on mobile
                      if (isWideScreen) {
                        setSidebarVisible(true);
                      } else {
                        setSessionDrawerVisible(true);
                      }
                    }}
                  />
                </ScrollView>
              </Animated.View>
              <Animated.View
                style={[
                  styles.fullScreen,
                  {
                    height: screenHeight * 0.8,
                    bottom: 0,
                    position: 'absolute',
                    transform: [
                      {
                        translateY: serverAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [screenHeight * 0.8, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={showEmbeddedServerSelector ? 'auto' : 'none'}
              >
                <EmbeddedServerConnector
                  inputUrl={inputUrl}
                  setInputUrl={setInputUrl}
                  onConnect={url => connect(url, { autoSelect: false })}
                  isConnecting={isConnecting}
                  isConnected={isConnected}
                  onClose={() => setShowEmbeddedServerSelector(false)}
                />
              </Animated.View>
            </View>
            <View
              style={[
                styles.inputBar,
                {
                  paddingBottom:
                    keyboardState.isVisible && Platform.OS === 'ios'
                      ? 0
                      : Math.max(insets.bottom, 10),
                },
              ]}
            >
              <ChatInputBar
                inputUrl={inputUrl}
                onUrlChange={setInputUrl}
                onConnect={() => connect(inputUrl, { autoSelect: false })}
                onSendMessage={sendMessage}
                onSendCommand={sendCommand}
                isConnecting={isConnecting}
                isConnected={isConnected}
                isServerReachable={isServerReachable}
                baseUrl={baseUrl}
                selectedProject={selectedProject}
                onOpenServerModal={() => setShowEmbeddedServerSelector(true)}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* Modals */}
      <SessionListModal
        sessions={projectSessions}
        visible={sessionModalVisible}
        onSessionSelect={selectSession}
        onClose={() => setSessionModalVisible(false)}
        deleteSession={deleteSession}
      />

      {/* Debug modal/sidebar - conditionally rendered based on screen size */}
      {isWideScreen ? (
        // Wide screen: Right sidebar
        debugVisible && (
          <View style={styles.debugSidebarContainer}>
            <MessageDebugModal
              allMessages={groupedAllMessages}
              groupedUnclassifiedMessages={groupedUnclassifiedMessages}
              visible={debugVisible}
              onClose={() => {
                setDebugVisible(false);
                setDebugSidebarVisible(false);
              }}
              onClearMessages={clearDebugMessages}
            />
          </View>
        )
      ) : (
        // Mobile: Bottom sheet modal
        <MessageDebugModal
          allMessages={groupedAllMessages}
          groupedUnclassifiedMessages={groupedUnclassifiedMessages}
          visible={debugVisible}
          onClose={() => setDebugVisible(false)}
          onClearMessages={clearDebugMessages}
        />
      )}
      <LogModal visible={showLogs} onClose={() => setShowLogs(false)} />
      <ConnectionModal
        visible={false}
        onClose={() => {}}
        inputUrl={inputUrl}
        setInputUrl={setInputUrl}
        onConnect={() => connect(inputUrl, { autoSelect: false })}
        isConnecting={isConnecting}
        isConnected={isConnected}
      />

      {/* Overlays */}
      {/* <ThinkingIndicator isThinking={isSessionBusy} /> */}
      {/* Mobile sidebar (modal overlay) */}
      {!isWideScreen && (
        <SessionDrawer
          visible={sessionDrawerVisible}
          isPersistent={false}
          sessions={projectSessions}
          selectedSession={selectedSession}
          selectedProject={selectedProject}
          projects={projects}
          sessionStatuses={sessionStatuses}
          sessionLoading={sessionLoading}
          onProjectSelect={async project => await selectProject(project)}
          onSessionSelect={handleSessionSelect}
          deleteSession={deleteSession}
          createSession={createSession}
          onClose={() => setSessionDrawerVisible(false)}
          onToggleInfoBar={() => setShowInfoBar(!showInfoBar)}
          onDebugPress={() => setDebugVisible(true)}
          showMeta={showMeta}
          onToggleMeta={toggleShowMeta}
          refreshSessions={refreshProjectSessions}
        />
      )}

      {/* Edge swipe detector for opening drawer */}
      {!isWideScreen && !sessionDrawerVisible && (
        <EdgeSwipeDetector onOpenDrawer={() => setSessionDrawerVisible(true)} />
      )}
      {/* Wide screen persistent sidebar */}
      {isWideScreen && sidebarVisible && (
        <SessionDrawer
          isPersistent={true}
          sessions={projectSessions}
          selectedSession={selectedSession}
          selectedProject={selectedProject}
          projects={projects}
          sessionStatuses={sessionStatuses}
          sessionLoading={sessionLoading}
          onProjectSelect={async project => {
            await selectProject(project);
            // On wide screens, ensure sidebar opens if it was closed
            if (isWideScreen && !sidebarVisible) {
              setSidebarVisible(true);
            }
          }}
          onSessionSelect={session => {
            selectSession(session);
            // Keep sidebar open on wide screens for easy session switching
          }}
          deleteSession={deleteSession}
          createSession={createSession}
          onClose={() => setSidebarVisible(false)}
          onToggleInfoBar={() => setShowInfoBar(!showInfoBar)}
          onDebugPress={() => setDebugVisible(true)}
          showMeta={showMeta}
          onToggleMeta={toggleShowMeta}
          refreshSessions={refreshProjectSessions}
        />
      )}
    </LinearGradient>
  );
}
