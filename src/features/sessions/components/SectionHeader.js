import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import { createStyles } from './styles';

const SectionHeader = ({ title, hasInlineNewSession, onCreateSession, editMode, onToggleEditMode }) => {
  const theme = useTheme();
  const styles = createStyles(theme, { top: 0 }, 400);

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionHeaderText}>
          {title}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={onToggleEditMode}
          activeOpacity={0.7}
        >
          <Text style={styles.editButtonText}>
            {editMode ? 'Done' : 'Edit'}
          </Text>
        </TouchableOpacity>
        {hasInlineNewSession && (
          <TouchableOpacity
            style={styles.inlineNewSessionButton}
            onPress={onCreateSession}
            activeOpacity={0.7}
          >
            <Text style={styles.inlineNewSessionText}>
              New Session
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default SectionHeader;