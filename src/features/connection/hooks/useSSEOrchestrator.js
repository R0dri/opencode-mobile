// SSE orchestrator - combines all feature modules
import { useState, useCallback, useEffect, useRef } from 'react';

import { useSSEConnection } from './useSSEConnection';
import { useConnectionManager } from './useConnectionManager';
import { useAppState } from './useAppState';
import { sseService } from '../services/sseService';

import { useMessageProcessing, useEventManager } from '@/features/messaging';
import { useProjectManager } from '@/features/projects';
import { useModelManager } from '@/features/models';
import { useTodoManager } from '@/features/todos';
import { useNotificationManager } from '@/features/notifications';
import notificationService from '@/features/notifications/services/notificationService';
import serverStorage from '@/features/servers/services/serverStorage';

import {
  sendMessageToSession,
  sendCommandToSession,
} from '@/features/sessions/services/sessionService';

import { generateMessageId } from '@/features/messaging/utils/messageIdGenerator';
import { storage } from '@/shared/services/storage';
import { useSessionStatus } from '@/features/sessions/hooks/useSessionStatus';
import { logger } from '@/shared/services/logger';

const sseLogger = logger.tag('SSE');
const connectionLogger = logger.tag('Connection');
const projectLogger = logger.tag('Project');
const sessionLogger = logger.tag('Session');
const deepLinkLogger = logger.tag('DeepLink');

