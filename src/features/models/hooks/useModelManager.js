// AI model management and selection
import { useState, useCallback } from 'react';
import { apiClient } from '../../../services/api/client';
import { storage } from '../../../services/storage/asyncStorage';
import { STORAGE_KEYS } from '../../../shared/constants/storage';

export const useModelManager = (baseUrl, selectedProject) => {
  const [providers, setProviders] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load available models from server
  const loadModels = useCallback(async () => {
    if (!baseUrl) return;

    setLoading(true);
    try {
      const response = await apiClient.get(`${baseUrl}/config/providers`);
      const data = await apiClient.parseJSON(response);

      // Handle the /config/providers response format
      setProviders(data.providers || []);

      // Load last selected model and set it if available
      const lastModel = await storage.get(STORAGE_KEYS.LAST_SELECTED_MODEL);
      if (lastModel) {
        setSelectedModel(lastModel);
      } else if (data.default && Object.keys(data.default).length > 0) {
        // Use server defaults if no saved preference
        const defaultProvider = Object.keys(data.default)[0];
        const defaultModel = data.default[defaultProvider];
        setSelectedModel({ providerId: defaultProvider, modelId: defaultModel });
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // Select a model and save preference
  const selectModel = useCallback(async (providerId, modelId) => {
    const newModel = { providerId, modelId };
    setSelectedModel(newModel);

    // Save to storage
    await storage.set(STORAGE_KEYS.LAST_SELECTED_MODEL, {
      ...newModel,
      timestamp: Date.now()
    });
  }, []);

  return {
    providers,
    selectedModel,
    loading,
    loadModels,
    selectModel
  };
};