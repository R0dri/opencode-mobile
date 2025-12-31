import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getProjectDisplayName } from '../features';

/**
 * StatusInfoBar component displaying server URL, project, and session info
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Whether SSE is connected
 * @param {import('../features/projects/types/project.types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../shared/types/opencode.types.js').Session|null} props.selectedSession - Currently selected session
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
                <Path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#666666" />
              </Svg>
              <Text style={styles.infoLabelText}>Session</Text>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabelText: {
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