export const useSSEOrchestrator = (initialUrl = null) => {
  // Core state
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [baseUrl, setBaseUrl] = useState(null);
  const [currentAgentMode, setCurrentAgentMode] = useState('build');
  const [autoConnectAttempted, setAutoConnectAttempted] = useState(false);
  const [shouldShowProjectSelector, setShouldShowProjectSelector] = useState(false);
  const [shouldShowServerSelector, setShouldShowServerSelector] = useState(false);

  // Queue for deep links that arrive before projects are loaded
  const pendingDeepLinkRef = useRef(null);

  // Feature modules
  const projects = useProjectManager(baseUrl);

  // Heartbeat callback that only runs when a project is selected
  const heartbeatCallback = useCallback(() => {
    if (projects.selectedProject) {
      projects.refreshProjectSessions();
    }
  }, [projects]);

  // Connection with enhanced state machine
  const connection = useSSEConnection(baseUrl, {
    heartbeatCallback,
    onStateChange: (newState, oldState) => {
      connectionLogger.debug('Connection state changed', { from: oldState, to: newState });
    },
    onError: errorInfo => {
      connectionLogger.warn('Connection error', errorInfo);
    },
  });

  const connectionMgr = useConnectionManager();

  // App lifecycle with reconnection support
  const appState = useAppState({
    onForeground: async () => {
      connectionLogger.debug('App came to foreground');

      if (baseUrl && connection.isDisconnected && !connection.isFailed) {
        connectionLogger.debug('Reconnecting on app foreground');
        connection.connect();
      }

      if (baseUrl && projects.selectedSession && messaging.lastReceivedMessageId) {
        try {
          connectionLogger.debug('Loading missed messages on foreground', {
            sessionId: projects.selectedSession.id,
            lastMessageId: messaging.lastReceivedMessageId,
          });

          const missedMessages = await messaging.loadMessagesSince(
            baseUrl,
            projects.selectedSession.id,
            projects.selectedProject,
            messaging.lastReceivedMessageId,
          );

          if (missedMessages && missedMessages.length > 0) {
            connectionLogger.debug('Adding missed messages to event list', {
              count: missedMessages.length,
            });
            missedMessages.forEach(msg => messaging.addEvent(msg));
          }

          if (sessionStatus.handleSessionStatus) {
            connectionLogger.debug('Refreshing session status on foreground');
            await projects.refreshProjectSessions();
          }

          connectionLogger.debug('Refreshing project sessions on foreground');
          await projects.refreshProjectSessions();

          connectionLogger.debug('Foreground recovery complete', {
            missedMessagesCount: missedMessages?.length || 0,
          });
        } catch (error) {
          connectionLogger.error('Foreground recovery failed', error);
        }
      }
    },
    onBackground: () => {
      connectionLogger.debug('App went to background');
    },
  });

  const messaging = useMessageProcessing();
  const models = useModelManager(baseUrl, projects.selectedProject);
  const todos = useTodoManager(baseUrl, projects.selectedSession?.id, projects.selectedProject);
  const sessionStatus = useSessionStatus(
    projects.selectedSession,
    baseUrl,
    projects.selectedProject,
    messaging,
  );

  const disconnectFromEvents = useCallback(() => {
    connection.disconnect();
    messaging.clearEvents();
    projects.selectProject(null);
    setBaseUrl(null);
    // Show project selector on disconnect so user can re-select
    setShouldShowProjectSelector(true);
  }, [connection, messaging, projects]);

  const connect = useCallback(
    async (url, options = {}) => {
      const { autoSelect = false, forceReconnect = false } = options;

      try {
        if (forceReconnect && connection.isConnected) {
          disconnectFromEvents();
        }

        const cleanUrl = await connectionMgr.validateAndConnect(url);
        if (!cleanUrl) {
          connectionLogger.warn('Connection validation failed');
          return;
        }

        setInputUrl(url);
        setBaseUrl(cleanUrl);
        connection.connect({ url: cleanUrl, skipHealthCheck: true });

        await new Promise(resolve => setTimeout(resolve, 100));

        if (connection.isFailed) {
          connectionLogger.warn('SSE connection failed');
          return;
        }

        setBaseUrl(cleanUrl);

        if (autoSelect) {
          try {
            const savedProject = await storage.get('lastSelectedProject');
            const savedSession = await storage.get('lastSelectedSession');

            if (savedProject) {
              projectLogger.debug('Auto-selecting saved project', { name: savedProject.name });
              await projects.selectProject(savedProject);

              if (savedSession) {
                sessionLogger.debug('Auto-selecting saved session', { title: savedSession.title });
                await projects.selectSession(savedSession);
              }
            } else {
              projectLogger.debug('No saved project, showing selector');
              setShouldShowProjectSelector(true);
            }
          } catch (error) {
            connectionLogger.warn('Auto-selection error', { error: error.message });
          }
        }

        await storage.set('lastConnectedUrl', url);
      } catch (error) {
        connectionLogger.warn('Connection error', { error: error.message });
      }
    },
    [
      connectionMgr,
      projects,
      connection,
      connection.isConnected,
      connection.isFailed,
      disconnectFromEvents,
    ],
  );

  const handleDeepLink = useCallback(
    async deepLinkData => {
      deepLinkLogger.debug('Processing deep link', {
        type: deepLinkData.type,
        hasProjects: !!projects.projects?.length,
        serverUrl: deepLinkData.serverUrl,
        projectPath: deepLinkData.projectPath,
        sessionId: deepLinkData.sessionId,
      });

      const { serverUrl, projectPath, sessionId } = deepLinkData;

      // Validate required deep link fields
      if (!serverUrl) {
        deepLinkLogger.warn('Deep link missing serverUrl');
        return;
      }

      const isDifferentServer = serverUrl && serverUrl !== baseUrl;

      // If connecting to different server, validate session exists first
      if (isDifferentServer && sessionId) {
        try {
          deepLinkLogger.debug('Validating session on new server', { serverUrl, sessionId });
          const cleanUrl = serverUrl.replace(/\/global\/event$/, '').replace(/\/$/, '');
          const testUrl = `${cleanUrl}/session/${sessionId}`;
          deepLinkLogger.debug('Session validation URL', {
            testUrl,
            isConnected: connection.isConnected,
            currentBaseUrl: baseUrl,
          });
          const response = await fetch(testUrl);
          deepLinkLogger.debug('Session validation response', {
            status: response.status,
            ok: response.ok,
          });
          if (!response.ok) {
            deepLinkLogger.warn('Session not found on new server', {
              status: response.status,
              sessionId,
            });
            return;
          }
          const sessionData = await response.json();
          deepLinkLogger.debug('Session validated', { exists: !!sessionData });
        } catch (error) {
          deepLinkLogger.error('Failed to validate session on new server', error);
          return;
        }
      }

      deepLinkLogger.debug('After validation, checking state', {
        isConnected: connection.isConnected,
        isDifferentServer,
        hasProjects: !!projects.projects?.length,
        baseUrl,
      });

      // If projects aren't loaded yet, queue deep link for later
      if (!projects.projects || projects.projects.length === 0) {
        deepLinkLogger.debug('Projects not loaded yet, queuing deep link');
        pendingDeepLinkRef.current = deepLinkData;
        return;
      }

      // Clear queued deep link since we're processing now
      pendingDeepLinkRef.current = null;

      if (!connection.isConnected) {
        try {
          await connect(serverUrl, { autoSelect: false });
        } catch (error) {
          connectionLogger.error('Deep link connection failed', error);
          return;
        }
      } else if (isDifferentServer) {
        try {
          disconnectFromEvents();
          await connect(serverUrl, { autoSelect: false });
        } catch (error) {
          connectionLogger.error('Deep link connection failed', error);
          return;
        }
      }

      if (projectPath) {
        const project = projects.projects.find(p => p.path === projectPath);
        if (project) {
          deepLinkLogger.debug('Found project from deep link', { path: projectPath });
          await projects.selectProject(project);
        } else {
          deepLinkLogger.debug('Project not found from deep link', {
            path: projectPath,
            availableProjects: projects.projects.map(p => p.path),
          });
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
    },
    [connection.isConnected, connect, projects, baseUrl, messaging],
  );

  const notifications = useNotificationManager({
    serverBaseUrl: baseUrl,
    onDeepLink: handleDeepLink,
    onUrlUpdate: async newUrl => {
      connectionLogger.info('URL update notification received', { newUrl });

      await storage.set('lastConnectedUrl', newUrl);
      setInputUrl(newUrl);
      setBaseUrl(null);
      disconnectFromEvents();

      try {
        await connect(newUrl, { autoSelect: false });
        connectionLogger.info('Reconnected to new URL from notification');
      } catch (error) {
        connectionLogger.error('Failed to reconnect to new URL', error);
      }
    },
  });

  // Debug: Log projects changes
  useEffect(() => {
    projectLogger.debug('Projects updated', { count: projects.projects?.length || 0 });
  }, [projects.projects]);

  // Process queued deep link when projects are loaded
  useEffect(() => {
    if (projects.projects && projects.projects.length > 0 && pendingDeepLinkRef.current) {
      deepLinkLogger.debug('Projects loaded, processing queued deep link');
      const queuedDeepLink = pendingDeepLinkRef.current;
      pendingDeepLinkRef.current = null;
      handleDeepLink(queuedDeepLink);
    }
  }, [projects.projects, handleDeepLink]);

  // Show embedded project selector when projects are loaded but no project is selected
  useEffect(() => {
    if (projects.projects && projects.projects.length > 0 && !projects.selectedProject) {
      projectLogger.debug('Projects loaded, showing embedded project selector');
      setShouldShowProjectSelector(true);
    }
  }, [projects.projects, projects.selectedProject]);

  useEffect(() => {
    const init = async () => {
      try {
        const savedUrl = await storage.get('lastConnectedUrl');
        if (savedUrl) {
          connectionLogger.debug('Found saved URL, checking health', { url: savedUrl });

          // Step 1: Check if server is healthy
          const health = await sseService.checkHealth(savedUrl);
          if (!health.healthy) {
            connectionLogger.warn('Server not healthy, showing server selector', { url: savedUrl });
            setShouldShowServerSelector(true);
            return;
          }

          connectionLogger.debug('Server healthy, starting parallel connections', {
            url: savedUrl,
          });

          const cleanUrl = savedUrl.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
          setInputUrl(savedUrl);
          setBaseUrl(cleanUrl);
          setAutoConnectAttempted(true);

          // Step 2: Parallel - SSE connect + load projects
          // SSE will connect without health check (already validated)
          connection.connect({ url: cleanUrl, skipHealthCheck: true });

          // Projects will load reactively since baseUrl is set
          // Force an immediate load to parallelize with SSE connection
          projects.loadProjects();
        }
      } catch (error) {
        connectionLogger.error('Failed to initialize connection', error);
      }
    };

    init();
  }, []); // Run once at mount

  // Load servers once at mount (non-blocking)
  useEffect(() => {
    serverStorage.loadServers().catch(err => {
      connectionLogger.warn('Server storage load failed', { error: err.message });
    });
  }, []);

  // Event manager for SSE messages
  const eventManager = useEventManager(message => {
    sseLogger.debugCtx('SSE_FLOW', 'Received SSE message', { type: message.payload?.type });

    if (message.payload?.type === 'session.status' || message.payload?.type === 'session.idle') {
      sseLogger.debugCtx('SESSION_MANAGEMENT', 'Handling session status/idle');
      sessionStatus.handleSessionStatus(message);
    }

    const processedMessage = messaging.processMessage(message, currentAgentMode);

    if (processedMessage && !processedMessage.isPartial) {
      const rawAgent = processedMessage.rawData?.payload?.properties?.info?.agent;
      const hasAgent = !!rawAgent;

      if (processedMessage.role === 'user') {
        if (hasAgent) {
          sseLogger.debugCtx(
            'SSE_FLOW',
            'Skipping contradictory message (role=user but has agent)',
            {
              messageId: processedMessage.messageId,
              agent: rawAgent,
            },
          );
        } else {
          sseLogger.debugCtx('SSE_FLOW', 'Skipping user role message (already shown locally)', {
            messageId: processedMessage.messageId,
          });
        }
        return;
      }

      if (processedMessage.type === 'message_finalized' && !processedMessage.message) {
        sseLogger.debugCtx('SSE_FLOW', 'Skipping message without content (waiting for parts)', {
          messageId: processedMessage.messageId,
          hasParts: processedMessage.assembledFromParts,
        });
        return;
      }

      messaging.addEvent(processedMessage);
    }
  }, projects.selectedSession);

  const sendMessage = useCallback(
    async (messageText, agent = { name: 'build' }) => {
      if (!projects.selectedSession) {
        throw new Error('No session selected');
      }

      if (!connection.isConnected) {
        throw new Error('Not connected');
      }

      if (!messageText || !messageText.trim()) {
        throw new Error('Cannot send empty message');
      }

      const agentName = typeof agent === 'string' ? agent : agent.name;
      setCurrentAgentMode(agentName);

      if (typeof agent === 'object' && agent.model) {
        await models.selectModel(agent.model.providerID, agent.model.modelID);
      }

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
        sessionId: projects.selectedSession?.id,
      });

      try {
        const response = await sendMessageToSession(
          messageText,
          agentName,
          projects.selectedProject,
          models.selectedModel,
          true,
          projects.selectedSession,
          baseUrl,
        );

        todos.setExpanded(false);

        return response;
      } catch (error) {
        connectionLogger.error('Message send failed', error);
        messaging.removeEvent(sentMessageId);
        throw error;
      }
    },
    [
      connection.isConnected,
      messaging,
      projects.selectedProject,
      projects.selectedSession,
      models,
      todos,
      baseUrl,
    ],
  );

  // Send command
  const sendCommand = useCallback(
    async commandText => {
      if (!projects.selectedSession) {
        throw new Error('No session selected');
      }

      if (!connection.isConnected) {
        throw new Error('Not connected');
      }

      if (!commandText || !commandText.trim()) {
        throw new Error('Cannot send empty command');
      }

      // Parse command name and arguments from "/command arg1 arg2"
      const trimmedCommand = commandText.trim();
      const parts = trimmedCommand.split(/\s+/);
      const commandName = parts[0].startsWith('/') ? parts[0].slice(1) : parts[0];
      const args = parts.slice(1);

      const sentMessageId = generateMessageId();
      messaging.addEvent({
        id: sentMessageId,
        type: 'sent',
        category: 'sent',
        message: commandText,
        projectName: 'Me',
        icon: 'User',
        timestamp: new Date().toISOString(),
        mode: currentAgentMode,
        sessionId: projects.selectedSession?.id,
      });

      try {
        const response = await sendCommandToSession(
          commandName,
          projects.selectedProject,
          projects.selectedSession,
          baseUrl,
          args,
        );

        return response;
      } catch (error) {
        connectionLogger.error('Command send failed', error);
        messaging.removeEvent(sentMessageId);
        throw error;
      }
    },
    [
      connection.isConnected,
      messaging,
      projects.selectedProject,
      projects.selectedSession,
      baseUrl,
    ],
  );

  // Clear error
  const clearError = useCallback(() => {
    connection.clearError();
  }, [connection]);

  // Load models
  const loadModels = useCallback(async () => {
    await models.loadModels();
  }, [models]);

  // Select model
  const onModelSelect = useCallback(
    async (providerId, modelId) => {
      await models.selectModel(providerId, modelId);
    },
    [models],
  );

  // Session management
  const selectProject = useCallback(
    async project => {
      await projects.selectProject(project);
    },
    [projects],
  );

  const selectSession = useCallback(
    async session => {
      console.log(
        '🔍 selectSession CALLED with:',
        JSON.stringify({ title: session?.title, id: session?.id }),
      );
      sessionLogger.debug('Selecting session', { title: session?.title, sessionId: session?.id });
      await projects.selectSession(session);
      sessionLogger.debug('Session selected', {
        title: projects.selectedSession?.title,
        sessionId: projects.selectedSession?.id,
      });
      // Clear previous messages and load new session messages
      console.log('🔍 After selectSession, checking conditions:', {
        sessionId: session?.id,
        baseUrl: !!baseUrl,
        baseUrlValue: baseUrl,
        selectedSessionId: projects.selectedSession?.id,
      });
      if (session && baseUrl) {
        console.log('🔍 Calling loadMessages with:', {
          baseUrl,
          sessionId: session.id,
          projectsSelectedProject: !!projects.selectedProject,
        });
        messaging.clearEvents();
        messaging.loadMessages(baseUrl, session.id, projects.selectedProject);
      } else {
        // Clear events if no session selected
        messaging.clearEvents();
      }
    },
    [projects, messaging, baseUrl],
  );

  const createSession = useCallback(async () => {
    return await projects.createSession();
  }, [projects]);

  const deleteSessionById = useCallback(
    async sessionId => {
      await projects.deleteSession(sessionId);
    },
    [projects],
  );

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

  // Load older messages callback
  const loadOlderMessages = useCallback(
    async beforeMessageId => {
      // Check buffer first
      if (messaging.hasOlderMessagesBuffer) {
        messaging.consumeFromBuffer();
        return [];
      }

      if (!baseUrl || !projects.selectedSession?.id) {
        return [];
      }
      const olderMessages = await messaging.loadOlderMessages(
        baseUrl,
        projects.selectedSession.id,
        projects.selectedProject,
        beforeMessageId,
      );
      if (olderMessages && olderMessages.length > 0) {
        messaging.prependOlderMessages(olderMessages);
      }
      return olderMessages;
    },
    [baseUrl, projects.selectedSession, projects.selectedProject, messaging],
  );

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
    isReconnecting: connection.isReconnecting,
    isFailed: connection.isFailed,
    isDisconnected: connection.isDisconnected,
    connectionState: connection.state,
    connectionError: connection.error,
    connectionErrorType: connection.errorType,
    connectionRetryCount: connection.retryCount,
    connectionMaxRetries: connection.maxRetries,
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
    shouldShowServerSelector,

    // Actions
    connect,
    disconnectFromEvents,
    reconnect: connection.reconnect,
    sendMessage,
    sendCommand,
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
    loadOlderMessages,
    refreshProjectSessions: projects.refreshProjectSessions,
  };
};
