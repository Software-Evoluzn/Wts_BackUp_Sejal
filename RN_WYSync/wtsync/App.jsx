import './src/config/googleSignIn';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { StyleSheet } from 'react-native';
import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/services/theme';

export const navigationRef = createNavigationContainerRef();

const buildAlertPayload = (data = {}) => ({
  probe: data.probe || data.point || data.probeId || 'T1',
  label: data.label || data.probeLabel || data.title || 'Incomer R phase',
  temperature:
    data.temperature ?? data.currentTemp ?? data.value ?? data.reading,
  threshold: data.threshold ?? data.highLimit ?? data.limit ?? '65',
  durationMinutes: data.durationMinutes ?? data.elapsedMinutes ?? 4,
  probeType: data.probeType || data.probe_type || '4P',
  serialNo: data.serialNo || data.serial_no || data.deviceId || '',
  triggeredAt: data.triggeredAt || data.timestamp || new Date().toISOString(),
});

export const navigateToTemperatureAlert = (data) => {
  if (!data) return;
  const payload = buildAlertPayload(data);

  const tryNavigate = (attempt = 0) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('TemperatureAlert', payload);
    } else if (attempt < 10) {
      setTimeout(() => tryNavigate(attempt + 1), 150);
    }
  };

  tryNavigate();
};

const App = () => {
  const pendingAlertRef = useRef(null);

  useEffect(() => {
    registerNotificationService();

    // 1. App was in background and user tapped the FCM notification
    const unsubscribeOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage?.data) {
        navigateToTemperatureAlert(remoteMessage.data);
      }
    });

    // 2. App was killed/quit and opened by tapping the FCM notification
    messaging()
      .getInitialNotification()
      .then((initialMessage) => {
        if (initialMessage?.data) {
          pendingAlertRef.current = initialMessage.data;
          navigateToTemperatureAlert(initialMessage.data);
        }
      });

    // 3. Foreground FCM messages -> display via Notifee on 'high_priority_alerts'
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage?.data || {};
      const title =
        remoteMessage?.notification?.title ||
        `High temperature at ${data.probe || 'T1'}`;
      const body =
        remoteMessage?.notification?.body ||
        (data.temperature
          ? `${data.label || data.probe || 'Probe'}: ${data.temperature}°C (Limit ${data.threshold || '65'}°C)`
          : 'Threshold exceeded. Tap to inspect.');

      await notifee.displayNotification({
        title,
        body,
        data,
        android: {
          channelId: 'high_priority_alerts',
          importance: AndroidImportance.HIGH,
          pressAction: {
            id: 'default',
          },
        },
      });
    });

    // 4. Tapping a Notifee notification
    const unsubscribeNotifeePress = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS && detail?.notification?.data) {
        navigateToTemperatureAlert(detail.notification.data);
      }
    });

    return () => {
      unsubscribeOpened();
      unsubscribeForeground();
      unsubscribeNotifeePress();
    };
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

  const handleNavigationReady = () => {
    if (pendingAlertRef.current) {
      const queued = pendingAlertRef.current;
      pendingAlertRef.current = null;
      navigationRef.navigate('TemperatureAlert', buildAlertPayload(queued));
    }
  };

  return (
    <ThemeProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={handleNavigationReady}>
        <AppNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

export default App;

const styles = StyleSheet.create({});