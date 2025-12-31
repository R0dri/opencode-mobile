 import React, { useEffect, useState } from 'react';
 import { StyleSheet, View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, Keyboard } from 'react-native';
 import { SafeAreaView } from 'react-native-safe-area-context';

import StatusBar from '@/components/layout/StatusBar';
import ConnectionStatusBar from '@/components/layout/ConnectionStatusBar';
import SessionDrawer from '@/components/SessionDrawer';
import SessionMessageFilter from '@/components/SessionMessageFilter';
import ProjectList from '@/components/ProjectList';
import SessionList from '@/components/SessionList';
import ConnectionInput from '@/components/forms/ConnectionInput';
import AppLogViewer from '@/components/AppLogViewer';
import { getProjectDisplayName } from '@/features';
import UnclassifiedMessagesScreen from '@/components/UnclassifiedMessagesScreen';



import SendIcon from '@/components/common/PaperPlaneIcon';
import TodoStatusIcon from '@/components/common/TodoStatusIcon';
import SessionBusyIndicator from '@/components/common/SessionBusyIndicator';
import ThinkingIndicator from '@/components/ThinkingIndicator';
import EventList from '@/components/EventList';
import ModelSelector from '@/components/ModelSelector';
import NotificationSettings from '@/components/NotificationSettings';
import ProjectSelectionModal from '@/components/modals/ProjectSelectionModal';
import SessionSelectionModal from '@/components/modals/SessionSelectionModal';

import LogModal from '@/components/modals/LogModal';
import ConnectionModal from '@/components/modals/ConnectionModal';
import BreadcrumbNavigation from '@/components/status/BreadcrumbNavigation';
import ConnectionStatusIndicator from '@/components/status/ConnectionStatusIndicator';
import SessionDropdown from '@/components/status/SessionDropdown';
import StatusBarActions from '@/components/status/StatusBarActions';
import SessionStatusIndicator from '@/components/SessionStatusIndicator';
import TodoDrawer from '@/components/TodoDrawer';
import BreadcrumbSlider from '@/components/BreadcrumbSlider';
 import ServerConnectionInfoBar from '@/components/ServerConnectionInfoBar';
 import { useTheme } from '@/shared/components/ThemeProvider';


