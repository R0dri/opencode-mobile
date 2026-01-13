import { storage } from '@/shared/services/storage';
import { STORAGE_KEYS } from '@/shared/constants/storage';
import { logger } from '@/shared/services/logger';
import { ServerStatusEnum } from '../types/server.types';

const serverLogger = logger.tag('ServerStorage');

const STORAGE_KEY = STORAGE_KEYS.SERVERS || '@servers';

/**
 * Load all saved servers from storage
 * @returns {Promise<Array<import('../types/server.types').Server>>} Array of saved servers
 */
export const loadServers = async () => {
  try {
    const servers = await storage.get(STORAGE_KEY);
    const parsed = servers ? JSON.parse(servers) : [];
    serverLogger.debug('Loaded servers from storage', { count: parsed.length });
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    serverLogger.error('Failed to load servers', error);
    return [];
  }
};

/**
 * Save servers array to storage
 * @param {Array<import('../types/server.types').Server>} servers - Servers to save
 * @returns {Promise<boolean>} Success status
 */
const saveServers = async servers => {
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(servers));
    serverLogger.debug('Servers saved to storage', { count: servers.length });
    return true;
  } catch (error) {
    serverLogger.error('Failed to save servers', error);
    return false;
  }
};

/**
 * Add a new server to storage
 * @param {import('../types/server.types').Server} server - Server to add
 * @returns {Promise<boolean>} Success status
 */
export const addServer = async server => {
  const servers = await loadServers();

  const existingIndex = servers.findIndex(s => s.url === server.url);
  if (existingIndex >= 0) {
    servers[existingIndex] = { ...servers[existingIndex], ...server };
  } else {
    const newServer = {
      ...server,
      id: server.id || `server_${Date.now()}`,
      isPinned: server.isPinned ?? false,
      connectionCount: 0,
    };
    servers.push(newServer);
  }

  return saveServers(servers);
};

/**
 * Update an existing server
 * @param {string} serverId - ID of server to update
 * @param {Partial<import('../types/server.types').Server>} updates - Fields to update
 * @returns {Promise<boolean>} Success status
 */
export const updateServer = async (serverId, updates) => {
  const servers = await loadServers();
  const index = servers.findIndex(s => s.id === serverId);

  if (index < 0) {
    serverLogger.warn('Server not found for update', { serverId });
    return false;
  }

  servers[index] = { ...servers[index], ...updates };
  return saveServers(servers);
};

/**
 * Delete a server from storage
 * @param {string} serverId - ID of server to delete
 * @returns {Promise<boolean>} Success status
 */
export const deleteServer = async serverId => {
  const servers = await loadServers();
  const filtered = servers.filter(s => s.id !== serverId);

  if (filtered.length === servers.length) {
    serverLogger.warn('Server not found for deletion', { serverId });
    return false;
  }

  return saveServers(filtered);
};

/**
 * Update server connection status
 * @param {string} serverUrl - URL of server to update
 * @param {string} status - New status from ServerStatusEnum
 * @returns {Promise<boolean>} Success status
 */
export const updateServerStatus = async (serverUrl, status) => {
  const servers = await loadServers();
  const index = servers.findIndex(s => s.url === serverUrl);

  if (index < 0) {
    return false;
  }

  servers[index] = {
    ...servers[index],
    status,
    lastConnected:
      status === ServerStatusEnum.CONNECTED
        ? new Date().toISOString()
        : servers[index].lastConnected,
    connectionCount:
      status === ServerStatusEnum.CONNECTED
        ? (servers[index].connectionCount || 0) + 1
        : servers[index].connectionCount,
  };

  return saveServers(servers);
};

/**
 * Toggle server pin status
 * @param {string} serverId - ID of server to pin/unpin
 * @returns {Promise<boolean>} Success status
 */
export const toggleServerPin = async serverId => {
  const servers = await loadServers();
  const index = servers.findIndex(s => s.id === serverId);

  if (index < 0) {
    return false;
  }

  servers[index] = {
    ...servers[index],
    isPinned: !servers[index].isPinned,
  };

  return saveServers(servers);
};

/**
 * Get sorted servers list (pinned first, then by lastConnected)
 * @returns {Promise<Array<import('../types/server.types').Server>>} Sorted servers
 */
export const getSortedServers = async () => {
  const servers = await loadServers();

  return [...servers].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (a.lastConnected && b.lastConnected) {
      return new Date(b.lastConnected) - new Date(a.lastConnected);
    }
    if (a.lastConnected) return -1;
    if (b.lastConnected) return 1;

    return a.name.localeCompare(b.name);
  });
};

export default {
  loadServers,
  addServer,
  updateServer,
  deleteServer,
  updateServerStatus,
  toggleServerPin,
  getSortedServers,
};
