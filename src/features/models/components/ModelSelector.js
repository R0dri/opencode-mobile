import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/shared/components/ThemeProvider';

/**
 * ModelSelector component for choosing AI models
 * @param {Object} props - Component props
 * @param {Array} props.providers - Available providers with their models
 * @param {Object} props.selectedModel - Currently selected model {providerId, modelId}
 * @param {Function} props.onModelSelect - Callback when model is selected
 * @param {boolean} props.loading - Whether models are being loaded
 * @param {Function} props.onFetchModels - Callback to fetch models when dropdown opens
 */
const ModelSelector = ({ providers = [], selectedModel, onModelSelect, loading = false, onFetchModels, compact = false, isOpen, onToggle }) => {
  const theme = useTheme();
  const styles = getStyles(theme, compact);
  const dropdownVisible = isOpen !== undefined ? isOpen : false;

  const toggleDropdown = () => {
    if (onToggle) {
      onToggle();
      // Fetch models when opening the dropdown
      if (!dropdownVisible && onFetchModels) {
        onFetchModels();
      }
    }
  };

  const closeDropdown = () => {
    if (onToggle) {
      // If externally controlled, call onToggle to close
      if (dropdownVisible) {
        onToggle();
      }
    }
  };

  const handleModelSelect = (providerId, modelId) => {
    onModelSelect(providerId, modelId);
    closeDropdown();
  };

  // Find the display name for the selected model
  const getSelectedModelDisplay = () => {
    if (!selectedModel || !providers.length) return compact ? 'Select' : 'Select Model';

    const provider = providers.find(p => p.id === selectedModel.providerId);
    if (!provider || !provider.models) return compact ? 'Select' : 'Select Model';

    // Handle models as object or array
    const modelsArray = Array.isArray(provider.models)
      ? provider.models
      : Object.values(provider.models);

    const model = modelsArray.find(m => m.id === selectedModel.modelId);
    if (!model) return compact ? 'Select' : 'Select Model';

    // Compact mode: show only model name
    return compact ? (model.name || 'Unknown') : (model.name || 'Unknown Model');
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
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={closeDropdown}
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

const getStyles = (theme, compact) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: compact ? 'rgba(255, 255, 255, 0.1)' : theme.colors.surface,
    paddingHorizontal: compact ? 8 : 12,
    paddingVertical: compact ? 6 : 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: compact ? 'rgba(255, 255, 255, 0.2)' : theme.colors.border,
    minWidth: compact ? 100 : 150,
    maxWidth: compact ? 140 : 250,
    minHeight: compact ? 28 : 36,
  },
  selectorText: {
    fontSize: compact ? 12 : 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  dropdownArrow: {
    marginLeft: 4,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    maxHeight: 400,
    width: 300,
    maxWidth: 400,
  },
  modelList: {
    padding: 8,
  },
  modelItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  selectedItem: {
    backgroundColor: theme.colors.surfaceSecondary,
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
    color: theme.colors.textPrimary,
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
    color: theme.colors.textMuted,
    marginTop: 4,
  },
});

export default ModelSelector;