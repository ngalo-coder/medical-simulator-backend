import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SimulationScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Simulation Screen - Coming Soon!</Text>
      <Text style={styles.subtext}>Interactive medical case simulation</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});

export default SimulationScreen;