import { useEffect, useCallback, useRef } from 'react';
import notificationService from '../services/notificationService';
import pushTokenService from '../services/pushTokenService';
import deepLinkService from '../services/deepLinkService';

export const useNotificationManager = ({ serverBaseUrl, onDeepLink } = {}) => {
  const initialized = useRef(false);
  const serverUrlRef = useRef(serverBaseUrl);

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

      initialized.current = true;

      // Race condition fix: serverBaseUrl may already be set when async init completes
      if (serverUrlRef.current) {
        pushTokenService.initialize(serverUrlRef.current);
      }
    };

    init();

    return () => {
      deepLinkService.cleanup();
      pushTokenService.cleanup();
    };
  }, [onDeepLink]);

  useEffect(() => {
    if (serverBaseUrl && initialized.current) {
      pushTokenService.initialize(serverBaseUrl);
    }
  }, [serverBaseUrl]);

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
