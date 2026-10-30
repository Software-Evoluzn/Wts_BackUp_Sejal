/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// Android shows the notification itself while the app is in the background or closed.
// These handlers just have to exist (they must be registered before the app starts).
try {
  setBackgroundMessageHandler(getMessaging(), async () => {});
  notifee.onBackgroundEvent(async () => {});
} catch (e) {
  console.log('[push] background handlers not registered', e?.message);
}

AppRegistry.registerComponent(appName, () => App);