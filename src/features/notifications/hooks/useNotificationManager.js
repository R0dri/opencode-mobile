import { useEffect, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import notificationService from '../services/notificationService';
import pushTokenService from '../services/pushTokenService';
import deepLinkService from '../services/deepLinkService';
import { logger } from '@/shared/services/logger';

const notificationManagerLogger = logger.tag('NotificationManager');

export const useNotificationManager = ({ serverBaseUrl, onDeepLink, onUrlUpdate } = {}) => {
  const initialized = useRef(false);
  const serverUrlRef = useRef(serverBaseUrl);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    serverUrlRef.current = serverBaseUrl;
  }, [serverBaseUrl]);

  useEffect(() => {
    if (initialized.current) return;

    const init = async () => {
      await notificationService.initialize();

      if (onDeepLink) {
        deepLinkService.initialize(onDeepLink);
        await deepLinkService.checkPendingDeepLink();
      }

      // Set up notification response listener for URL updates
      subscriptionRef.current = Notifications.addNotificationResponseReceivedListener(response => {
        const { data } = response.notification.request.content;

        if (data?.type === 'url_update' && data?.newUrl) {
          notificationManagerLogger.info('User tapped URL update notification', {
            newUrl: data.newUrl,
          });

          if (onUrlUpdate) {
            onUrlUpdate(data.newUrl);
          }
        }
      });

      initialized.current = true;

      // Initialize push token service if serverBaseUrl is already available
      if (serverUrlRef.current) {
        await pushTokenService.initialize(serverUrlRef.current);
      }
    };

    init();

    return () => {
      deepLinkService.cleanup();
      pushTokenService.cleanup();
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, [onDeepLink, onUrlUpdate]);

  const scheduleNotification = useCallback(async (title, body, data = {}) => {
    await notificationService.scheduleNotification(title, body, data);
  }, []);

  const sendTestNotification = useCallback(async () => {
    return await pushTokenService.sendTest();
  }, []);

  const unregisterDevice = useCallback(async () => {
    await pushTokenService.unregister();
  }, []);

  return {
    scheduleNotification,
    sendTestNotification,
    unregisterDevice,
  };
};
