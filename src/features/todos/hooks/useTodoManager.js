// Todo functionality management
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../../services/api/client';

export const useTodoManager = (baseUrl, sessionId, selectedProject) => {
  const [todos, setTodos] = useState([]);
  const [expanded, setExpanded] = useState(false);

  // Load todos for session
  const loadTodos = useCallback(async () => {
    if (!baseUrl || !sessionId) {
      setTodos([]);
      return;
    }

    try {
      console.log('📋 Loading todos for session:', sessionId);
      const response = await apiClient.get(`${baseUrl}/session/${sessionId}/todo`, {}, {}, selectedProject);
      const data = await apiClient.parseJSON(response);

      if (data && Array.isArray(data)) {
        setTodos(data);
      } else {
        setTodos([]);
      }
    } catch (error) {
      console.error('❌ Failed to load todos:', error);
      setTodos([]);
    }
   }, [baseUrl, sessionId, selectedProject]);

  // Auto-load todos when session changes
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  return {
    todos,
    expanded,
    setExpanded,
    loadTodos
  };
};