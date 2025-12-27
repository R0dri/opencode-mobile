import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * ModelSelector component for choosing AI models
 * @param {Object} props - Component props
 * @param {Array} props.providers - Available providers with their models
 * @param {Object} props.selectedModel - Currently selected model {providerId, modelId}
 * @param {Function} props.onModelSelect - Callback when model is selected
 * @param {boolean} props.loading - Whether models are being loaded
 * @param {Function} props.onFetchModels - Callback to fetch models when dropdown opens
 */
const ModelSelector = ({ providers = [], selectedModel, onModelSelect, loading = false, onFetchModels }) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const toggleDropdown = () => {
    const willBeVisible = !dropdownVisible;
    setDropdownVisible(willBeVisible);

    // Fetch models when opening the dropdown
    if (willBeVisible && onFetchModels) {
      onFetchModels();
    }
  };

  const handleModelSelect = (providerId, modelId) => {
    onModelSelect(providerId, modelId);
    setDropdownVisible(false);
  };

  // Find the display name for the selected model
  const getSelectedModelDisplay = () => {
    if (!selectedModel || !providers.length) return 'Select Model';

    const provider = providers.find(p => p.id === selectedModel.providerId);
    if (!provider || !provider.models) return 'Select Model';

    // Handle models as object or array
    const modelsArray = Array.isArray(provider.models)
      ? provider.models
      : Object.values(provider.models);

    const model = modelsArray.find(m => m.id === selectedModel.modelId);
    return model ? (model.name || 'Unknown Model') : 'Select Model';
  };

  // Create flat list of all models with provider info
  const allModels = providers.flatMap(provider => {
    if (!provider || !provider.models) {
      console.warn('Provider missing models:', provider);
      return [];
    }

    // Handle models as object (keyed by model ID) or array
    const modelsArray = Array.isArray(provider.models)
      ? provider.models
      : Object.values(provider.models);

    return modelsArray.map(model => ({
      ...model,
      providerId: provider.id,
      providerName: provider.name,
      displayName: `${provider.name}: ${model.name}`
    }));
  });

  const renderModelItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.modelItem,
        selectedModel?.providerId === item.providerId && selectedModel?.modelId === item.id && styles.selectedItem
      ]}
      onPress={() => handleModelSelect(item.providerId, item.id)}
    >
      <View style={styles.modelContent}>
        <View style={styles.modelInfo}>
          <Text style={styles.modelName}>{item.displayName}</Text>
          {item.description && (
            <Text style={styles.modelDescription}>{item.description}</Text>
          )}
        </View>
        <View style={styles.modelBadges}>
          {item.cost && item.cost.input === 0 && item.cost.output === 0 && (
            <Text style={styles.freeBadge}>FREE</Text>
          )}
          {selectedModel?.providerId === item.providerId && selectedModel?.modelId === item.id && (
            <Text style={styles.selectedBadge}>SELECTED</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.selectorButton} onPress={toggleDropdown}>
        <Text style={styles.selectorText} numberOfLines={1}>
          {getSelectedModelDisplay()}
        </Text>
        <Svg width="12" height="12" viewBox="0 0 24 24" style={styles.dropdownArrow}>
          <Path d={dropdownVisible ? "M7 14l5-5 5 5z" : "M7 10l5 5 5-5z"} fill="#666666" />
        </Svg>
      </TouchableOpacity>

      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <FlatList
              data={allModels}
              keyExtractor={(item) => `${item.providerId}-${item.id}`}
              renderItem={renderModelItem}
              showsVerticalScrollIndicator={false}
              style={styles.modelList}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 150,
    maxWidth: 250,
    minHeight: 36,
  },
  selectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  dropdownArrow: {
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxHeight: Dimensions.get('window').height * 0.6,
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 400,
  },
  modelList: {
    padding: 8,
  },
  modelItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#f0f8ff',
  },
  modelContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  modelBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  freeBadge: {
    backgroundColor: '#4caf50',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  selectedBadge: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  modelDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
});

export default ModelSelector;