// SSE orchestrator - combines all feature modules
import { useState, useCallback, useEffect } from 'react';
import {
  useSSEConnection,
  useConnectionManager,
  useAppState,
  useMessageProcessing,
  useEventManager,
  useProjectManager,
  useModelManager,
  useTodoManager,
  useNotificationManager
} from '@/features';
import { sendMessageToSession, clearSession, hasActiveSession, setCurrentSession, deleteSession } from '@/features';
import { generateMessageId } from '@/features/messaging/utils/messageIdGenerator';
import { storage } from '@/shared/services/storage';
import { useSessionStatus } from '@/shared/hooks/useSessionStatus';

export const useSSEOrchestrator = (initialUrl = 'http://10.1.1.122:63425') => {
  // Core state
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [baseUrl, setBaseUrl] = useState(null);
  const [currentAgentMode, setCurrentAgentMode] = useState('build');
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [shouldShowProjectSelector, setShouldShowProjectSelector] = useState(false);

   // Feature modules
   const projects = useProjectManager(baseUrl);

   // Heartbeat callback that only runs when a project is selected
   const heartbeatCallback = useCallback(() => {
     if (projects.selectedProject) {
       projects.refreshProjectSessions();
     }
   }, [projects]);

   const connection = useSSEConnection(baseUrl, heartbeatCallback);
   const connectionMgr = useConnectionManager();
   const appState = useAppState(null); // Will be updated with selected session

   const messaging = useMessageProcessing();
   const models = useModelManager(baseUrl, projects.selectedProject);
    const todos = useTodoManager(baseUrl, projects.selectedSession?.id, projects.selectedProject);
   const sessionStatus = useSessionStatus(projects.selectedSession);

   const handleDeepLink = useCallback(async (deepLinkData) => {
     console.debug('[DeepLink] Processing:', deepLinkData.type);
     const { serverUrl, projectPath, sessionId } = deepLinkData;

     if (!connection.isConnected && serverUrl) {
       try {
         await connect(serverUrl, { autoSelect: false });
       } catch (error) {
         console.error('[DeepLink] Connect failed:', error);
         return;
       }
     }

     if (projectPath && projects.projects) {
       const project = projects.projects.find(p => p.path === projectPath);
       if (project) {
         await projects.selectProject(project);
       }
     }

     if (sessionId && projects.projectSessions) {
       const session = projects.projectSessions.find(s => s.id === sessionId);
       if (session) {
         projects.selectSession(session);
         if (baseUrl) {
           messaging.clearEvents();
           messaging.loadMessages(baseUrl, session.id, projects.selectedProject);
         }
       }
     }
   }, [connection.isConnected, connect, projects, baseUrl, messaging]);

   const notifications = useNotificationManager({
     serverBaseUrl: baseUrl,
     onDeepLink: handleDeepLink,
   });

  // Debug: Log projects changes
  useEffect(() => {
    console.debug('useSSE projects updated:', projects.projects?.length || 0, 'projects');
  }, [projects.projects]);

  // Show embedded project selector when projects are loaded but no project is selected
  useEffect(() => {
    if (projects.projects && projects.projects.length > 0 && !projects.selectedProject && connection.isConnected) {
      console.debug('useSSE: Projects loaded but no project selected - showing embedded selector');
      setShouldShowProjectSelector(true);
    }
  }, [projects.projects, projects.selectedProject, connection.isConnected]);

  // Unified connect function
  const connect = useCallback(async (url, options = {}) => {
    const { autoSelect = false, forceReconnect = false } = options;

    try {
      // Disconnect if forcing reconnect
      if (forceReconnect && connection.isConnected) {
        disconnectFromEvents();
      }

      // Validate and connect
      const cleanUrl = await connectionMgr.validateAndConnect(url);
      setBaseUrl(cleanUrl);
      setInputUrl(url);

      // Auto-select saved project/session if requested
      if (autoSelect) {
        try {
          const savedProject = await storage.get('lastSelectedProject');
          const savedSession = await storage.get('lastSelectedSession');

          if (savedProject) {
            console.debug('📁 Auto-selecting saved project:', savedProject.name);
            await projects.selectProject(savedProject);

            if (savedSession) {
              console.debug('💬 Auto-selecting saved session:', savedSession.title);
              await projects.selectSession(savedSession);
            }
          } else {
            console.debug('ℹ️ No saved project to auto-select - will show project selector');
            setShouldShowProjectSelector(true);
          }
        } catch (error) {
          console.error('❌ Error during auto-selection:', error);
        }
      }

      // Save successful connection URL
      await storage.set('lastConnectedUrl', url);

    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  }, [connectionMgr, projects]);

  // Load saved URL on mount
  useEffect(() => {
    const loadSavedUrl = async () => {
      const savedUrl = await storage.get('lastConnectedUrl');
      if (savedUrl) {
        setInputUrl(savedUrl);
      }
    };
    loadSavedUrl();
  }, []);

  // Auto-connect on app start if we have a saved URL
  useEffect(() => {
    const autoConnect = async () => {
      try {
        const savedUrl = await storage.get('lastConnectedUrl');
        console.debug('Checking for saved connection:', savedUrl);

        if (savedUrl && inputUrl === savedUrl && !autoConnectAttempted) {
          console.debug('\n===== AUTO-CONNECT ATTEMPT =====');
          console.debug('Saved URL:', savedUrl);
          console.debug('Connected:', connection.isConnected);
          console.debug('Input URL:', inputUrl);
          console.debug('================================\n');

          setAutoConnectAttempted(true);

            try {
              // Connect and load projects if not already connected
              if (!connection.isConnected) {
                console.debug('Establishing connection...');
                await connect(savedUrl, { autoSelect: false }); // Just connect, don't auto-select
              } else {
                console.debug('Already connected, loading projects...');
                // Just load projects and try auto-selection
                await projects.loadProjects();

                const savedProject = await storage.get('lastSelectedProject');
                const savedSession = await storage.get('lastSelectedSession');

                if (savedProject) {
                  console.debug('Auto-selecting saved project:', savedProject.name);
                  await projects.selectProject(savedProject);
                  console.debug('Project auto-selected, user can now choose session manually');
                } else {
                  console.debug('No saved project to auto-select - triggering project selector');
                  setShouldShowProjectSelector(true);
                }

                console.debug('\n===== AUTO-CONNECT COMPLETED =====\n');
              }
          } catch (error) {
            console.error('Auto-connect failed:', error);
            setAutoConnectAttempted(false); // Allow retry
          }
        } else {
          console.debug('Skipping auto-connect:', {
            hasSavedUrl: !!savedUrl,
            urlMatches: inputUrl === savedUrl,
            alreadyAttempted: autoConnectAttempted,
            isConnected: connection.isConnected
          });
        }
      } catch (error) {
        console.error('❌ Error during auto-connect check:', error);
      }
    };

    // Small delay to ensure everything is initialized
    const timeoutId = setTimeout(autoConnect, 500);
    return () => clearTimeout(timeoutId);
  }, [inputUrl, autoConnectAttempted, connection.isConnected, projects, connect]);

  // Event manager for SSE messages
  const eventManager = useEventManager(
    (message) => {
      // Handle session status messages
      if (message.payload?.type === 'session.status') {
        sessionStatus.handleSessionStatus(message);
        return; // Don't process as regular message
      }

      // Handle regular messages
      const processedMessage = messaging.processMessage(message, currentAgentMode);
      messaging.addEvent(processedMessage);
    },
    projects.selectedSession
  );

  // Disconnect from server
  const disconnectFromEvents = useCallback(() => {
    connection.disconnect();
    messaging.clearEvents();
    projects.selectProject(null);
    setBaseUrl(null);
    clearSession();
  }, [connection, messaging, projects]);

  // Send message
  const sendMessage = useCallback(async (messageText, agent = {name: 'build'}) => {
    if (!projects.selectedSession) {
      throw new Error('No session selected');
    }

    setCurrentSession(projects.selectedSession, baseUrl);

    if (!connection.isConnected) {
      throw new Error('Not connected');
    }

    if (!messageText || !messageText.trim()) {
      throw new Error('Cannot send empty message');
    }

    const agentName = typeof agent === 'string' ? agent : agent.name;
    setCurrentAgentMode(agentName);

    // Auto-select model if agent has default model
    if (typeof agent === 'object' && agent.model) {
      await models.selectModel(agent.model.providerID, agent.model.modelID);
    }

    // Add sent message to UI immediately
    const sentMessageId = generateMessageId();
    messaging.addEvent({
      id: sentMessageId,
      type: 'sent',
      category: 'sent',
      message: messageText,
      projectName: 'Me',
      icon: 'User',
      timestamp: new Date().toISOString(),
      mode: agentName,
      sessionId: projects.selectedSession?.id
    });

    try {
      // Send to server asynchronously
      const response = await sendMessageToSession(messageText, agentName, projects.selectedProject, models.selectedModel, true);

      // Update UI state
      todos.setExpanded(false);

      return response;
    } catch (error) {
      console.error('Message send failed:', error);

      // Remove only the failed message from UI instead of clearing all events
      messaging.removeEvent(sentMessageId);

      throw error;
    }
  }, [connection.isConnected, messaging, projects.selectedProject, models, todos, currentAgentMode]);

  // Clear error (placeholder)
  const clearError = useCallback(() => {
    // Error state management would be added here
  }, []);

  // Load models
  const loadModels = useCallback(async () => {
    await models.loadModels();
  }, [models]);

  // Select model
  const onModelSelect = useCallback(async (providerId, modelId) => {
    await models.selectModel(providerId, modelId);
  }, [models]);

  // Session management
  const selectProject = useCallback(async (project) => {
    await projects.selectProject(project);
  }, [projects]);

  const selectSession = useCallback((session) => {
    console.debug('useSSE: selectSession called with', session?.title);
    projects.selectSession(session);
    console.debug('useSSE: after selectSession, selectedSession is', projects.selectedSession?.title);
    // Clear previous messages and load new session messages
    if (session && baseUrl) {
      messaging.clearEvents();
      messaging.loadMessages(baseUrl, session.id, projects.selectedProject);
    } else {
      // Clear events if no session selected
      messaging.clearEvents();
    }
  }, [projects, messaging, baseUrl]);

  const createSession = useCallback(async () => {
    return await projects.createSession();
  }, [projects]);

  const deleteSessionById = useCallback(async (sessionId) => {
    await projects.deleteSession(sessionId);
  }, [projects]);

  const refreshSession = useCallback(() => {
    if (projects.selectedSession && baseUrl) {
      // Clear events before refreshing to avoid duplicates
      messaging.clearEvents();
      messaging.loadMessages(baseUrl, projects.selectedSession.id, projects.selectedProject);
      todos.loadTodos();
    }
  }, [projects.selectedSession, baseUrl, messaging, todos, projects.selectedProject]);

   // Clear debug messages
   const clearDebugMessages = useCallback(() => {
     messaging.clearEvents();
   }, [messaging]);

   // Return unified interface (backward compatible)
   return {
      // Connection state
      events: messaging.events,
      unclassifiedMessages: messaging.unclassifiedMessages,
      groupedUnclassifiedMessages: messaging.groupedUnclassifiedMessages,
      allMessages: messaging.allMessages,
      groupedAllMessages: messaging.groupedAllMessages,
      isConnected: connection.isConnected,
      isConnecting: connection.isConnecting,
      isServerReachable: connectionMgr.isServerReachable,
      error: connection.error,
      inputUrl,
      setInputUrl,
      baseUrl,

       // Projects & Sessions
       projects: projects.projects,
       projectSessions: projects.projectSessions,
       sessionStatuses: projects.sessionStatuses,
       selectedProject: projects.selectedProject,
       selectedSession: projects.selectedSession,
       sessionLoading: projects.sessionLoading,
      isSessionBusy: sessionStatus.isThinking,

     // Models
     providers: models.providers,
     selectedModel: models.selectedModel,
     modelsLoading: models.loading,

     // Todos
     todos: todos.todos,
     todoDrawerExpanded: todos.expanded,
     setTodoDrawerExpanded: todos.setExpanded,

     // UI State
     shouldShowProjectSelector,

     // Actions
     connect,
     disconnectFromEvents,
     sendMessage,
     clearError,
     loadModels,
     onModelSelect,
     selectProject,
     selectSession,
     refreshSession,
      createSession,
      deleteSession: deleteSessionById,
      clearDebugMessages,
      sendTestNotification: notifications.sendTestNotification,
   };
};