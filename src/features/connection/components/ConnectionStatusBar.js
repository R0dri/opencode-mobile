import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatStatusText, getStatusColor } from '../utils/connectionStatusUtils';
import { useTheme } from '@/shared/components/ThemeProvider';
import { getProjectDisplayName } from '@/shared';
import ModelSelector from '../../models/components/ModelSelector';

/**
 * ConnectionStatusBar component - Comprehensive status bar with connection info, model selection, and controls
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {Function} props.onReconnect - Function to reconnect
 * @param {Function} props.onDisconnect - Function to disconnect
 * @param {Object} props.selectedProject - Currently selected project
 * @param {Object} props.selectedSession - Currently selected session
 * @param {string} props.serverUrl - Server URL
 * @param {Array} props.providers - Available providers
 * @param {Object} props.selectedModel - Currently selected model
 * @param {Function} props.onModelSelect - Function to select model
 * @param {boolean} props.modelsLoading - Whether models are loading
 * @param {Function} props.onFetchModels - Function to fetch models
 * @param {Object} props.groupedUnclassifiedMessages - Grouped messages
 * @param {Function} props.onDebugPress - Function to open debug
 * @param {boolean} props.isSessionBusy - Whether session is busy
 */
const ConnectionStatusBar = ({
  isConnected,
  isConnecting,
  onReconnect,
  onDisconnect,
  selectedProject,
  selectedSession,
  serverUrl,
  providers,
  selectedModel,
  onModelSelect,
  modelsLoading,
  onFetchModels,
  groupedUnclassifiedMessages,
  onDebugPress,
  isSessionBusy,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // Global keyboard shortcut for model selector
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e) => {
        // Only trigger if not focused on input elements
        const activeElement = document.activeElement;
        const isInputFocused = activeElement?.tagName === 'INPUT' ||
                             activeElement?.tagName === 'TEXTAREA';

        if (e.shiftKey && e.key === 'Tab' && !isInputFocused) {
          e.preventDefault();
          setModelDropdownOpen(prev => !prev);
          // Fetch models when opening
          if (!modelDropdownOpen && onFetchModels) {
            onFetchModels();
          }
        }
      };

      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [modelDropdownOpen, onFetchModels]);

  // Icon components with semantic colors
  const RefreshIcon = () => <Feather name="rotate-cw" size={18} color="#2196F3" />;
  const ReconnectIcon = () => <Feather name="refresh-cw" size={18} color="#4CAF50" />;
  const DisconnectIcon = () => <Feather name="power" size={18} color="#F44336" />;
  const DebugIcon = () => <Feather name="bug" size={18} color="#FF6B35" />;

  const IconButton = ({ Icon, onPress, disabled, accessibilityLabel }) => (
    <TouchableOpacity
      style={[styles.iconButton, disabled && styles.iconButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      <Icon />
    </TouchableOpacity>
  );

  // Calculate status display
  const getStatusDisplay = () => {
    if (isConnecting) return { text: 'Connecting...', color: theme.colors.statusConnecting };
    if (isConnected) return { text: 'Connected', color: theme.colors.statusConnected };
    return { text: 'Disconnected', color: theme.colors.statusUnreachable };
  };

  const statusDisplay = getStatusDisplay();

  // Get data with proper fallbacks
  const projectName = selectedProject ? getProjectDisplayName(selectedProject.worktree) : 'None selected';
  const sessionTitle = selectedSession?.title || 'None selected';
  const modelDisplay = selectedModel ? `${selectedModel.providerId}/${selectedModel.modelId}` : 'None selected';

  // Session summary data
  const unclassifiedCount = groupedUnclassifiedMessages ?
    Object.values(groupedUnclassifiedMessages).flat().length : 0;

  return (
    <View style={styles.panel}>
      {/* Header with Status, Model Selector, and Debug */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusDisplay.color }]} />
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.text}
          </Text>
          {isSessionBusy && (
            <View style={[styles.busyDot, { backgroundColor: theme.colors.warning }]} />
          )}
        </View>
         <View style={styles.headerModelSelector}>
           <ModelSelector
             providers={providers}
             selectedModel={selectedModel}
             onModelSelect={onModelSelect}
             loading={modelsLoading}
             onFetchModels={onFetchModels}
             compact={true}
             isOpen={modelDropdownOpen}
             onToggle={() => setModelDropdownOpen(prev => !prev)}
           />
         </View>
        <IconButton
          Icon={DebugIcon}
          onPress={onDebugPress}
          accessibilityLabel="Open debug panel"
        />
      </View>

      {/* Main Content Grid */}
      <View style={styles.content}>
        {/* Left Column */}
        <View style={styles.column}>
          <View style={styles.row}>
            <Text style={styles.label}>Server:</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
              {serverUrl || 'Not connected'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Project:</Text>
            <Text style={styles.value} numberOfLines={1}>
              {projectName}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Session:</Text>
            <Text style={styles.value} numberOfLines={1}>
              {sessionTitle}
            </Text>
          </View>
        </View>

        {/* Right Column - Actions */}
        <View style={styles.actionsColumn}>
          <IconButton
            Icon={ReconnectIcon}
            onPress={onReconnect}
            disabled={!isConnected}
            accessibilityLabel="Reconnect to server"
          />

          <IconButton
            Icon={DisconnectIcon}
            onPress={onDisconnect}
            accessibilityLabel="Disconnect from server"
          />

          <IconButton
            Icon={RefreshIcon}
            onPress={onFetchModels}
            disabled={modelsLoading}
            accessibilityLabel="Refresh available models"
          />
        </View>
      </View>

      {/* Session Summary Footer */}
      {(unclassifiedCount > 0 || isSessionBusy || modelsLoading) && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Session Summary:</Text>
          <View style={styles.summaryItems}>
            {unclassifiedCount > 0 && (
              <Text style={styles.summaryItem}>
                {unclassifiedCount} unclassified message{unclassifiedCount !== 1 ? 's' : ''}
              </Text>
            )}
            {isSessionBusy && (
              <Text style={styles.summaryItem}>Session busy (thinking)</Text>
            )}
            {modelsLoading && (
              <Text style={styles.summaryItem}>Loading models...</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    margin: 8,
    elevation: 2,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  busyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    minWidth: 60,
  },
  value: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  actionsColumn: {
    gap: 6,
    minWidth: 32,
  },
  modelSelectorContainer: {
    flex: 1,
    maxWidth: 200,
  },
  headerModelSelector: {
    flex: 1,
    maxWidth: 140,
    marginHorizontal: 12,
  },
  summary: {
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryItems: {
    gap: 2,
  },
  summaryItem: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
});

export default ConnectionStatusBar;