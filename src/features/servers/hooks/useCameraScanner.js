import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { logger } from '@/shared/services/logger';

const cameraLogger = logger.tag('CameraScanner');

export const useCameraScanner = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const cameraRef = useRef(null);
  const hasScannedRef = useRef(false);

  const isPermissionGranted = permission?.granted;

  const checkPermission = useCallback(async () => {
    if (!permission) {
      cameraLogger.debug('Camera permission not yet determined');
      return false;
    }

    if (permission.status === 'undetermined') {
      cameraLogger.debug('Camera permission undetermined, requesting...');
      const result = await requestPermission();
      return result.granted;
    }

    return permission.granted;
  }, [permission, requestPermission]);

  const startScanning = useCallback(async () => {
    setError(null);
    setScannedData(null);
    hasScannedRef.current = false;

    const hasPermission = await checkPermission();

    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        const permError = new Error('Camera permission is required to scan QR codes');
        cameraLogger.warn('Camera permission denied');
        setError(permError.message);
        return false;
      }
    }

    setIsScanning(true);
    cameraLogger.debug('Camera scanning started');
    return true;
  }, [checkPermission, requestPermission]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    setScannedData(null);
    hasScannedRef.current = false;
    cameraLogger.debug('Camera scanning stopped');
  }, []);

  const handleBarCodeScanned = useCallback(({ type, data }) => {
    if (hasScannedRef.current) {
      return;
    }

    cameraLogger.debug('Barcode scanned', { type, data });

    hasScannedRef.current = true;
    setScannedData(data);
    setIsScanning(false);

    try {
      let url = data;

      if (data.startsWith('http://') || data.startsWith('https://')) {
        url = data;
      } else if (data.startsWith('opencode://')) {
        url = data.replace('opencode://', 'https://');
      } else if (data.includes('://')) {
        url = `https://${data}`;
      } else {
        url = `https://${data}`;
      }

      cameraLogger.debug('Parsed URL from QR', { original: data, parsed: url });
      setScannedData(url);
    } catch (err) {
      cameraLogger.error('Failed to parse QR data', err);
      setError('Invalid QR code format');
    }
  }, []);

  const resetScan = useCallback(() => {
    setScannedData(null);
    hasScannedRef.current = false;
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (isScanning) {
        stopScanning();
      }
    };
  }, [isScanning, stopScanning]);

  return {
    isScanning,
    isPermissionGranted,
    scannedData,
    error,
    requestPermission,
    startScanning,
    stopScanning,
    handleBarCodeScanned,
    resetScan,
    cameraRef,
  };
};

export default useCameraScanner;
