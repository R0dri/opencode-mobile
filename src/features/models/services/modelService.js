// Model API service
import { apiClient } from '../../../services/api/client';

export const modelService = {
  /**
   * Fetch available models and providers
   * @param {string} baseUrl - API base URL
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise<Object>} - Providers and defaults
   */
  async fetchModels(baseUrl, selectedProject = null) {
    const response = await apiClient.get(`${baseUrl}/config/providers`, {}, selectedProject);
    const data = await apiClient.parseJSON(response);

    // Handle the /config/providers response format: { providers: [...], default: {...} }
    return {
      providers: data.providers || [],
      defaults: data.default || {}
    };
  }
};