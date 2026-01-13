import { useState, useCallback, useEffect } from 'react';
import { validateUrl } from '@/shared/helpers/validation';
import { logger } from '@/shared/services/logger';
import serverStorage from '../services/serverStorage';
import { ServerStatusEnum } from '../types/server.types';

const serverManagerLogger = logger.tag('ServerManager');

export const useServerManager = () => {
  const [servers, setServers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadServers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedServers = await serverStorage.getSortedServers();
      setServers(loadedServers);
      serverManagerLogger.debug('Servers loaded', { count: loadedServers.length });
    } catch (err) {
      serverManagerLogger.error('Failed to load servers', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const addServer = useCallback(
    async (url, name = null) => {
      if (!validateUrl(url)) {
        const err = new Error('Invalid URL format');
        serverManagerLogger.warn('Invalid URL attempted', { url });
        setError(err.message);
        return false;
      }

      try {
        const cleanUrl = url.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
        const serverName = name || cleanUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

        const newServer = {
          name: serverName,
          url: cleanUrl,
          status: ServerStatusEnum.DISCONNECTED,
        };

        await serverStorage.addServer(newServer);
        await loadServers();
        serverManagerLogger.debug('Server added', { url: cleanUrl, name: serverName });
        return true;
      } catch (err) {
        serverManagerLogger.error('Failed to add server', err);
        setError(err.message);
        return false;
      }
    },
    [loadServers],
  );

  const deleteServer = useCallback(
    async serverId => {
      try {
        await serverStorage.deleteServer(serverId);
        await loadServers();
        serverManagerLogger.debug('Server deleted', { serverId });
        return true;
      } catch (err) {
        serverManagerLogger.error('Failed to delete server', err);
        setError(err.message);
        return false;
      }
    },
    [loadServers],
  );

  const updateServerStatus = useCallback(
    async (serverUrl, status) => {
      try {
        await serverStorage.updateServerStatus(serverUrl, status);
        await loadServers();
        serverManagerLogger.debug('Server status updated', { serverUrl, status });
        return true;
      } catch (err) {
        serverManagerLogger.error('Failed to update server status', err);
        setError(err.message);
        return false;
      }
    },
    [loadServers],
  );

  const togglePin = useCallback(
    async serverId => {
      try {
        await serverStorage.toggleServerPin(serverId);
        await loadServers();
        serverManagerLogger.debug('Server pin toggled', { serverId });
        return true;
      } catch (err) {
        serverManagerLogger.error('Failed to toggle server pin', err);
        setError(err.message);
        return false;
      }
    },
    [loadServers],
  );

  const selectServer = useCallback(async server => {
    serverManagerLogger.debug('Server selected', { url: server.url });
    return server.url;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    servers,
    isLoading,
    error,
    loadServers,
    addServer,
    deleteServer,
    updateServerStatus,
    togglePin,
    selectServer,
    clearError,
  };
};

export default useServerManager;
