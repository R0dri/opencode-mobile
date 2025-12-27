import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { getProjectDisplayName } from '../utils/projectManager';

/**
 * ProjectList component for displaying available projects as centered cards
 * @param {Object} props - Component props
 * @param {Array<import('../utils/opencode-types.js').Project>} props.projects - Array of projects to display
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onProjectSelect - Function called when a project is selected
 * @param {Function} props.onClose - Function called when modal is closed
 */
const ProjectList = ({ projects, visible, onProjectSelect, onClose }) => {
  const handleProjectSelect = (project) => {
    onProjectSelect(project);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Select a Project</Text>
          <Text style={styles.subtitle}>Choose a project to browse its sessions</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => handleProjectSelect(project)}
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
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    maxHeight: 400,
  },
  projectCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
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
    justifyContent: 'center',
    gap: 6,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
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
    color: '#666',
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
    color: '#999',
    fontFamily: 'monospace',
  },
  projectDate: {
    fontSize: 12,
    color: '#999',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProjectList;