import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EventScreen from './src/screens/EventScreen';
import { useSSE } from './src/hooks/useSSE';
import { ThemeProvider, useTheme } from './src/shared/components/ThemeProvider';

// App start - entry point
console.log('\n\n===== APP STARTED =====\n\n');

// const Stack = createNativeStackNavigator();

function AppContent() {
  const sseData = useSSE();
  const theme = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <EventScreen {...sseData} />
      </SafeAreaProvider>
      <StatusBar style={theme.colors.statusBarStyle} backgroundColor={theme.colors.background} />
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}


