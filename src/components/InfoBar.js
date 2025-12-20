import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { getProjectDisplayName } from '../utils/projectManager';

/**
 * InfoBar component displaying server URL, project, and session info
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {boolean} props.isConnecting - Whether SSE is connecting
 * @param {Function} props.onReconnect - Function to handle reconnect
 * @param {Function} props.onDisconnect - Function to handle disconnect
 * @param {import('../utils/opencode-types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../utils/opencode-types.js').Session|null} props.selectedSession - Currently selected session
 * @param {string} props.serverUrl - Connected server URL
 */
const InfoBar = ({ isConnected, isConnecting, onReconnect, onDisconnect, selectedProject, selectedSession, serverUrl }) => {
  if (!isConnected) {
    return null; // Only show when connected
  }

  return (
    <View style={styles.infoBar}>
      <View style={styles.contentContainer}>
        <View style={styles.infoContainer}>
          {serverUrl && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>🌐 Server</Text>
              <Text style={styles.infoValue}>{serverUrl.replace('http://', '').replace('https://', '')}</Text>
            </View>
          )}
          {selectedProject && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>📁 Project</Text>
              <Text style={styles.infoValue}>{getProjectDisplayName(selectedProject.worktree)}</Text>
            </View>
          )}
          {selectedSession && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>🎯 Session</Text>
              <Text style={styles.infoValue}>{selectedSession.title}</Text>
            </View>
          )}
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
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoContainer: {
    flexDirection: 'column',
    flex: 1,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#808080',
  },
  disconnectButton: {
    backgroundColor: '#a0a0a0',
  },
  controlButtonText: {
    fontSize: 14,
  },
});

export default InfoBar;