import { createNavigationContainerRef } from '@react-navigation/native';

// Lets code outside React screens (like notification handlers) navigate.
export const navigationRef = createNavigationContainerRef();

// Screens that are shown before the user is logged in. A notification tapped
// while the app is still starting up waits until the app has left them.
const PRE_LOGIN_SCREENS = ['Splash', 'Login', 'Register', 'Forgotpassword'];

let pendingTarget = null;
let timer = null;

/**
 * Opens the dashboard of the device named in a notification's data.
 * Works for: app open, app in background, and app started by tapping the notification.
 */
export const navigateToDevice = (data) => {
  if (!data?.serial_no) return;

  pendingTarget = { serial_no: data.serial_no, device_name: data.device_name };
  if (timer) return;

  let tries = 0;
  timer = setInterval(() => {
    tries += 1;
    const route = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : null;

    if (route && !PRE_LOGIN_SCREENS.includes(route)) {
      clearInterval(timer);
      timer = null;
      const target = pendingTarget;
      pendingTarget = null;
      navigationRef.navigate('WtsDashboard', { product: target });
    } else if (tries > 40) {
      // ~20 s and the user never got past login: give up quietly
      clearInterval(timer);
      timer = null;
      pendingTarget = null;
    }
  }, 500);
};
