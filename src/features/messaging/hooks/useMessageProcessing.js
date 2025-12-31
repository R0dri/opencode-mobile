// Message processing and event management
import { useState, useCallback, useEffect } from 'react';
import { classifyMessage, groupUnclassifiedMessages, groupAllMessages } from '../utils/messageClassifier';
import { apiClient } from '../../../services/api/client';

export const useMessageProcessing = () => {
  const [events, setEvents] = useState([]);
  const [unclassifiedMessages, setUnclassifiedMessages] = useState([]);
  const [allMessages, setAllMessages] = useState([]);

  // Generate unique message IDs
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  // Load previous messages for session
  const loadMessages = useCallback(async (baseUrl, sessionId, selectedProject = null) => {
    if (!baseUrl || !sessionId) {
      return;
    }

    try {
      console.log('💬 Loading messages for session:', sessionId);
      const response = await apiClient.get(`${baseUrl}/session/${sessionId}/message?limit=100`, {}, selectedProject);
      const data = await apiClient.parseJSON(response);
      console.log('💬 Loaded messages data:', data);

      if (data && Array.isArray(data)) {
        // Classify and replace previous messages for this session
        const classifiedMessages = data.map(item => {
          // Ensure sessionId is set for loaded messages
          const classified = classifyMessage(item);
          if (!classified.sessionId) {
            classified.sessionId = sessionId;
          }
          // Ensure unique id for React keys
          if (!classified.id) {
            classified.id = generateMessageId();
          }
          return classified;
        });
        console.log('💬 Classified messages:', classifiedMessages.length);
        setEvents(classifiedMessages);
      }
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
    }
  }, []);

  // Process incoming messages
  const processMessage = useCallback((rawMessage, currentMode) => {
    const classifiedMessage = classifyMessage(rawMessage, currentMode);

    console.debug('⚙️ PROCESSED MESSAGE:', {
      type: classifiedMessage.type,
      category: classifiedMessage.category,
      hasMessage: !!classifiedMessage.message
    });

    // Track ALL messages for debugging
    setAllMessages(prev => [...prev, classifiedMessage]);

    if (classifiedMessage.category === 'unclassified') {
      setUnclassifiedMessages(prev => [...prev, classifiedMessage]);
    }

    // Add unique ID for UI rendering
    return { ...classifiedMessage, id: classifiedMessage.id || generateMessageId() };
  }, [generateMessageId]);

  // Add message to events
  const addEvent = useCallback((message) => {
    setEvents(prev => [...prev, message]);
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setUnclassifiedMessages([]);
    setAllMessages([]);
  }, []);

  // Get grouped unclassified messages
  const groupedUnclassifiedMessages = groupUnclassifiedMessages(unclassifiedMessages);

  // Get grouped all messages
  const groupedAllMessages = groupAllMessages(allMessages);

  return {
    events,
    unclassifiedMessages,
    groupedUnclassifiedMessages,
    allMessages,
    groupedAllMessages,
    processMessage,
    addEvent,
    clearEvents,
    generateMessageId,
    loadMessages
  };
};