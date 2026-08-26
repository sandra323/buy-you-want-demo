import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { sharedSmoke } from './src/shared-smoke';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>LightBuy</Text>
      <Text>{sharedSmoke.sample.message}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
