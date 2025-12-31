import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * BreadcrumbSlider component for navigation path display
 * @param {Object} props - Component props
 * @param {import('../features/projects/types/project.types.js').Project|null} props.selectedProject - Currently selected project
 * @param {import('../shared/types/opencode.types.js').Session|null} props.selectedSession - Currently selected session
 * @param {Function} props.onProjectPress - Function called when project is pressed
 * @param {Function} props.onSessionPress - Function called when session is pressed
 */
const BreadcrumbSlider = ({ selectedProject, selectedSession, onProjectPress, onSessionPress }) => {
  // console.debug('DEBUG: BreadcrumbSlider rendering', { selectedProject: typeof selectedProject, selectedSession: typeof selectedSession, onProjectPress: typeof onProjectPress, onSessionPress: typeof onSessionPress });
  return (
    <View style={styles.breadcrumb}>
      {selectedProject && (
        <TouchableOpacity style={styles.breadcrumbItem} onPress={onProjectPress}>
          <Text style={styles.breadcrumbText} numberOfLines={1}>
            {selectedProject.name || 'Project'}
          </Text>
        </TouchableOpacity>
      )}
      {selectedProject && selectedSession && (
          <Svg width="12" height="12" viewBox="0 0 24 24" style={styles.chevron}>
          <Path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="#666" />
        </Svg>
      )}
      {selectedSession && (
        <TouchableOpacity style={styles.breadcrumbItem} onPress={onSessionPress}>
          <Text style={[styles.breadcrumbText, styles.sessionText]} numberOfLines={1}>
            {selectedSession.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breadcrumbItem: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  breadcrumbText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  sessionText: {
    color: '#1976d2',
  },
  chevron: {
    marginHorizontal: 4,
  },
});

export default BreadcrumbSlider;