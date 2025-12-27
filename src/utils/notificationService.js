import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification service for opencode mobile app
 */
class NotificationService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize notification service
   */
  async initialize() {
    if (!Device.isDevice) {
      console.log('Notifications not available on simulator');
      this.isInitialized = false;
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      this.isInitialized = false;
      return;
    }

    // Configure notification handler for local notifications only
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    this.isInitialized = true;
    console.log('Notifications initialized for local use only');
  }

  /**
   * Schedule a local notification for new message
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {Object} data - Additional data
   */
  async scheduleNotification(title, body, data = {}) {
    if (!this.isInitialized) {
      console.log('Notifications not initialized, skipping:', { title, body, data });
      return;
    }

    // Check user preferences (if implemented)
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (!parsed.notificationsEnabled) {
          return;
        }
      }
    } catch (error) {
      console.error('Failed to check notification settings:', error);
    }

    console.log('Scheduling local notification:', { title, body, data });
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Set current session for filtering notifications
   * @param {Function} getter - Function to get current session
   */
  setCurrentSessionGetter(getter) {
    this.getCurrentSession = getter;
  }

  /**
   * Check if app is in foreground
   * @returns {boolean} - True if app is active
   */
  isAppActive() {
    return require('react-native').AppState.currentState === 'active';
  }
}

export default new NotificationService();