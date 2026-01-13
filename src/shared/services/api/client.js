// API client with common functionality
import { getRequestHeaders } from './requestUtils';
import { logger } from '@/shared/services/logger';

/**
 * Base API client for HTTP requests
 */
export const apiClient = {
  /**
   * GET request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise} - Response promise
   */
  async get(url, options = {}, selectedProject = null) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: getRequestHeaders(options.headers || {}, selectedProject),
        ...options,
      });

      if (!response.ok) {
        logger.warn(`GET ${url} failed: ${response.status} ${response.statusText}`);
        return null;
      }

      return response;
    } catch (error) {
      logger.warn(`GET ${url} network error`, { error: error.message });
      return null;
    }
  },

  /**
   * POST request
   * @param {string} url - Request URL
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise} - Response promise
   */
  async post(url, data = null, options = {}, selectedProject = null) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getRequestHeaders(
          {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          selectedProject,
        ),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });

      if (!response.ok) {
        logger.warn(`POST ${url} failed: ${response.status} ${response.statusText}`);
        return null;
      }

      return response;
    } catch (error) {
      logger.warn(`POST ${url} network error`, { error: error.message });
      return null;
    }
  },

  /**
   * PUT request
   * @param {string} url - Request URL
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise} - Response promise
   */
  async put(url, data = null, options = {}, selectedProject = null) {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: getRequestHeaders(
          {
            'Content-Type': 'application/json',
            ...options.headers,
          },
          selectedProject,
        ),
        body: data ? JSON.stringify(data) : undefined,
        ...options,
      });

      if (!response.ok) {
        logger.warn(`PUT ${url} failed: ${response.status} ${response.statusText}`);
        return null;
      }

      return response;
    } catch (error) {
      logger.warn(`PUT ${url} network error`, { error: error.message });
      return null;
    }
  },

  /**
   * DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @param {Object} selectedProject - Selected project for headers
   * @returns {Promise} - Response promise
   */
  async delete(url, options = {}, selectedProject = null) {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getRequestHeaders(options.headers || {}, selectedProject),
        ...options,
      });

      if (!response.ok) {
        logger.warn(`DELETE ${url} failed: ${response.status} ${response.statusText}`);
        return null;
      }

      return response;
    } catch (error) {
      logger.warn(`DELETE ${url} network error`, { error: error.message });
      return null;
    }
  },

  /**
   * Parse JSON response
   * @param {Response} response - Fetch response
   * @returns {Promise} - Parsed JSON or null
   */
  async parseJSON(response) {
    if (!response) return null;

    const contentType = response.headers?.get?.('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn(`Expected JSON response, got ${contentType || 'unknown content-type'}`);
      return null;
    }

    try {
      return await response.json();
    } catch (error) {
      logger.warn(`Failed to parse JSON response`, { error: error.message });
      return null;
    }
  },
};
