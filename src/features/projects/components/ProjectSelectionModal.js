import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { getProjectDisplayName } from '../utils/projectSelectionUtils';
import { useTheme } from '@/shared/components/ThemeProvider';

/**
 * ProjectSelectionModal component - Full-screen modal visualization for project selection
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether modal is visible
 * @param {Function} props.onClose - Function called when modal should close
 * @param {Array} props.projects - Array of available projects
 * @param {Object} props.selectedProject - Currently selected project
 * @param {Function} props.onProjectSelect - Function called when project is selected
 */
const ProjectSelectionModal = ({ visible, onClose, projects, selectedProject, onProjectSelect }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const handleSelect = (project) => {
    onProjectSelect(project);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.modalWrapper}>
        <View style={styles.container}>
          <Text style={styles.title}>Select Project</Text>
          <FlatList
            data={projects}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
               <TouchableOpacity onPress={() => handleSelect(item)} style={styles.item}>
                 <Text style={styles.itemText}>{item.name}</Text>
               </TouchableOpacity>
             )}
           />
           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
             <Text style={styles.closeButtonText}>Close</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  modalWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { flex: 1, maxWidth: 600, width: '100%', padding: 20, backgroundColor: theme.colors.background, borderRadius: 10 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: theme.colors.textPrimary },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  itemText: { color: theme.colors.textPrimary },
  closeButton: { marginTop: 20, padding: 10, backgroundColor: theme.colors.surface },
  closeButtonText: { color: theme.colors.textPrimary },
});

export default ProjectSelectionModal;