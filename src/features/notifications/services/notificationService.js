import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import { storage } from '@/shared/services/storage';
import { STORAGE_KEYS } from '@/shared/constants/storage';
import { logger } from '@/shared/services/logger';

const notificationLogger = logger.tag('Notifications');

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (!Device.isDevice) {
      notificationLogger.debug('Not available on simulator');
      this.isInitialized = false;
      return;
    }

    const doInit = async () => {
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

      if (finalStatus !== 'granted') {
        notificationLogger.debug('Permission not granted');
        this.isInitialized = false;
        this.initPromise = null;
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      this.isInitialized = true;
      this.initPromise = null;
      notificationLogger.debug('Initialized successfully');
    };

    this.initPromise = doInit();
    return this.initPromise;
  }

  async scheduleNotification(title, body, data = {}) {
    if (!this.isInitialized) {
      notificationLogger.debug('Not initialized, skipping notification', { title, body });
      return;
    }

    try {
      const settings = await storage.get(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (settings && !settings.notificationsEnabled) {
        return;
      }
    } catch (error) {
      notificationLogger.error('Failed to check notification settings', error);
    }

    notificationLogger.debug('Scheduling notification', { title, body });

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null,
    });
  }

  async scheduleUrlUpdateNotification(newUrl) {
    if (!this.isInitialized) {
      notificationLogger.debug('Not initialized, skipping URL update notification');
      return;
    }

    notificationLogger.info('Scheduling URL update notification', { newUrl });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Server URL Updated',
        body: 'Tap to reconnect with the new server address',
        data: {
          type: 'url_update',
          newUrl,
        },
        sound: 'default',
      },
      trigger: null,
    });
  }

  setCurrentSessionGetter(getter) {
    this.getCurrentSession = getter;
  }

  isAppActive() {
    return AppState.currentState === 'active';
  }
}

export default new NotificationService();
