import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

const ConnectToDeviceScreen = ({ navigation, route }) => {
  const [connecting, setConnecting] = useState(false);

  // Navigation params destructuring
  const { product, autoConnect, serialNo, ssid, password } = route?.params || {};

  // Serial Number & Target SSID resolution
  const displaySerialNo =
    serialNo || (product && product['Serial No']) || 'DEMO-4P-001';
  const targetSsid = ssid || (product && product['SSID']) || 'IntelliTemp_AP';
  const devicePassword = password || '12345678'; // Default AP password agar koi hoto

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // 1. Wi-Fi Access Point se connect hone ka attempt
      if (targetSsid) {
        await WifiManager.connectToProtectedSSID(
          targetSsid,
          devicePassword,
          false, // isWep
          false  // isHidden
        );
      }

      //setConnecting(false);
      console.log()
      // 2. Wi-Fi successful connection ke baad Next Screen par Navigate karein
      navigation.navigate('FindSiteNetworks', {
        product,
        autoConnect,
        serialNo: displaySerialNo,
        ssid: targetSsid,
      });

      // Timeout se state reset karein taaki screen switch animation clean rahe
      setTimeout(() => {
        setConnecting(false);
      }, 500);



    } catch (error) {
      setConnecting(false);
      Alert.alert(
        'Connection Failed',
        `Unable to connect to ${targetSsid}. Please check if the device AP is turned on and try again.`,
        [{ text: 'OK' }]
      );
      console.error('Wi-Fi Connection Error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
          disabled={connecting}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleBold}>IntelliTemp </Text>
          <Text style={styles.headerTitleSub}>4P</Text>
        </View>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>evoluzn</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
        </View>

        {/* Step Banner */}
        <Text style={styles.stepText}>STEP 2 OF 6 · CONNECT</Text>

        {/* Header Text */}
        <Text style={styles.mainTitle}>IntelliTemp found.</Text>
        <Text style={styles.subTitle}>
          Your phone will briefly connect to the device to share site Wi-Fi settings.
        </Text>

        {/* Device Info Badge */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceCardLeft}>
            <Text style={styles.thermometerIcon}>🌡️</Text>
            <Text style={styles.deviceName}>IntelliTemp 4P</Text>
          </View>
          <Text style={styles.deviceCode}>{displaySerialNo}</Text>
        </View>

        {/* Temporary Connection Details Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Text style={styles.infoCardTitle}>Temporary device connection</Text>
            <Text style={styles.phoneIcon}>📱</Text>
          </View>

          <Text style={styles.infoCardBody}>
            Your phone may show “No internet” while it is connected to {targetSsid}. This is expected during setup.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.infoCardFooter}>
            Approve the system connection prompt, then return to this app.
          </Text>
        </View>

        {/* Wi-Fi Helper Card */}
        <View style={styles.wifiHelperBox}>
          <Text style={styles.wifiIcon}>📶</Text>
          <Text style={styles.wifiHelperText}>
            The app will guide you back to the site network afterwards.
          </Text>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, connecting && styles.disabledButton]}
          activeOpacity={0.8}
          onPress={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Connect to IntelliTemp</Text>
              <Text style={styles.primaryButtonArrow}> →</Text>
            </>
          )}
        </TouchableOpacity>
        <View style={styles.footerBrand}>
          <Text style={styles.poweredByText}>Powered By </Text>
          <Text style={styles.brandText}>EVOLUZN</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ConnectToDeviceScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FC',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    paddingRight: 12,
  },
  backArrow: {
    fontSize: 22,
    color: '#333333',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitleBold: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  headerTitleSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
  },
  logoContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8C3182',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  progressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginHorizontal: 3,
  },
  progressActive: {
    backgroundColor: '#8C3182',
  },
  progressInactive: {
    backgroundColor: '#E5E5EA',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C3182',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 24,
  },
  deviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  deviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thermometerIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222222',
  },
  deviceCode: {
    fontSize: 13,
    color: '#8E8E93',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  phoneIcon: {
    fontSize: 18,
  },
  infoCardBody: {
    fontSize: 13.5,
    color: '#666666',
    lineHeight: 19,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginBottom: 14,
  },
  infoCardFooter: {
    fontSize: 13.5,
    color: '#666666',
    lineHeight: 19,
  },
  wifiHelperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  wifiIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  wifiHelperText: {
    flex: 1,
    fontSize: 13,
    color: '#7C7C80',
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryButton: {
    backgroundColor: '#8C3182',
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerBrand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  poweredByText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C3182',
  },
});