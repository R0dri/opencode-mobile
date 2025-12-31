import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../shared/components/ThemeProvider';

/**
 * ProjectSelectionModal - Project browser and selector
 */
const ProjectSelectionModal = ({ visible, onClose, projects, onProjectSelect, selectedProject }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const screenWidth = Dimensions.get('window').width;
  const modalWidth = Math.min(screenWidth * 0.9, 600);

  const renderProjectItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.projectItem,
        selectedProject?.id === item.id && styles.projectItemSelected
      ]}
      onPress={() => {
        onProjectSelect(item);
        onClose();
      }}
    >
      <View style={styles.projectInfo}>
        <Text style={styles.projectName}>{item.name || 'Unnamed Project'}</Text>
        <Text style={styles.projectPath}>{item.worktree || item.directory}</Text>
      </View>
      {selectedProject?.id === item.id && (
        <Text style={styles.selectedIndicator}>✓</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={[styles.content, { width: modalWidth }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Project</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={projects}
            keyExtractor={(item) => item.id}
            renderItem={renderProjectItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No projects available</Text>
                <Text style={styles.emptySubtext}>Make sure the server is running and has projects configured</Text>
              </View>
            }
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  projectItemSelected: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.surface,
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  projectPath: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  selectedIndicator: {
    fontSize: 18,
    color: theme.colors.accent,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});

export default ProjectSelectionModal;