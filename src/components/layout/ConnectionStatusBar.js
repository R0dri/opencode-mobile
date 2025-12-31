import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../shared/components/ThemeProvider';
import { getProjectDisplayName } from '../../features';
import ModelSelector from '../ModelSelector';
import SessionStatusIndicator from '../SessionStatusIndicator';

/**
 * InfoBar component displaying server URL, project, session info, and model selector
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {Function} props.onReconnect - Function to handle reconnect
 * @param {Function} props.onDisconnect - Function to handle disconnect
 * @param {import('../features/projects/types/project.types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../shared/types/opencode.types.js').Session|null} props.selectedSession - Currently selected session
 * @param {string} props.serverUrl - Connected server URL
 * @param {Array} props.providers - Available model providers
 * @param {Object} props.selectedModel - Currently selected model
 * @param {Function} props.onModelSelect - Callback for model selection
 * @param {boolean} props.modelsLoading - Whether models are loading
 * @param {Function} props.onFetchModels - Callback to fetch models
 * @param {Object} props.groupedUnclassifiedMessages - Grouped unclassified messages for debug
 * @param {Function} props.onDebugPress - Callback to open debug screen
 * @param {boolean} props.isSessionBusy - Whether the session is busy
 */
const InfoBar = ({ isConnected, isConnecting, onReconnect, onDisconnect, selectedProject, selectedSession, serverUrl, providers, selectedModel, onModelSelect, modelsLoading, onFetchModels, groupedUnclassifiedMessages, onDebugPress, isSessionBusy }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (!isConnected) {
    return null; // Only show when connected
  }

  const hasUnclassifiedMessages = Object.keys(groupedUnclassifiedMessages || {}).length > 0;

  return (
    <View style={styles.infoBar}>
      <View style={styles.contentContainer}>
         <View style={styles.infoContainer}>
           {serverUrl && (
            <View style={styles.infoItem}>
              <View style={styles.infoLabel}>
                <Svg width="12" height="12" viewBox="0 0 24 24">
                  <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#666666" />
                </Svg>
                <Text style={styles.infoLabelText}>Server</Text>
              </View>
              <Text style={styles.infoValue}>{serverUrl.replace('http://', '').replace('https://', '')}</Text>
            </View>
          )}
          {selectedProject && (
            <View style={styles.infoItem}>
              <View style={styles.infoLabel}>
                <Svg width="12" height="12" viewBox="0 0 24 24">
                  <Path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#666666" />
                </Svg>
                <Text style={styles.infoLabelText}>Project</Text>
              </View>
              <Text style={styles.infoValue}>{getProjectDisplayName(selectedProject.worktree)}</Text>
             </View>
            )}
            {selectedSession && (
              <View style={styles.infoItem}>
                <View style={styles.infoLabel}>
                  <Svg width="12" height="12" viewBox="0 0 24 24">
                    <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#666666" />
                  </Svg>
                  <Text style={styles.infoLabelText}>Session</Text>
                </View>
                <Text style={styles.infoValue}>{selectedSession.id}</Text>
              </View>
            )}
             <View style={styles.modelSelectorContainer}>
             <ModelSelector
               providers={providers}
               selectedModel={selectedModel}
               onModelSelect={onModelSelect}
               loading={modelsLoading}
               onFetchModels={onFetchModels}
             />
            </View>
          </View>

        <View style={styles.controlButtons}>
           <TouchableOpacity
             style={[styles.controlButton, styles.reconnectButton]}
             onPress={onReconnect}
             disabled={isConnecting}
           >
             <Text style={styles.controlButtonText}>🔄</Text>
           </TouchableOpacity>

           <TouchableOpacity
             style={[styles.controlButton, styles.disconnectButton]}
             onPress={onDisconnect}
           >
             <Text style={styles.controlButtonText}>❌</Text>
           </TouchableOpacity>

           {hasUnclassifiedMessages && (
             <TouchableOpacity
               style={[styles.controlButton, styles.debugButton]}
               onPress={onDebugPress}
             >
               <Text style={styles.controlButtonText}>⚠️</Text>
             </TouchableOpacity>
           )}
          </View>
       </View>
       <SessionStatusIndicator sessionStatus={isSessionBusy ? 'busy' : 'idle'} />
     </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  infoBar: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    minHeight: 100,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoContainer: {
    flexDirection: 'column',
    flex: 1,
    gap: 10,
  },
  modelSelectorContainer: {
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabelText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reconnectButton: {
    backgroundColor: theme.colors.textMuted,
  },
  disconnectButton: {
    backgroundColor: theme.colors.surfaceSecondary,
  },
  debugButton: {
    backgroundColor: theme.colors.warning,
  },
  controlButtonText: {
    fontSize: 14,
    color: theme.colors.background,
  },
});

export default InfoBar;