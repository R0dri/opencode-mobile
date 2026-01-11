// URL validation and connectivity testing
import { useState, useCallback } from 'react';
import { validateUrl } from '@/shared/helpers/validation';
import { apiClient } from '@/shared/services/api/client';
import { logger } from '@/shared/services/logger';

const connectionLogger = logger.tag('Connection');

/**
 * Health check response type
 * @typedef {Object} HealthCheckResponse
 * @property {boolean} healthy - Whether the server is healthy
 * @property {string} version - Server version
 */

/**
 * Perform health check on server
 * @param {string} baseUrl - Base server URL
 * @returns {Promise<HealthCheckResponse|null>} Health check response or null if failed
 */
const performHealthCheck = async baseUrl => {
  try {
    // Ensure baseUrl doesn't have trailing slash and doesn't have /global/event
    const cleanBaseUrl = baseUrl.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
    const healthUrl = `${cleanBaseUrl}/global/health`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      connectionLogger.warn('Health check returned non-OK status', {
        status: response.status,
        url: healthUrl,
      });
      return null;
    }

    const data = await response.json();

    if (data && data.healthy === true) {
      connectionLogger.debug('Health check passed', { version: data.version, url: healthUrl });
      return data;
    }

    connectionLogger.warn('Health check returned unhealthy status', { data, url: healthUrl });
    return null;
  } catch (error) {
    connectionLogger.debug('Health check failed', { error: error.message, name: error.name });
    // Handle timeout gracefully
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      connectionLogger.warn('Health check timed out');
    }
    return null;
  }
};

/**
 * Legacy connectivity test via /command endpoint
 * @param {string} url - Full URL to test
 * @returns {Promise<boolean>}
 */
const testConnectivityLegacy = async url => {
  if (!validateUrl(url)) {
    throw new Error('Invalid URL format');
  }

  const testUrl = url.replace('/global/event', '');
  const commandUrl = `${testUrl}/command`;

  connectionLogger.debug('Testing connectivity', { url: commandUrl });

  try {
    await apiClient.get(commandUrl, {}, null);
    connectionLogger.debug('Server reachable', { url: commandUrl });
    return true;
  } catch (error) {
    connectionLogger.error('Connectivity check failed', {
      url: commandUrl,
      status: error.response?.status,
      message: error.message,
    });
    throw error;
  }
};

export const useConnectionManager = () => {
  const [isServerReachable, setIsServerReachable] = useState(null);
  const [serverVersion, setServerVersion] = useState(null);

  /**
   * Test server health using /global/health endpoint
   * Falls back to legacy /command check if health endpoint unavailable
   * @param {string} baseUrl - Base server URL (without /global/event)
   * @returns {Promise<{healthy: boolean, version?: string}>}
   */
  const testServerHealth = useCallback(async baseUrl => {
    connectionLogger.debug('Testing server health', { baseUrl });

    // Try health endpoint first
    const healthData = await performHealthCheck(baseUrl);

    if (healthData) {
      setServerVersion(healthData.version);
      setIsServerReachable(true);
      return { healthy: true, version: healthData.version };
    }

    // Fallback to legacy connectivity check
    connectionLogger.debug('Health endpoint unavailable, falling back to legacy check');
    try {
      await testConnectivityLegacy(baseUrl);
      setIsServerReachable(true);
      return { healthy: true };
    } catch {
      setIsServerReachable(false);
      return { healthy: false };
    }
  }, []);

  const validateAndConnect = useCallback(
    async inputUrl => {
      let urlToUse = inputUrl.trim();

      if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
        urlToUse = 'https://' + urlToUse;
      }

      connectionLogger.debug('Validating URL', { original: inputUrl, final: urlToUse });

      // Use health check for validation with retry
      const cleanUrl = urlToUse.replace('/global/event', '');

      const maxRetries = 5;
      const retryDelayMs = 1000;
      let lastError = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          connectionLogger.debug(`Health check attempt ${attempt}/${maxRetries}`, { cleanUrl });
          const healthResult = await testServerHealth(cleanUrl);

          if (healthResult?.healthy) {
            connectionLogger.debug('URL validated', { cleanUrl, version: healthResult.version });
            return cleanUrl;
          }

          // Health check returned unhealthy, treat as failure and retry
          connectionLogger.warn(`Health check attempt ${attempt} returned unhealthy status`, {
            cleanUrl,
          });
        } catch (error) {
          lastError = error;
          connectionLogger.warn(`Health check attempt ${attempt} failed`, {
            cleanUrl,
            error: error.message,
          });
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }

      // All retries exhausted
      connectionLogger.error('Health check failed after all retries', {
        cleanUrl,
        maxRetries,
        lastError: lastError?.message,
      });

      // Return the URL anyway and let the SSE service handle connection failures
      // This prevents breaking the UI when server is temporarily unavailable
      connectionLogger.debug(
        'Returning URL despite health check failures - SSE will handle connection',
        { cleanUrl },
      );
      return cleanUrl;
    },
    [testServerHealth],
  );

  return {
    isServerReachable,
    serverVersion,
    testServerHealth,
    validateAndConnect,
  };
};
