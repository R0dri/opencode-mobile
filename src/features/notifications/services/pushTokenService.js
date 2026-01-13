import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage } from '@/shared/services/storage';
import { STORAGE_KEYS } from '@/shared/constants/storage';
import { logger } from '@/shared/services/logger';

const pushTokenLogger = logger.tag('PushToken');

class PushTokenService {
  constructor() {
    this.token = null;
    this.deviceId = null;
    this.serverBaseUrl = null;
    this.refreshSubscription = null;
  }

  /**
   * @param {string} serverBaseUrl
   * @returns {Promise<string|null>}
   */
  async initialize(serverBaseUrl) {
    if (!Device.isDevice) {
      pushTokenLogger.debug('Skipping - not a physical device');
      return null;
    }

    this.serverBaseUrl = serverBaseUrl;
    this.deviceId = await this.getOrCreateDeviceId();

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      pushTokenLogger.debug('Permission denied');
      return null;
    }

    this.token = await this.getExpoPushToken();
    if (this.token) {
      try {
        await this.registerWithServer();
      } catch (error) {
        pushTokenLogger.warn('Push token registration failed', { error: error.message });
      }
      this.setupRefreshListener();
    }

    return this.token;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getOrCreateDeviceId() {
    let deviceId = await storage.get(STORAGE_KEYS.DEVICE_ID);
    if (!deviceId) {
      deviceId = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await storage.set(STORAGE_KEYS.DEVICE_ID, deviceId);
    }
    return deviceId;
  }

  async getExpoPushToken() {
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        pushTokenLogger.error('No EAS project ID found in app config');
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      await storage.set(STORAGE_KEYS.PUSH_TOKEN, token);

      pushTokenLogger.debug('Acquired push token', { tokenPrefix: token.substring(0, 30) + '...' });
      return token;
    } catch (error) {
      pushTokenLogger.error('Failed to get push token', error);
      return null;
    }
  }

  getTokenApiUrl() {
    return this.serverBaseUrl;
  }

  async registerWithServer() {
    const baseUrl = this.getTokenApiUrl();
    if (!this.token || !baseUrl) {
      pushTokenLogger.debug('Cannot register - missing token or server URL');
      return false;
    }

    try {
      const response = await fetch(`${baseUrl}/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          platform: Platform.OS,
          deviceId: this.deviceId,
        }),
      });

      if (!response.ok) {
        pushTokenLogger.warn('Server registration failed', { status: response.status });
        return false;
      }

      const result = await response.json();
      if (result?.success) {
        pushTokenLogger.debug('Successfully registered with server');
        return true;
      } else {
        pushTokenLogger.warn('Server returned unexpected response', result);
        return false;
      }
    } catch (error) {
      pushTokenLogger.warn('Server registration error', { error: error.message });
      return false;
    }
  }

  setupRefreshListener() {
    this.refreshSubscription?.remove();

    this.refreshSubscription = Notifications.addPushTokenListener(async ({ data }) => {
      pushTokenLogger.debug('Push token refreshed');
      this.token = data;
      await storage.set(STORAGE_KEYS.PUSH_TOKEN, data);
      try {
        await this.registerWithServer();
      } catch (error) {
        pushTokenLogger.warn('Push token re-registration failed', { error: error.message });
      }
    });
  }

  async unregister() {
    const baseUrl = this.getTokenApiUrl();
    if (!baseUrl || !this.deviceId) return;

    try {
      await fetch(`${baseUrl}/push-token`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: this.deviceId }),
      });

      await storage.remove(STORAGE_KEYS.PUSH_TOKEN);
      pushTokenLogger.debug('Unregistered from server');
    } catch (error) {
      pushTokenLogger.error('Unregister error', error);
    }
  }

  async sendTest() {
    const baseUrl = this.getTokenApiUrl();
    if (!baseUrl) return false;

    try {
      const response = await fetch(`${baseUrl}/push-token/test`, { method: 'POST' });
      return response.ok;
    } catch (error) {
      pushTokenLogger.error('Test notification error', error);
      return false;
    }
  }

  cleanup() {
    this.refreshSubscription?.remove();
    this.refreshSubscription = null;
  }
}

export default new PushTokenService();
