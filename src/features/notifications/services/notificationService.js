import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import { storage } from '@/shared/services/storage';
import { STORAGE_KEYS } from '@/shared/constants/storage';

class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  async initialize() {
    if (!Device.isDevice) {
      console.debug('[Notifications] Not available on simulator');
      this.isInitialized = false;
      return;
    }

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
      console.debug('[Notifications] Permission not granted');
      this.isInitialized = false;
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
    console.debug('[Notifications] Initialized successfully');
  }

  async scheduleNotification(title, body, data = {}) {
    if (!this.isInitialized) {
      console.debug('[Notifications] Not initialized, skipping:', { title, body });
      return;
    }

    try {
      const settings = await storage.get(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (settings && !settings.notificationsEnabled) {
        return;
      }
    } catch (error) {
      console.error('[Notifications] Failed to check settings:', error);
    }

    console.debug('[Notifications] Scheduling:', { title, body });

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

  setCurrentSessionGetter(getter) {
    this.getCurrentSession = getter;
  }

  isAppActive() {
    return AppState.currentState === 'active';
  }
}

export default new NotificationService();
