import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/shared/components/ThemeProvider';
import ServerList from './ServerList';
import CameraScanner from './CameraScanner';
import { useServerManager } from '../hooks/useServerManager';
import { validateUrl } from '@/shared/helpers/validation';
import { storage } from '@/shared/services/storage';

const ServerConnectionModal = ({
  visible,
  onClose,
  inputUrl,
  setInputUrl,
  onConnect,
  onConnectionSuccess,
  isConnecting,
  isConnected,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { servers, isLoading, error, addServer, deleteServer } = useServerManager();

  const [localUrl, setLocalUrl] = useState(inputUrl || '');
  const [showCamera, setShowCamera] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [pendingServerUrl, setPendingServerUrl] = useState(null);

  React.useEffect(() => {
    if (visible) {
      setLocalUrl(inputUrl || '');
      // Servers are loaded by orchestrator, no need to load here
    }
  }, [visible, inputUrl]);

  // Save pending server when connection succeeds
  React.useEffect(() => {
    if (isConnected && pendingServerUrl) {
      addServer(pendingServerUrl);
      setPendingServerUrl(null);
    }
  }, [isConnected, pendingServerUrl, addServer]);

  const handleConnect = useCallback(
    (url = null) => {
      if (isConnecting || isConnected) return;

      const urlToUse = (url || localUrl || '').trim();
      if (!urlToUse) {
        setLocalError('Please enter a server URL');
        return;
      }

      if (!validateUrl(urlToUse)) {
        setLocalError('Invalid URL format. Use http:// or https://');
        return;
      }

      setLocalError(null);
      setInputUrl(urlToUse);
      onConnect(urlToUse);
      onClose();
    },
    [localUrl, isConnecting, isConnected, setInputUrl, onConnect, onClose],
  );

  const handleScan = useCallback(
    async scannedUrl => {
      setShowCamera(false);

      let parsedUrl = scannedUrl;
      if (scannedUrl.startsWith('http://') || scannedUrl.startsWith('https://')) {
        parsedUrl = scannedUrl.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
      } else {
        parsedUrl = `https://${scannedUrl}`;
      }

      setLocalUrl(parsedUrl);
      setInputUrl(parsedUrl);
      setPendingServerUrl(parsedUrl);
      handleConnect(parsedUrl);
    },
    [setInputUrl, handleConnect],
  );

  const handleServerSelect = useCallback(
    async server => {
      setLocalUrl(server.url);
      setInputUrl(server.url);
      handleConnect(server.url);
    },
    [setInputUrl, handleConnect],
  );

  const handleAddCurrentUrl = useCallback(async () => {
    const urlToUse = localUrl.trim();
    if (!urlToUse || !validateUrl(urlToUse)) {
      setLocalError('Invalid URL format');
      return;
    }

    const cleanUrl = urlToUse.replace(/\/global\/event\/?$/, '').replace(/\/$/, '');
    await addServer(cleanUrl);
    setLocalError(null);
  }, [localUrl, addServer]);

  const handleCloseCamera = useCallback(() => {
    setShowCamera(false);
  }, []);

  return (
    <>
      <Modal
        visible={visible && !showCamera}
        animationType="slide"
        onRequestClose={onClose}
        transparent={true}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.glassBackground || 'rgba(0,0,0,0.5)' },
          ]}
        />
        <SafeAreaView style={styles.container}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Connect to Server</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <Text style={styles.label}>Server URL</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={localUrl}
                  onChangeText={text => {
                    setLocalUrl(text);
                    setLocalError(null);
                  }}
                  placeholder="https://your-server.com"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleConnect}
                />
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setShowCamera(true)}
                  accessibilityLabel="Scan QR code"
                >
                  <Text style={styles.qrButtonText}>📷</Text>
                </TouchableOpacity>
              </View>

              {localError && <Text style={styles.errorText}>{localError}</Text>}

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddCurrentUrl}
                  disabled={!localUrl.trim() || isConnecting || isConnected}
                >
                  <Text style={styles.addButtonText}>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.connectButton,
                    (isConnecting || isConnected) && styles.connectButtonDisabled,
                  ]}
                  onPress={handleConnect}
                  disabled={isConnecting || isConnected}
                >
                  {isConnecting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.connectButtonText}>
                      {isConnected ? 'Connected' : 'Connect'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Saved Servers</Text>
                <View style={styles.dividerLine} />
              </View>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.colors.accent} />
                </View>
              ) : (
                <ServerList
                  servers={servers}
                  onServerSelect={handleServerSelect}
                  onDeleteServer={deleteServer}
                  selectedServerUrl={inputUrl}
                />
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <CameraScanner visible={showCamera} onScan={handleScan} onClose={handleCloseCamera} />
    </>
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
      padding: 8,
    },
    closeButtonText: {
      fontSize: 20,
      color: theme.colors.textSecondary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: theme.colors.glassSurface || theme.colors.surface,
      color: theme.colors.textPrimary,
    },
    qrButton: {
      marginLeft: 8,
      padding: 12,
      backgroundColor: theme.colors.glassSurface || theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
    },
    qrButtonText: {
      fontSize: 20,
    },
    buttonRow: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    addButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.glassSurface || theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.glassBorder || theme.colors.border,
      alignItems: 'center',
      marginRight: 8,
    },
    addButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textPrimary,
    },
    connectButton: {
      flex: 2,
      padding: 14,
      borderRadius: 8,
      backgroundColor: theme.colors.accent,
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
      fontSize: 16,
      fontWeight: 'bold',
      color: '#fff',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 16,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.glassBorder || theme.colors.border,
    },
    dividerText: {
      marginHorizontal: 12,
      fontSize: 12,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorText: {
      fontSize: 13,
      color: theme.colors.error,
      marginBottom: 8,
    },
  });

export default ServerConnectionModal;
