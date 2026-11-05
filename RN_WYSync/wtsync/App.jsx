import './src/config/googleSignIn';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { StyleSheet } from 'react-native';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/services/theme';

const App = () => {
  useEffect(() => {
    registerNotificationService();
  }, []);

  const registerNotificationService = async () => {
    // 1. Request Permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // 2. High Priority Notification Channel for Android
      await notifee.createChannel({
        id: 'high_priority_alerts',
        name: 'Critical Temperature Alerts',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      // 3. Get FCM Token to store in DB
      const fcmToken = await messaging().getToken();
      console.log('📱 FCM Device Token:', fcmToken);
      // Backend ko API call karke is serial_no ke sath token save kar dein
    }
  };

  return (
    <ThemeProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;

const styles = StyleSheet.create({});