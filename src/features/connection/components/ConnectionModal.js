import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/components/ThemeProvider';

/**
 * ConnectionModal - Initial server connection setup
 */
const ConnectionModal = ({
  visible,
  onClose,
  inputUrl,
  setInputUrl,
  onConnect,
  isConnecting,
  isConnected,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [localUrl, setLocalUrl] = useState(inputUrl);

  const handleConnect = () => {
    setInputUrl(localUrl);
    onConnect();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={true}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.glassBackground || 'rgba(0,0,0,0.5)' },
        ]}
      />
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Connect to Server</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={localUrl}
            onChangeText={setLocalUrl}
            placeholder="http://localhost:63425"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.connectButton, isConnecting && styles.connectButtonDisabled]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>{isConnected ? 'Connected' : 'Connect'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.glassBackground || theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.glassBorder || theme.colors.border,
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
    content: {
      padding: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '500',
      marginBottom: 8,
      color: theme.colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
      backgroundColor: theme.colors.glassSurface || theme.colors.surface,
      color: theme.colors.textPrimary,
    },
    connectButton: {
      backgroundColor: theme.colors.accent,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      shadowColor: theme.colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    connectButtonDisabled: {
      backgroundColor: theme.colors.textMuted,
      shadowOpacity: 0,
    },
    connectButtonText: {
      color: theme.colors.background, // Keep accessible contrast
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default ConnectionModal;
