import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

import EventScreen from './src/screens/EventScreen';
import CustomDrawerContent from './src/components/CustomDrawerContent';
import { useSSE } from './src/hooks/useSSE';

const Drawer = createDrawerNavigator();

export default function App() {
  const sseData = useSSE();

  useEffect(() => {
    console.log('\n\n🚀 ===== APP STARTED =====\n\n');
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Drawer.Navigator
          drawerContent={(props) => (
            <CustomDrawerContent
              {...props}
              sessions={sseData.projectSessions}
              selectedSession={sseData.selectedSession}
              onSessionSelect={sseData.selectSession}
              deleteSession={sseData.deleteSession}
            />
          )}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Drawer.Screen name="EventScreen">
            {(props) => <EventScreen {...props} {...sseData} />}
          </Drawer.Screen>
        </Drawer.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" backgroundColor="#ffffff" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
