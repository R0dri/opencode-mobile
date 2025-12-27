import { useState, useRef, useEffect } from 'react';
import { Platform, Keyboard, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateUrl } from '../utils/urlValidation';
import { classifyMessage, groupUnclassifiedMessages } from '../utils/messageClassification';
import { sendMessageToSession, clearSession, hasActiveSession, setCurrentSession, deleteSession } from '../utils/sessionManager';
import { fetchProjects, fetchSessionsForProject, fetchModels, saveLastSelectedModel, loadLastSelectedModel } from '../utils/projectManager';
import { getRequestHeaders } from '../utils/requestUtils';
import '../utils/opencode-types.js';

// Import react-native-sse as default export (package uses module.exports)
import EventSource from 'react-native-sse';

/**
 * Custom hook for managing SSE (Server-Sent Events) connections
 * @param {string} initialUrl - Initial SSE endpoint URL
 * @returns {Object} - SSE connection state and methods
 */
// Global message ID counter (shared across hook instances)
let messageCounter = 0;

// Generate unique message IDs
const generateMessageId = () => {
  messageCounter += 1;
  return `msg_${messageCounter}_${Date.now()}`;
};

// Helper function to update or add a message to the events array
const updateOrAddMessage = (prevEvents, newMessage) => {
  // For now, just append the new message (assuming messages are unique or order matters)
  return [...prevEvents, newMessage];
};

// Helper function to process opencode messages with classification
const processOpencodeMessage = (item, setUnclassifiedMessages, setTodos, currentMode) => {
  const classifiedMessage = classifyMessage(item, currentMode);



  // Track unclassified messages separately
  if (classifiedMessage.category === 'unclassified') {
    setUnclassifiedMessages(prev => [...prev, classifiedMessage]);
  }

  // Update todos if this is a todo update
  if (classifiedMessage.type === 'todo_updated') {
    setTodos(classifiedMessage.todos);
  }

  // Ensure unique ID for UI rendering
  return { ...classifiedMessage, id: classifiedMessage.id || generateMessageId() };
};

