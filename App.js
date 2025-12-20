import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import EventScreen from './src/screens/EventScreen';

export default function App() {
  return (
    <View style={styles.container}>
      <EventScreen />
      <StatusBar style="dark" backgroundColor="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
