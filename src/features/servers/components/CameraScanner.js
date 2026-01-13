import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTheme } from '@/shared/components/ThemeProvider';

const CameraScanner = ({ visible, onScan, onClose }) => {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const styles = getStyles(theme);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (data) {
      onScan(data);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.instruction}>Position the QR code within the frame to scan</Text>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = theme =>
  StyleSheet.create({
    modal: {
      flex: 1,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      paddingTop: Platform.OS === 'android' ? 40 : 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
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
    cameraContainer: {
      flex: 1,
      overflow: 'hidden',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanArea: {
      width: 250,
      height: 250,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanFrame: {
      width: 220,
      height: 220,
      borderWidth: 2,
      borderColor: theme.colors.accent,
      borderRadius: 12,
      backgroundColor: 'transparent',
    },
    footer: {
      padding: 20,
      alignItems: 'center',
    },
    instruction: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
    },
    cancelButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
    },
    cancelButtonText: {
      fontSize: 16,
      color: theme.colors.textPrimary,
    },
  });

export default CameraScanner;