export const useSSE = (initialUrl = 'http://10.1.1.122:63425') => {
  const [events, setEvents] = useState([]);
  const [unclassifiedMessages, setUnclassifiedMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isServerReachable, setIsServerReachable] = useState(null); // null = not tested, true = reachable, false = not reachable
  const [error, setError] = useState(null);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  /** @type {import('./opencode-types.js').Session|null} */
  const [session, setSession] = useState(null);
  /** @type {Array<import('./opencode-types.js').Project>} */
  const [projects, setProjects] = useState([]);
  /** @type {Array<import('./opencode-types.js').Session>} */
  const [projectSessions, setProjectSessions] = useState([]);
  /** @type {import('./opencode-types.js').Project|null} */
  const [selectedProject, setSelectedProject] = useState(null);
  /** @type {import('./opencode-types.js').Session|null} */
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSessionBusy, setIsSessionBusy] = useState(false);
  const [todos, setTodos] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState('build');
  const [todoDrawerExpanded, setTodoDrawerExpanded] = useState(false);
  const [baseUrl, setBaseUrl] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const eventSourceRef = useRef(null);
  const selectedSessionRef = useRef(null); // Ref to track selectedSession for SSE callbacks
  const projectSessionsRef = useRef(null); // Ref to track projectSessions for notification session lookup
  const connectionTimeoutRef = useRef(null); // Ref for connection timeout
  const inactiveIntervalRef = useRef(null); // Ref for inactive notification interval

  // Load last successful URL on mount
  useEffect(() => {
    const loadLastUrl = async () => {
      try {
        const lastUrl = await AsyncStorage.getItem('lastSuccessfulUrl');
        if (lastUrl) {
          setInputUrl(lastUrl);
        }
      } catch (error) {
        console.error('Failed to load last URL:', error);
      }
    };
    loadLastUrl();
  }, []);

  // Load todos for session context
  const loadTodos = async (sessionId) => {
    try {
      console.log('📋 Loading todos for session:', sessionId, 'baseUrl:', baseUrl);
      // Auto-collapse todo drawer when reloading todos
      setTodoDrawerExpanded(false);
      if (!baseUrl) {
        console.error('❌ No baseUrl available for loading todos');
        setTodos([]);
        return;
      }

      const response = await fetch(`${baseUrl}/session/${sessionId}/todo`, {
        headers: getRequestHeaders({}, selectedProject)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
      }

      const data = await response.json();
      console.log('📋 Todos loaded:', data.length, 'todos');

      if (data && Array.isArray(data)) {
        setTodos(data);
      } else {
        setTodos([]);
      }
    } catch (error) {
      console.error('❌ Failed to load todos:', error);
      setTodos([]);
    }
  };

  // Load messages for session context
  const loadLastMessage = async (sessionId) => {
      try {
        console.log('📚 Loading messages for session:', sessionId, 'baseUrl:', baseUrl, 'selectedProject:', selectedProject);
        // Auto-collapse todo drawer when reloading messages
        setTodoDrawerExpanded(false);
       if (!baseUrl) {
         console.error('❌ No baseUrl available for loading messages');
         setEvents([]);
         return;
       }

      // Fetch up to 50 messages
      const response = await fetch(`${baseUrl}/session/${sessionId}/message?offset=0&limit=50`, {
        headers: getRequestHeaders({}, selectedProject)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
      }

       const data = await response.json();
       console.log('📚 Messages loaded:', data.length, 'messages');

       if (data && Array.isArray(data) && data.length > 0) {
         // Filter messages that contain text content
         const textMessages = data.filter(message => {
           if (!message.info || !Array.isArray(message.parts)) {
             console.log('📚 Skipping message without info or parts:', message);
             return false;
           }
           const hasText = message.parts.some(part => part && part.type === 'text' && part.text && part.text.trim());
           if (!hasText) console.log('📚 Skipping message without text parts:', message);
           return hasText;
         });

         console.log('📚 Text messages found:', textMessages.length);

         if (textMessages.length > 0) {
          // Transform and classify each message
          const transformedEvents = textMessages.map(message => {
            // Transform API response to SSE-like format
            const transformedMessage = {
              ...message,
              sessionId: sessionId,
              payload: {
                type: "message.loaded",
                properties: {
                  info: message.info,
                  parts: message.parts
                }
              }
            };

            // Process the transformed message (use message's own mode, not current)
             const classifiedMessage = processOpencodeMessage(transformedMessage, setUnclassifiedMessages, setTodos, null);
            console.log('📚 Classified message:', { category: classifiedMessage.category, type: classifiedMessage.type, messageId: classifiedMessage.messageId, role: message.info?.role });

            return {
              id: generateMessageId(), // UI identifier
              messageId: classifiedMessage.messageId, // API identifier
              type: classifiedMessage.type,
              category: classifiedMessage.category,
              message: classifiedMessage.displayMessage,
              projectName: classifiedMessage.projectName,
              icon: classifiedMessage.icon,
              sessionId: classifiedMessage.sessionId,
              mode: classifiedMessage.mode
            };
          });

           console.log('📚 Setting events:', transformedEvents.length);
           // Set as initial events (replace any existing), maintaining API order
           setEvents(transformedEvents);
         } else {
           console.log('📚 No text messages found');
           setEvents([]);
         }
      } else {
        console.log('📚 No messages received');
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      // Don't block session selection, just start with empty chat
      setEvents([]);
    }
  };

  // Load available models from server
  const loadModels = async () => {
    if (!baseUrl) return;

    setModelsLoading(true);
    try {
      const modelData = await fetchModels(baseUrl, selectedProject);
      setProviders(modelData.providers);

      // Load last selected model and set it if available
      const lastModel = await loadLastSelectedModel();
      if (lastModel) {
        setSelectedModel(lastModel);
      } else if (modelData.defaults && Object.keys(modelData.defaults).length > 0) {
        // Use server defaults if no saved preference
        const defaultProvider = Object.keys(modelData.defaults)[0];
        const defaultModel = modelData.defaults[defaultProvider];
        setSelectedModel({ providerId: defaultProvider, modelId: defaultModel });
      }
    } catch (error) {
      console.error('❌ Failed to load models:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  // Handle model selection
  const handleModelSelect = async (providerId, modelId) => {
    const newModel = { providerId, modelId };
    setSelectedModel(newModel);
    await saveLastSelectedModel(providerId, modelId);
  };

  // Setup SSE connection for real-time messages
  const setupSSEConnection = () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // Ignore errors
      }
    }

    // Check if EventSource is available
    if (typeof EventSource === 'undefined') {
      setError('Real-time messages not supported on this platform');
      return;
    }

    // Use the baseUrl to construct SSE URL
    const sseUrl = baseUrl + '/global/event';
    console.log('EventSource created for:', sseUrl);
    eventSourceRef.current = new EventSource(sseUrl, {
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
    console.log('EventSource readyState after creation:', eventSourceRef.current.readyState);

    // Set timeout for connection (10 minutes for long-use app)
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    connectionTimeoutRef.current = setTimeout(() => {
      console.log('SSE connection timeout - restarting');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      setIsConnected(false);
      setError('Connection timeout');
      // Restart after a short delay
      setTimeout(() => setupSSEConnection(), 1000);
    }, 600000);

    eventSourceRef.current.addEventListener("open", (event) => {
      console.log("🚀 SSE connection opened successfully!");
      console.log('EventSource readyState:', eventSourceRef.current.readyState);
      setIsConnected(true);
      setError(null); // Clear any previous errors
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });

    eventSourceRef.current.addEventListener("message", (event) => {
      const rawMessage = event.data;
      try {
        const data = JSON.parse(rawMessage);
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
             const classifiedMessage = processOpencodeMessage(item, setUnclassifiedMessages, setTodos, null);
             setEvents(prev => updateOrAddMessage(prev, classifiedMessage));
           });
         } else {
           const classifiedMessage = processOpencodeMessage(data, setUnclassifiedMessages, setTodos, null);
           setEvents(prev => updateOrAddMessage(prev, classifiedMessage));
         }
       } catch (parseError) {
         // Ignore parse errors
       }
     });

    eventSourceRef.current.addEventListener("error", (event) => {
      console.log('SSE Error event:', event);
      console.log('EventSource readyState:', eventSourceRef.current.readyState);
      console.log('EventSource url:', eventSourceRef.current.url);
      // Update connection state on error
      setIsConnected(false);
      const errorMsg = event.message || event.error || 'Connection failed';
      console.log(`Real-time connection error: ${errorMsg}`);
      // Clear connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
    });
  };

  // Test connectivity to the configured server on startup
  useEffect(() => {

    // Test connectivity to the initial server URL
    const testUrl = inputUrl.replace('/global/event', '');
    console.log('Web: Initial connectivity test for:', testUrl);
    fetch(testUrl, {
      method: 'HEAD',
      headers: getRequestHeaders({}, selectedProject)
    })
      .then(response => {
        console.log('✅ Initial connectivity test successful');
        setIsServerReachable(true);
      })
      .catch(error => {
        console.log('❌ Initial connectivity test failed:', error.message);
        setIsServerReachable(false);
      });
  }, []); // Empty dependency array - only run once on mount

   // Sync selectedSession ref with state
   useEffect(() => {
     selectedSessionRef.current = selectedSession;
   }, [selectedSession]);

   // Sync projectSessions ref with state
   useEffect(() => {
     projectSessionsRef.current = projectSessions;
   }, [projectSessions]);

  // Update model options when selected session changes
  useEffect(() => {
    if (selectedSession && baseUrl) {
      console.log('🔄 Session changed, updating model options for session:', selectedSession.id);
      loadModels();
    }
  }, [selectedSession, baseUrl]);

  // Track app state for notification logic
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      // Reconnect SSE if coming back to foreground and connection is lost
      if (nextAppState === 'active' && eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.OPEN) {
        console.log('Reconnecting SSE on foreground');
        setupSSEConnection();
      }
      // Handle inactive state for notifications
      if (nextAppState === 'inactive') {
        inactiveIntervalRef.current = setInterval(() => {
          fetch('https://api.day.app/jUnKwDUFPAosahKxjv36cX/Time Sensitive Notifications?level=timeSensitive')
            .then(response => console.log('Notification sent:', response.status))
            .catch(error => console.error('Notification failed:', error));
        }, 30000);
      } else if (nextAppState === 'active' && inactiveIntervalRef.current) {
        clearInterval(inactiveIntervalRef.current);
        inactiveIntervalRef.current = null;
      }
    });

    // Set current session getter for notification filtering


    return () => {
      subscription?.remove();
      if (inactiveIntervalRef.current) {
        clearInterval(inactiveIntervalRef.current);
      }
    };
  }, [selectedSession]);

  // Auto-connect when server becomes reachable
  useEffect(() => {
    console.log('🔄 Auto-connect check - isServerReachable:', isServerReachable, 'isConnected:', isConnected, 'isConnecting:', isConnecting);
    if (isServerReachable && !isConnected && !isConnecting) {
      console.log('🚀 Auto-connecting...');
      connectToEvents().catch(error => {
        console.error('❌ Auto-connect failed:', error);
        setError(`Auto-connect failed: ${error.message}`);
      });
    }
  }, [isServerReachable, isConnected, isConnecting]); // Depend on connectivity state

  // SSE heartbeat and auto-restart
  useEffect(() => {
    const heartbeatInterval = setInterval(() => {
      const timestamp = new Date().toISOString();
      if (eventSourceRef.current && eventSourceRef.current.readyState !== EventSource.OPEN) {
        console.log(`${timestamp} SSE heartbeat failed - restarting connection`);
        setIsConnected(false);
        setupSSEConnection();
      } else {
        console.log(`${timestamp} SSE heartbeat OK`);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, []);

  const connectToEvents = async () => {
    console.log('🔌 CONNECT BUTTON PRESSED - starting connection');
    let urlToUse = inputUrl.trim();

    // Auto-prepend https:// if no protocol specified
    if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
      urlToUse = 'https://' + urlToUse;
    }

    if (!validateUrl(urlToUse)) {
      setError('Please enter a valid URL');
      return;
    }

    // Append /global/event if not already present
    if (!urlToUse.endsWith('/global/event')) {
      urlToUse = urlToUse.replace(/\/$/, '') + '/global/event';
    }

    // Immediately update UI to show connecting state
    setIsConnecting(true);
    setIsConnected(false);
    setError(null);
    // Test connectivity before attempting full connection
    if (!isServerReachable) {
      try {
        const response = await fetch(urlToUse, {
          method: 'HEAD',
          headers: getRequestHeaders({}, selectedProject)
        });
        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }
        setIsServerReachable(true);
      } catch (error) {
        setError(`Cannot reach server: ${error.message}`);
        setIsConnected(false);
        setIsConnecting(false);
        setIsServerReachable(false);
        setEvents(prev => [...prev, { id: generateMessageId(), type: 'connection', message: '❌ Failed to connect to server' }]);
        return;
      }
    }

    // At this point, we know the server is reachable, so set connected state
    setIsConnected(true);
    setIsConnecting(false);
    const successfulBaseUrl = urlToUse.replace('/global/event', '');
    setBaseUrl(successfulBaseUrl);
    console.log('✅ Connection successful, baseUrl set to:', successfulBaseUrl);

    // Save last successful inputUrl
    try {
      await AsyncStorage.setItem('lastSuccessfulUrl', urlToUse.replace('/global/event', ''));
    } catch (error) {
      console.error('Failed to save last URL:', error);
    }

    // Fetch projects
    try {
      const baseUrl = urlToUse.replace('/global/event', '');
      const availableProjects = await fetchProjects(baseUrl, selectedProject);
      setProjects(availableProjects);
    } catch (projectError) {
      console.error('❌ Project fetch failed:', projectError);
      setError(`Failed to fetch projects: ${projectError.message}`);
      return;
    }

    // Load available models
    await loadModels();


  };

  const selectProject = async (project) => {
    setSelectedProject(project);
    setSelectedSession(null); // Clear previous session selection

    try {
      const sessions = await fetchSessionsForProject(inputUrl.replace('/global/event', ''), project.id, project);
      setProjectSessions(sessions);
    } catch (error) {
      console.error('❌ Failed to fetch sessions:', error);
      setError(`Failed to fetch sessions: ${error.message}`);
    }
  };

    const selectSession = (session) => {
      console.log('Target: Session selected:', session.id, 'baseUrl:', baseUrl);
      // Auto-collapse todo drawer when switching sessions
      setTodoDrawerExpanded(false);
      setSelectedSession(session);
      setCurrentSession(session, baseUrl);
      // Clear previous todos
      setTodos([]);
      // Load last message for context
      loadLastMessage(session.id);
      // Load todos for context
      loadTodos(session.id);
      // Setup SSE connection now that session is active
      setupSSEConnection();
    };

    const refreshSession = () => {
      if (selectedSession) {
        console.log('🔄 Refreshing session:', selectedSession.id);
        selectSession(selectedSession);
      } else {
        console.warn('Warning: No session selected to refresh');
      }
    };

   const createSession = async () => {
     try {
         const response = await fetch(`${baseUrl}/session`, {
          method: 'POST',
          headers: getRequestHeaders({
            'Content-Type': 'application/json'
          }, selectedProject),
          body: JSON.stringify({})
        });
        if (!response.ok) throw new Error('Failed to create session');

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
        }

        const newSession = await response.json();
       // Add to projectSessions
       setProjectSessions(prev => [newSession, ...prev]);
       // Select the new session
       selectSession(newSession);
       return newSession;
     } catch (error) {
       console.error('Create session failed:', error);
       throw error;
     }
    };

  // Delete a session with UI updates
  const deleteSessionWithConfirmation = async (sessionId) => {
    try {
      await deleteSession(sessionId, baseUrl, selectedProject);

      // Update UI state - remove from project sessions
      setProjectSessions(prev => prev.filter(session => session.id !== sessionId));

      // If we deleted the currently selected session, clear selection
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(null);
        setEvents([]);
      }

      console.log('Trash: Session deleted from UI:', sessionId);
    } catch (error) {
      console.error('❌ Failed to delete session:', error);
      throw error;
    }
  };

  const disconnectFromEvents = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsServerReachable(null);
    setEvents([]);
    setUnclassifiedMessages([]);
    setTodos([]);
    setSelectedProject(null);
    setSelectedSession(null);
    setIsSessionBusy(false);
    setBaseUrl(null);
    clearSession();
    // Close SSE connection
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (e) {
        // Ignore errors
      }
      eventSourceRef.current = null;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const sendMessage = async (messageText, mode = 'build') => {
     if (!isConnected || !hasActiveSession()) {
       console.error('❌ Cannot send message: not connected or no session');
       setError('Cannot send message: not connected to server or no session selected');
       return;
     }

     if (!messageText || !messageText.trim()) {
       console.warn('Warning: Cannot send empty message');
       return;
     }

     // Update current mode
     setCurrentMode(mode);

    // Display sent message in UI immediately
    const sentMessageId = generateMessageId();
    setEvents(prev => [...prev, {
      id: sentMessageId,
      type: 'sent',
      category: 'sent',
      message: messageText,
      projectName: 'Me',
        icon: 'User',
      timestamp: new Date().toISOString(),
      mode: mode
    }]);

    try {
      // Set session busy before sending
      setIsSessionBusy(true);

      // Send message to server
      /** @type {import('./opencode-types.js').SessionMessageResponse} */
      const response = await sendMessageToSession(messageText, mode, selectedProject, selectedModel);

      // Auto-dismiss keyboard after successful send
      Keyboard.dismiss();

      // Auto-collapse todo drawer after sending message
      setTodoDrawerExpanded(false);

      // Set session not busy after response
      setIsSessionBusy(false);

    } catch (error) {
      console.error('❌ Message send failed:', error);
      console.error('isConnected:', isConnected, 'hasActiveSession:', hasActiveSession(), 'baseUrl:', baseUrl, 'selectedSession:', selectedSession);
      setError(`Failed to send message: ${error.message}`);

      // Remove the sent message from UI if send failed
      setEvents(prev => prev.filter(event => event.type !== 'sent' || event.message !== messageText));

      // Set session not busy on error
      setIsSessionBusy(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        try {
          eventSourceRef.current.close();
        } catch (e) {
          // Ignore errors
        }
      }
    };
  }, []);

   return {
     events,
     unclassifiedMessages,
     groupedUnclassifiedMessages: groupUnclassifiedMessages(unclassifiedMessages),
     isConnected,
     isConnecting,
     isServerReachable,
     error,
     inputUrl,
     setInputUrl,
     session,
     projects,
     projectSessions,
     selectedProject,
      selectedSession,
      isSessionBusy,
       todos,
        providers,
        selectedModel,
        modelsLoading,
        currentMode,
        todoDrawerExpanded,
        setTodoDrawerExpanded,
       loadModels,
       onModelSelect: handleModelSelect,
      connectToEvents,
     disconnectFromEvents,
     selectProject,
      selectSession,
      refreshSession,
      createSession,
      deleteSession: deleteSessionWithConfirmation,
      clearError,
      sendMessage,
    };
  };