export default function EventScreen(props) {
  const theme = useTheme();

   const [showLogs, setShowLogs] = useState(false);
   const [showInfoBar, setShowInfoBar] = useState(false);
   const [debugVisible, setDebugVisible] = useState(false);
   const [sessionModalVisible, setSessionModalVisible] = useState(false);
   const [showEmbeddedSelector, setShowEmbeddedSelector] = useState(false);
     const [sessionDrawerVisible, setSessionDrawerVisible] = useState(false);
     const [sidebarVisible, setSidebarVisible] = useState(false); // For wide screens
     const [debugSidebarVisible, setDebugSidebarVisible] = useState(false); // For debug sidebar
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
   const [viewAnimation] = useState(new Animated.Value(0));
   const { width, height: screenHeight } = Dimensions.get('window');
   const [keyboardState, setKeyboardState] = useState({
     isVisible: false,
     isFloating: false,
     height: 0,
     position: {}
   });
    const isWideScreen = screenWidth >= 768;

    // Listen for screen dimension changes
    useEffect(() => {
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setScreenWidth(window.width);
      });
      return () => subscription?.remove();
    }, []);

    // Unified sidebar toggle function
    const toggleSidebar = () => {
      if (isWideScreen) {
        setSidebarVisible(!sidebarVisible);
      } else {
        setSessionDrawerVisible(!sessionDrawerVisible);
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

    // Keyboard type detection (floating vs docked)
    useEffect(() => {
      const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
        const { screenY, height, screenX, width: keyboardWidth } = e.endCoordinates;
        // Docked keyboard is typically at bottom of screen
        // Floating keyboard appears higher up
        const isFloating = screenY < screenHeight - height - 50; // 50pt tolerance

        setKeyboardState({
          isVisible: true,
          isFloating,
          height,
          position: { x: screenX, y: screenY, width: keyboardWidth, height }
        });

        console.log('Keyboard detected:', { isFloating, height, screenY, screenHeight });
      });

      const hideListener = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardState(prev => ({ ...prev, isVisible: false }));
      });

      return () => {
        showListener.remove();
        hideListener.remove();
      };
    }, [screenHeight]);


   // Handle auto-connect project selector trigger
   const { shouldShowProjectSelector } = props;
   useEffect(() => {
     console.log('EventScreen: shouldShowProjectSelector changed to:', shouldShowProjectSelector);
     if (shouldShowProjectSelector) {
       console.log('EventScreen: Setting showEmbeddedSelector to true');
       setShowEmbeddedSelector(true);
     }
    }, [shouldShowProjectSelector]);


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
    todoDrawerExpanded,
    setTodoDrawerExpanded,
  } = props;

   // Embedded project selector component
   const EmbeddedProjectSelector = ({ projects, onProjectSelect }) => (
     <View style={styles.selectorContainer}>
       <Text style={styles.selectorTitle}>Select a Project</Text>
       {projects.map(project => (
         <TouchableOpacity
           key={project.id}
           style={styles.projectCard}
              onPress={() => {

                onProjectSelect(project);

                setSessionDrawerVisible(true);

              }}
         >
            <Text style={styles.projectName}>{getProjectDisplayName(project.worktree)}</Text>
            <Text style={styles.projectPath}>{project.worktree || project.directory || 'Unknown path'}</Text>
            <View style={styles.projectFooter}>
              <Text style={styles.projectDate}>
                {project.time?.created ? new Date(project.time.created).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
         </TouchableOpacity>
       ))}
     </View>
    );

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
      backgroundColor: theme.colors.background,
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
       backgroundColor: theme.colors.background,
     },
      fullScreen: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
      inputBar: {
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
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
      backgroundColor: '#ffebee',
      padding: 12,
      marginBottom: 12,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#f44336',
    },
    errorText: {
      color: '#d32f2f',
      fontSize: 14,
      flex: 1,
    },
    errorClose: {
      color: '#d32f2f',
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    // Embedded selector styles
    selectorContainer: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 20,
      marginVertical: 10,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    selectorTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 12,
    },
    projectScrollContainer: {
      paddingBottom: 20,
    },
    projectCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    projectName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
      marginBottom: 8,
    },
    projectPath: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
    },
    projectFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    projectId: {
      fontSize: 12,
      color: theme.colors.textMuted,
      fontFamily: 'monospace',
    },
    projectDate: {
      fontSize: 12,
      color: theme.colors.textMuted,
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
    <>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <SafeAreaView style={[
          styles.safeArea,
          isWideScreen && sidebarVisible && styles.safeAreaShiftedLeft,
          isWideScreen && debugSidebarVisible && styles.safeAreaShiftedRight
        ]}>
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
           />
          {showInfoBar && (
             <ConnectionStatusBar
               isConnected={isConnected}
               isConnecting={isConnecting}
               onReconnect={() => connect(inputUrl, { forceReconnect: true })}
               onDisconnect={disconnectFromEvents}
               selectedProject={selectedProject}
               selectedSession={selectedSession}
               serverUrl={inputUrl}
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
            <KeyboardAvoidingView
             style={{ flex: 1 }}
             behavior="padding"
           >
             <View style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
               <Animated.View
                 style={[styles.fullScreen, {
                   transform: [{
                     translateX: viewAnimation.interpolate({
                       inputRange: [0, 1],
                       outputRange: [0, -width],
                     }),
                   }],
                 }]}
                 pointerEvents={showEmbeddedSelector ? 'none' : 'auto'}
               >
                 <SessionMessageFilter
                  events={events}
                  selectedSession={selectedSession}
                   groupedUnclassifiedMessages={groupedUnclassifiedMessages}
                   onClearError={clearError}
                   allMessages={groupedAllMessages}
                  isThinking={isSessionBusy}
                 />
               </Animated.View>
               <Animated.View
                 style={[styles.fullScreen, {
                   transform: [{
                     translateX: viewAnimation.interpolate({
                       inputRange: [0, 1],
                       outputRange: [width, 0],
                     }),
                   }],
                 }]}
                 pointerEvents={showEmbeddedSelector ? 'auto' : 'none'}
               >
                 <ScrollView
                   style={{ flex: 1 }}
                   contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 10 }}
                   keyboardShouldPersistTaps="handled"
                 >
                   <EmbeddedProjectSelector
                     projects={projects}
                       onProjectSelect={async (project) => {
                         console.log('EventScreen: Project selected:', project.name);
                         await selectProject(project);
                         setShowEmbeddedSelector(false);
                         // Open sidebar on wide screens, modal on mobile
                         if (isWideScreen) {
                           setSidebarVisible(true);
                         } else {
                           setSessionDrawerVisible(true);
                         }
                       }}
                   />
                 </ScrollView>
               </Animated.View>
             </View>
             <View style={styles.inputBar}>
               <ConnectionInput
                 inputUrl={inputUrl}
                 onUrlChange={setInputUrl}
                 onConnect={() => connect(inputUrl, { autoSelect: false })}
                 onSendMessage={sendMessage}
                 isConnecting={isConnecting}
                 isConnected={isConnected}
                 isServerReachable={isServerReachable}
               />
             </View>
           </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

       {/* Modals */}
       <SessionList
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
             <UnclassifiedMessagesScreen
               allMessages={groupedAllMessages}
               groupedUnclassifiedMessages={groupedUnclassifiedMessages}
               visible={debugVisible}
               onClose={() => {
                 setDebugVisible(false);
                 setDebugSidebarVisible(false);
               }}
             />
           </View>
         )
       ) : (
         // Mobile: Bottom sheet modal
         <UnclassifiedMessagesScreen
           allMessages={groupedAllMessages}
           groupedUnclassifiedMessages={groupedUnclassifiedMessages}
           visible={debugVisible}
           onClose={() => setDebugVisible(false)}
         />
       )}
      <LogModal
        visible={showLogs}
        onClose={() => setShowLogs(false)}
      />
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
          {sessionDrawerVisible && !isWideScreen && (
               <SessionDrawer
                 sessions={projectSessions}
                 selectedSession={selectedSession}
                 selectedProject={selectedProject}
                 projects={projects}
                 sessionStatuses={sessionStatuses}
                sessionLoading={sessionLoading}
                onProjectSelect={async (project) => await selectProject(project)}
               onSessionSelect={selectSession}
               deleteSession={deleteSession}
               createSession={createSession}
               onClose={() => setSessionDrawerVisible(false)}
             />
          )}
         {/* Wide screen persistent sidebar */}
         {isWideScreen && sidebarVisible && (
           <View style={styles.persistentSidebar}>
              <SessionDrawer
                sessions={projectSessions}
                selectedSession={selectedSession}
                selectedProject={selectedProject}
                projects={projects}
                sessionStatuses={sessionStatuses}
                sessionLoading={sessionLoading}
                onProjectSelect={async (project) => {
                  await selectProject(project);
                  // On wide screens, ensure sidebar opens if it was closed
                  if (isWideScreen && !sidebarVisible) {
                    setSidebarVisible(true);
                  }
                }}
               onSessionSelect={(session) => {
                 selectSession(session);
                 // Keep sidebar open on wide screens for easy session switching
               }}
               deleteSession={deleteSession}
               createSession={createSession}
               onClose={() => setSidebarVisible(false)}
               isPersistent={true}
             />
           </View>
         )}
     </>
   );
  }

