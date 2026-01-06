import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getProjectDisplayName } from '@/shared';
import { useTheme } from '@/shared/components/ThemeProvider';

/**
 * EmbeddedProjectSelector component - Inline embeddable visualization for project selection
 * @param {Object} props - Component props
 * @param {Array} props.projects - Array of projects to display
 * @param {Function} props.onProjectPress - Function called when a project is selected
 */
const EmbeddedProjectSelector = ({ projects, onProjectPress }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Project</Text>
      <Text style={styles.subtitle}>Choose a project to browse its sessions</Text>

      {projects && projects.length > 0 ? (
        projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            onPress={() => onProjectPress(project)}
            activeOpacity={0.7}
          >
            <View style={styles.projectHeader}>
              <View style={styles.projectNameContainer}>
                <Svg width="16" height="16" viewBox="0 0 24 24">
                  <Path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.89 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#666666" />
                </Svg>
                <Text style={styles.projectName} numberOfLines={1}>
                  {getProjectDisplayName(project.worktree)}
                </Text>
              </View>
              {project.vcs && (
                <View style={styles.vcsBadge}>
                  <Text style={styles.vcsText}>{project.vcs.toUpperCase()}</Text>
                </View>
              )}
            </View>

            <Text style={styles.projectPath} numberOfLines={2}>
              {project.worktree}
            </Text>

            <View style={styles.projectFooter}>
              <Text style={styles.projectId}>
                ID: {project.id.slice(0, 8)}...
              </Text>
              <Text style={styles.projectDate}>
                {new Date(project.time.created).toLocaleDateString()}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={styles.noProjects}>No projects available</Text>
      )}
    </View>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.background,
    maxWidth: 600,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  projectCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  vcsBadge: {
    backgroundColor: '#007bff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  vcsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  projectPath: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  projectId: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontFamily: 'monospace',
  },
  projectDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  noProjects: {
    textAlign: 'center',
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 40,
  },
});

export default EmbeddedProjectSelector;