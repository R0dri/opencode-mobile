import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getProjectDisplayName } from '../utils/projectManager';

/**
 * StatusInfoBar component displaying server URL, project, and session info
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {import('../utils/opencode-types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../utils/opencode-types.js').Session|null} props.selectedSession - Currently selected session
 * @param {string} props.serverUrl - Connected server URL
 */
const StatusInfoBar = ({ isConnected, selectedProject, selectedSession, serverUrl }) => {
  if (!isConnected) {
    return null; // Only show when connected
  }

  return (
    <View style={styles.infoBar}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  infoBar: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
});

export default StatusInfoBar;