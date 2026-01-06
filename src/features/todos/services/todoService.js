// Todo API service
import { apiClient } from '@/services/api/client';

export const todoService = {
  /**
   * Fetch todos for a session
   * @param {string} baseUrl - API base URL
   * @param {string} sessionId - Session ID
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise<Array>} - Todo list
   */
  async fetchTodos(baseUrl, sessionId, selectedProject = null) {
    const response = await apiClient.get(`${baseUrl}/session/${sessionId}/todo`, {}, selectedProject);
    return apiClient.parseJSON(response);
  }
};