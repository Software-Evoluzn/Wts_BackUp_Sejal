import { StyleSheet } from 'react-native';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import BottomNavigator from '../services/BottomTabNavigator';
import ForgotPassword from '../screens/ForgotPasswordScreen';
import EditProfile from '../screens/EditProfile';
import DeviceConfig from '../screens/DeviceConfig';
import HomeWifiListScreen from '../screens/HomeWifiListScreen';
import PasswordScreen from '../screens/PasswordScreen';
import ResetWifiNetwork from '../screens/ResetWifiNetwork';
import WtsDashboard from '../screens/WtsDashboard';
import ProductRegistrationScreen from '../screens/ProductRegistrationScreen';
import FindIntelliTempDevice from '../screens/FindIntelliTempDevice';
import ConnectToDeviceScreen from '../screens/ConnectToDeviceScreen';
import FindSiteNetworks from '../screens/FindSiteNetworks';
import WifiConnectedScreen from '../screens/WifiConnectedScreen';
import NametheInstallation from '../screens/NametheInstallation';
import Identifyfourprobes from '../screens/Identifyfourprobes';
import Checkfirstreadings from '../screens/Checkfirstreadings';
import Setclearalertlimits from "../screens/Setclearalertlimits";
import Individualoverride from '../screens/Individualoverride';
import Choosealertrecipients from '../screens/Choosealertrecipients';
import Reviewbeforeapplying from '../screens/Reviewbeforeapplying';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
      }}>
      {/* Authentication Stack */}
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Forgotpassword" component={ForgotPassword} />

      {/* Main Tab Bar Entry Point */}
      <Stack.Screen name="Main" component={BottomNavigator} />
      {/* Full-screen Child Routes (Pushed above Bottom Tab Bar) */}
      <Stack.Screen name="ProductRegister" component={ProductRegistrationScreen} />
      <Stack.Screen name="EditProfile" component={EditProfile} />
      <Stack.Screen name="DeviceConfig" component={DeviceConfig} />
      <Stack.Screen name="HomeWifiListScreen" component={HomeWifiListScreen} />
      <Stack.Screen name="Password" component={PasswordScreen} />
      <Stack.Screen name="ResetwifiNetwork" component={ResetWifiNetwork} />
      <Stack.Screen name="WtsDashboard" component={WtsDashboard} />
      <Stack.Screen name="FindIntelliTempDevice" component={FindIntelliTempDevice}/>
      <Stack.Screen name="ConnectToDeviceScreen" component={ConnectToDeviceScreen}/>
      <Stack.Screen name="FindSiteNetworks" component={FindSiteNetworks}/>
      <Stack.Screen name="WifiConnectedScreen" component={WifiConnectedScreen}/>
      <Stack.Screen name="NametheInstallation" component={NametheInstallation}/>
      <Stack.Screen name="Identifyfourprobes" component={Identifyfourprobes}/>
      <Stack.Screen name="Checkfirstreadings" component={Checkfirstreadings}/>
      <Stack.Screen name="Setclearalertlimits" component={Setclearalertlimits}/>
      <Stack.Screen name="Individualoverride" component={Individualoverride}/>
      <Stack.Screen name="Choosealertrecipients" component={Choosealertrecipients}/>
      <Stack.Screen name="Reviewbeforeapplying" component={Reviewbeforeapplying}/>
    </Stack.Navigator>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({});