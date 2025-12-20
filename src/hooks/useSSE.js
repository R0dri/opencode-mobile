import { useState, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import { validateUrl } from '../utils/urlValidation';
import { classifyMessage, groupUnclassifiedMessages } from '../utils/messageClassification';
import { sendMessageToSession, clearSession, hasActiveSession, setCurrentSession } from '../utils/sessionManager';
import { fetchProjects, fetchSessionsForProject } from '../utils/projectManager';
import '../utils/opencode-types.js';

// Import react-native-sse as default export (package uses module.exports)
import EventSource from 'react-native-sse';

/**
 * Custom hook for managing SSE (Server-Sent Events) connections
 * @param {string} initialUrl - Initial SSE endpoint URL
 * @returns {Object} - SSE connection state and methods
 */
// Helper function to process opencode messages with classification
const processOpencodeMessage = (item, setUnclassifiedMessages) => {
  const classifiedMessage = classifyMessage(item);

  // Track unclassified messages separately
  if (classifiedMessage.category === 'unclassified') {
    setUnclassifiedMessages(prev => [...prev, classifiedMessage]);
  }

  return classifiedMessage;
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
  const [baseUrl, setBaseUrl] = useState(null);
  const eventSourceRef = useRef(null);
  const messageCounterRef = useRef(0); // Unique message ID counter
  const selectedSessionRef = useRef(null); // Ref to track selectedSession for SSE callbacks

  // Generate unique message IDs
  const generateMessageId = () => {
    messageCounterRef.current += 1;
    return `msg_${messageCounterRef.current}_${Date.now()}`;
  };

  // Setup SSE connection for real-time messages
  const setupSSEConnection = () => {
    try {
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

      eventSourceRef.current.addEventListener("open", (event) => {
        console.log("🚀 SSE connection opened successfully!");
        console.log('EventSource readyState:', eventSourceRef.current.readyState);
        console.log('📡 Real-time connection established');
      });

      // Helper function to update or add messages
      const updateOrAddMessage = (events, newMessage) => {
        // Handle session status messages for busy toggle
        if (newMessage.payloadType === 'session.status' && newMessage.sessionStatus) {
          const statusType = newMessage.sessionStatus;
          const messageSessionId = newMessage.sessionId;
          const selectedSessionId = selectedSessionRef.current?.id;

          if (messageSessionId === selectedSessionId) {
            setIsSessionBusy(statusType === 'busy');
          }
        }

        // Filter messages by selected session ID if a session is selected
        const currentSelectedSession = selectedSessionRef.current;
        console.log(`🔍 SESSION FILTER: message.sessionId=${newMessage.sessionId}, selectedSession.id=${currentSelectedSession?.id}`);
        if (currentSelectedSession && newMessage.sessionId !== currentSelectedSession.id && newMessage.sessionId !== undefined) {
          console.log('🚫 FILTERED OUT - session mismatch');
          return events; // Don't add messages from other sessions
        }

        // If this is a part update with a message_id, try to find and update
        if (newMessage.messageId) {
          const existingIndex = events.findIndex(e => e.messageId === newMessage.messageId);
          if (existingIndex >= 0) {
            console.log('🔄 Updating existing message:', newMessage.messageId);
            // Update existing message
            return events.map((e, i) =>
              i === existingIndex
                ? { ...e, message: newMessage.displayMessage }
                : e
            );
          }
        }
        // Otherwise, add as new message
        console.log('➕ Adding new message:', newMessage.messageId || 'no-id', 'type:', newMessage.type);
        return [...events, {
          id: generateMessageId(), // UI identifier
          messageId: newMessage.messageId, // API identifier for updates
          type: newMessage.type,
          category: newMessage.category,
          message: newMessage.displayMessage,
          projectName: newMessage.projectName,
          icon: newMessage.icon,
          sessionId: newMessage.sessionId // Store session ID for filtering
        }];
      };

      let messageCount = 0;
      eventSourceRef.current.addEventListener("message", (event) => {
        messageCount++;
        console.log(`🎉 SSE MESSAGE #${messageCount} RECEIVED!`);

        const rawMessage = event.data;
        console.log('🔍 Raw SSE message:', rawMessage.substring(0, 200) + '...');
        try {
          const data = JSON.parse(rawMessage);
          console.log('✅ JSON parsing successful, processing message(s)...');

          if (Array.isArray(data)) {
            console.log(`📦 Processing array of ${data.length} messages`);
            data.forEach((item, index) => {
              console.log(`🔄 Processing message ${index + 1}/${data.length}`);
              const classifiedMessage = processOpencodeMessage(item, setUnclassifiedMessages);
              console.log('📊 Classified:', classifiedMessage.type, classifiedMessage.category);
              setEvents(prev => updateOrAddMessage(prev, classifiedMessage));
            });
          } else {
            console.log('📦 Processing single message');
            const classifiedMessage = processOpencodeMessage(data, setUnclassifiedMessages);
            console.log('📊 Classified:', classifiedMessage.type, classifiedMessage.category);
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
        // Don't change connection state for SSE errors - we're already connected via HTTP
        const errorMsg = event.message || event.error || 'Connection failed';
        console.log(`Real-time connection error: ${errorMsg}`);
      });

    } catch (err) {
      console.log('⚠️ SSE connection setup failed:', err.message);
      // Don't fail the whole connection for SSE issues
    }
  };

  // Test connectivity to the configured server on startup
  useEffect(() => {

    // Test connectivity to the initial server URL
    const testUrl = inputUrl.replace('/global/event', '');
    console.log('🌐 Initial connectivity test for:', testUrl);
    fetch(testUrl, { method: 'HEAD' })
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

  const connectToEvents = async () => {
    console.log('🔌 CONNECT BUTTON PRESSED - starting connection');
    let urlToUse = inputUrl.trim();

    if (!validateUrl(urlToUse)) {
      setError('Please enter a valid URL (must start with http:// or https://)');
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
        const response = await fetch(urlToUse, { method: 'HEAD' });
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
    setBaseUrl(urlToUse.replace('/global/event', ''));
    console.log('✅ Connection successful, baseUrl set to:', urlToUse.replace('/global/event', ''));

    // Fetch projects
    try {
      const baseUrl = urlToUse.replace('/global/event', '');
      const availableProjects = await fetchProjects(baseUrl);
      setProjects(availableProjects);
    } catch (projectError) {
      console.error('❌ Project fetch failed:', projectError);
      setError(`Failed to fetch projects: ${projectError.message}`);
      return;
    }


  };

  const selectProject = async (project) => {
    setSelectedProject(project);
    setSelectedSession(null); // Clear previous session selection

    try {
      const sessions = await fetchSessionsForProject(inputUrl.replace('/global/event', ''), project.id);
      setProjectSessions(sessions);
    } catch (error) {
      console.error('❌ Failed to fetch sessions:', error);
      setError(`Failed to fetch sessions: ${error.message}`);
    }
  };

  const selectSession = (session) => {
    console.log('🎯 Session selected:', session.id, 'baseUrl:', baseUrl);
    setSelectedSession(session);
    setCurrentSession(session, baseUrl);
    // Setup SSE connection now that session is active
    setupSSEConnection();
  };

  const disconnectFromEvents = () => {
    setIsConnected(false);
    setIsConnecting(false);
    setIsServerReachable(null);
    setEvents([]);
    setUnclassifiedMessages([]);
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

  const sendMessage = async (messageText) => {
    if (!isConnected || !hasActiveSession()) {
      console.error('❌ Cannot send message: not connected or no session');
      setError('Cannot send message: not connected to server or no session selected');
      return;
    }

    if (!messageText || !messageText.trim()) {
      console.warn('⚠️ Cannot send empty message');
      return;
    }

    try {
      // Display sent message in UI immediately
      const sentMessageId = generateMessageId();
      setEvents(prev => [...prev, {
        id: sentMessageId,
        type: 'sent',
        category: 'sent',
        message: messageText,
        projectName: 'Me',
        icon: '👤',
        timestamp: new Date().toISOString()
      }]);

      // Send message to server
      /** @type {import('./opencode-types.js').SessionMessageResponse} */
      const response = await sendMessageToSession(messageText);

    } catch (error) {
      console.error('❌ Message send failed:', error);
      console.error('isConnected:', isConnected, 'hasActiveSession:', hasActiveSession(), 'baseUrl:', baseUrl, 'selectedSession:', selectedSession);
      setError(`Failed to send message: ${error.message}`);

      // Remove the sent message from UI if send failed
      setEvents(prev => prev.filter(event => event.type !== 'sent' || event.message !== messageText));
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
    connectToEvents,
    disconnectFromEvents,
    selectProject,
    selectSession,
    clearError,
    sendMessage,
  };
};