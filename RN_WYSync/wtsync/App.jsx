import './src/config/googleSignIn';
import auth from '@react-native-firebase/auth';
import { StyleSheet, Text, View } from 'react-native';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/services/theme'; // Adjust import path if needed
import { navigationRef } from './src/services/navigationRef';
import { initPushNotifications } from './src/services/PushNotifications';

const App = () => {
  // Push notifications: permission, token registration, tap handling
  useEffect(() => initPushNotifications(), []);

  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;

const styles = StyleSheet.create({});