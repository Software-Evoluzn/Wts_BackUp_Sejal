import React, { useEffect } from 'react';
import { View, Image, Text, ActivityIndicator, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

const ACCENT = '#8E338A';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    console.log("Splash screen Mounted");
    let user = null;
    let authResolved = false;
    let timerDone = false;

    // Navigate only when both timer and auth check are resolved
    const tryNavigate = () => {
      console.log("Checking Navigation.......");
      console.log("authResolved:", authResolved);
      console.log("timerDone:", timerDone);
      console.log("user:", user);

      if (authResolved && timerDone) {
        if (user) {
          console.log("✅ User Found -> Navigate to Home");
          navigation.replace('Main');
        } else {
          console.log("❌ No User -> Navigate to Login");
          navigation.replace('Login');
        }
      } else {
        console.log("⏳ Waiting for Auth or Timer...");
      }
    };

    // Minimum 2 second splash timer
    const timer = setTimeout(() => {
      console.log("⏰ 2 Seconds Completed");
      timerDone = true;
      tryNavigate();
    }, 2000);

    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      console.log("🔥 Firebase Auth Response");
      console.log("Current User:", currentUser);

      user = currentUser;
      authResolved = true;
      tryNavigate();
    });

    return () => {
      console.log("🧹 SplashScreen Unmounted");
      clearTimeout(timer);
      unsubscribe();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Container for Horizontal Logo + Wordmark */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assests/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.tagline}>Welcome back</Text>

      <ActivityIndicator
        size="large"
        color={ACCENT}
        style={styles.loader}
      />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {
    width: 260,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B6775',
    marginTop: 4,
  },
  loader: {
    marginTop: 40,
  },
});