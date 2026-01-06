// Storage-related constants
export const STORAGE_KEYS = {
  LAST_SUCCESSFUL_URL: 'lastSuccessfulUrl',
  LAST_SELECTED_MODEL: 'lastSelectedModel',
  NOTIFICATION_SETTINGS: 'notificationSettings',
  USER_PREFERENCES: 'userPreferences',
  PUSH_TOKEN: 'expoPushToken',
  DEVICE_ID: 'deviceId',
  PENDING_DEEP_LINK: 'pendingDeepLink',
};

export const STORAGE_DEFAULTS = {
  NOTIFICATION_SETTINGS: {
    notificationsEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true
  },
  USER_PREFERENCES: {
    theme: 'light',
    language: 'en',
    autoConnect: true
  }
};