// URL validation and connectivity testing
import { useState } from 'react';
import { validateUrl } from '@/shared/helpers/validation';
import { apiClient } from '@/services/api/client';

export const useConnectionManager = () => {
  const [isServerReachable, setIsServerReachable] = useState(null);

  const testConnectivity = async (url) => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL format');
    }

    try {
      const testUrl = url.replace('/global/event', '');
      await apiClient.get(`${testUrl}/command`, {}, null); // Simple connectivity check
      setIsServerReachable(true);
      return true;
    } catch (error) {
      setIsServerReachable(false);
      throw new Error(`Server unreachable: ${error.message}`);
    }
  };

  const validateAndConnect = async (inputUrl) => {
    let urlToUse = inputUrl.trim();

    // Auto-prepend https if needed
    if (!urlToUse.startsWith('http://') && !urlToUse.startsWith('https://')) {
      urlToUse = 'https://' + urlToUse;
    }

    // Test connectivity first
    await testConnectivity(urlToUse);

    // Return clean base URL
    return urlToUse.replace('/global/event', '');
  };

  return {
    isServerReachable,
    testConnectivity,
    validateAndConnect
  };
};