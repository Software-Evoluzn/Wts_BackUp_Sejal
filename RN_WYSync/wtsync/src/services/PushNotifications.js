/**
 * Push notifications (Firebase Cloud Messaging + Notifee).
 *
 *  - asks for the notification permission (Android 13+ shows a system dialog)
 *  - creates the high-importance "Temperature alerts" channel (heads-up + sound)
 *  - registers this phone's FCM token with the backend after login
 *  - app OPEN:       FCM does not draw anything itself, so Notifee shows the alert
 *  - app BACKGROUND / CLOSED: Android shows it (the backend sends a "notification" message)
 *  - tapping a notification opens that device's dashboard
 *
 * Call initPushNotifications() once from App.jsx.
 * Call unregisterPushToken() before signing out (AuthService.logoutUser does).
 */
import { Platform } from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

import IP_ADDRESS from './ipconfig';
import { navigateToDevice } from './navigationRef';

// Must match ALERT_CHANNEL_ID in the backend's fcm_service.py and the
// default_notification_channel_id entry in AndroidManifest.xml
export const ALERT_CHANNEL_ID = 'temperature_alerts';

const REQUEST_TIMEOUT_MS = 10000;

const postJson = async (path, body, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${IP_ADDRESS}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // non-JSON reply
    }
    return { ok: response.ok, status: response.status, data };
  } finally {
    clearTimeout(timer);
  }
};

const ensureChannel = () =>
  notifee.createChannel({
    id: ALERT_CHANNEL_ID,
    name: 'Temperature alerts',
    importance: AndroidImportance.HIGH, // heads-up banner + sound
    vibration: true,
  });

// Android 13+ needs the user's permission, older Android returns "authorized" at once
const ensurePermission = async () => {
  try {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1; // 1 = authorized, 2 = provisional
  } catch (e) {
    console.log('[push] permission request failed', e);
    return false;
  }
};

// ---- token <-> backend ------------------------------------------------------

const registerToken = async (token) => {
  const user = getAuth().currentUser;
  if (!user || !token) return false;

  const idToken = await user.getIdToken();
  const res = await postJson('/api/push/register', {
    id_token: idToken,
    fcm_token: token,
    platform: Platform.OS,
  });
  console.log('[push] token registered:', res.ok ? 'ok' : `failed (${res.status})`);
  return res.ok;
};

// The network may not be ready right at app start, so try a few times
const registerWithRetry = async (token) => {
  const delays = [0, 5000, 15000, 30000];
  for (const delay of delays) {
    if (delay) await new Promise((r) => setTimeout(r, delay));
    try {
      if (await registerToken(token)) return true;
    } catch (e) {
      console.log('[push] register error', e?.message);
    }
  }
  return false;
};

export const unregisterPushToken = async () => {
  // Never let this delay logout for more than a few seconds
  await Promise.race([_unregisterPushToken(), new Promise((r) => setTimeout(r, 4000))]);
};

const _unregisterPushToken = async () => {
  try {
    const user = getAuth().currentUser;
    if (!user) return;
    const token = await getToken(getMessaging());
    const idToken = await user.getIdToken();
    await postJson('/api/push/unregister', { id_token: idToken, fcm_token: token }, 5000);
  } catch (e) {
    // Never block logout because of this
    console.log('[push] unregister skipped', e?.message);
  }
};

// For a "Send test notification" button (optional)
export const sendTestPush = async () => {
  const user = getAuth().currentUser;
  if (!user) return null;
  const res = await postJson('/api/push/test', { id_token: await user.getIdToken() });
  return res.data;
};

// ---- showing / opening notifications ---------------------------------------

// FCM does not display messages while the app is open, so show it ourselves
const showForeground = async (remoteMessage) => {
  try {
    const n = remoteMessage?.notification || {};
    const data = remoteMessage?.data || {};
    await notifee.displayNotification({
      title: n.title || 'Temperature alert',
      body: n.body || '',
      data,
      android: {
        channelId: ALERT_CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'default' },
      },
    });
  } catch (e) {
    console.log('[push] could not show notification', e?.message);
  }
};

const openFromData = (data) => {
  if (data?.type === 'threshold_alert') navigateToDevice(data);
};

// ---- entry point -------------------------------------------------------------

const startPush = () => {
  const messaging = getMessaging();
  const cleanups = [];

  ensureChannel().catch((e) => console.log('[push] channel error', e));

  // App open: alert arrives
  cleanups.push(onMessage(messaging, showForeground));

  // Tapped a notification shown by Notifee while the app was open
  cleanups.push(
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) openFromData(detail?.notification?.data);
    })
  );

  // Tapped a system-shown notification: app was in background / was closed
  cleanups.push(onNotificationOpenedApp(messaging, (m) => openFromData(m?.data)));
  getInitialNotification(messaging)
    .then((m) => m && openFromData(m.data))
    .catch(() => {});
  notifee
    .getInitialNotification()
    .then((i) => i && openFromData(i.notification?.data))
    .catch(() => {});

  // The token can change (reinstall, data cleared...): tell the backend
  cleanups.push(onTokenRefresh(messaging, (t) => registerWithRetry(t)));

  // Whenever a user is signed in (fresh login or auto-login): permission + register
  cleanups.push(
    onAuthStateChanged(getAuth(), async (user) => {
      if (!user) return;
      await ensurePermission();
      try {
        const token = await getToken(messaging);
        console.log('[push] FCM token:', token); // handy for the backend self-test
        await registerWithRetry(token);
      } catch (e) {
        console.log('[push] could not get FCM token', e?.message);
      }
    })
  );

  return () =>
    cleanups.forEach((fn) => {
      try {
        if (typeof fn === 'function') fn();
      } catch {
        // ignore
      }
    });
};

// Public entry point. If anything in the push setup fails (for example the native
// module was not rebuilt), push is simply switched off and the rest of the app runs normally.
export const initPushNotifications = () => {
  try {
    return startPush();
  } catch (e) {
    console.log('[push] disabled, setup failed:', e?.message);
    return () => {};
  }
};