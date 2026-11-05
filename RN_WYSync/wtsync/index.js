

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';



messaging().onMessage(async remoteMessage =>{
  console.log('Foreground Alert Received:' , remoteMessage);


  await notifee.displayNotification({
    title : remoteMessage.notification?.title || '⚠️ Temperature Alert',
    body : remoteMessage.notification?.body || 'Temperature limit exceeded!',
    android :{
      channelId: 'high_priority_alerts',
      importance : AndroidImportance.HIGH,
      smallIcon:'ic_launcher',
      color:'#fdf0fb',
      pressAction : {id:'default'},
    }

  });
});



// Handle notification when App is KILLED or in BACKGROUND
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Background Alert Received:', remoteMessage);

  await notifee.displayNotification({
    title: remoteMessage.notification?.title || '⚠️ Temperature Alert',
    body: remoteMessage.notification?.body || 'Temperature limit exceeded!',
    android: {
      channelId: 'high_priority_alerts',
      importance: AndroidImportance.HIGH,
      smallIcon:'ic_launcher',
      color:'#fdf0fb',
      pressAction: { id: 'default' },
    },
  });
});

AppRegistry.registerComponent(appName, () => App);
