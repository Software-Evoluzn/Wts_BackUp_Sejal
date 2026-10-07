import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  PermissionsAndroid,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

const ESP_SSID_PREFIX = 'WTS';

// Helper function to generate AP SSID from Serial No
export const generateApSsid = (serialNo) => {
  if (!serialNo) return null;
  const clean = String(serialNo).trim().toUpperCase();

  if (clean.startsWith('WTSAP')) {
    return clean;
  }

  if (!clean.startsWith(ESP_SSID_PREFIX)) {
    return null;
  }
  
  const rest = clean.slice(ESP_SSID_PREFIX.length);
  console.log("here ssid found " , rest)
  return `${ESP_SSID_PREFIX}AP${rest}`;
};

const FindIntelliTempDevice = ({ navigation, route }) => {
  const { product, autoConnect, serialNo, accessPoint } = route.params || {};

  // Statuses: 'scanning' | 'found' | 'not_found'
  const [scanStatus, setScanStatus] = useState('scanning');
  const [foundSsid, setFoundSsid] = useState('');

  // Target SSID derive karein
  const targetSSID =
    accessPoint ||
    (product && typeof product === 'object' ? product.access_point : null) ||
    generateApSsid(serialNo || (product && product['Serial No']));

  // Pulse animation for Radar Scanner
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Android Permissions Request
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
        ]);
        return (
          results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          results[PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (e) {
      return false;
    }
  };

  // WiFi scan karke check karna ki target AP list mein hai ya nahi
  const scanForAccessPoint = useCallback(async () => {
    setScanStatus('scanning');

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location permission needed to scan WiFi devices.', [
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      setScanStatus('not_found');
      return;
    }

    try {
      const isEnabled = await WifiManager.isEnabled();
      if (!isEnabled) {
        Alert.alert('WiFi Disabled', 'Please turn on WiFi to scan for device.');
        setScanStatus('not_found');
        return;
      }

      // WiFi networks scan karein
      const list = await WifiManager.reScanAndLoadWifiList();

      let match = null;
      if (targetSSID) {
        match = list.find(
          (item) => item.SSID && item.SSID.toUpperCase() === targetSSID.toUpperCase()
        );
      } else {
        // Fallback: search for any 'WTS' network
        match = list.find(
          (item) => item.SSID && item.SSID.toUpperCase().startsWith(ESP_SSID_PREFIX)
        );
      }

      if (match) {
        setFoundSsid(match.SSID);
        setScanStatus('found');
      } else {
        setScanStatus('not_found');
      }
    } catch (error) {
      console.log('WiFi Scan Error:', error);
      setScanStatus('not_found');
    }
  }, [targetSSID]);

  useEffect(() => {
    scanForAccessPoint();
  }, [scanForAccessPoint]);

  // Jab Access Point mil jaaye tabhi 3 seconds delay lekar next screen par jao
  useEffect(() => {
    if (scanStatus === 'found') {
      const timer = setTimeout(() => {
        console.log("serial number FindIntelli " , serialNo)
        navigation.navigate('ConnectToDeviceScreen', {
          product,
          autoConnect: autoConnect ?? true,
          serialNo: serialNo || (product && product['Serial No']) || '',
          ssid: foundSsid || targetSSID,
        });
      }, 3000); // 3 seconds delay

      return () => clearTimeout(timer);
    }
  }, [scanStatus, navigation, product, autoConnect, serialNo, foundSsid, targetSSID]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Progress Bar (6 steps) */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressActive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
          <View style={[styles.progressSegment, styles.progressInactive]} />
        </View>

        {/* Section Step Banner */}
        <Text style={styles.stepText}>STEP 2 OF 6 · CONNECT</Text>

        {/* Title and Subtitle */}
        <Text style={styles.mainTitle}>Looking for IntelliTemp.</Text>
        <Text style={styles.subTitle}>
          Keep the device powered and your phone nearby.
        </Text>

        {/* Animated Scanner Radar Circle */}
        <View style={styles.radarContainer}>
          <Animated.View style={[styles.radarCircle, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.radarInnerIcon}>
              {scanStatus === 'scanning' ? (
                <ActivityIndicator size="small" color="#8C3182" />
              ) : scanStatus === 'found' ? (
                <Text style={{ fontSize: 20 }}>🎯</Text>
              ) : (
                <Text style={{ fontSize: 20 }}>❓</Text>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Device Info Badge */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceCardLeft}>
            <Text style={styles.thermometerIcon}>🌡️</Text>
            <Text style={styles.deviceName}>IntelliTemp 4P</Text>
          </View>
          <Text style={styles.deviceCode}>
            {foundSsid || targetSSID || serialNo || 'DEMO-4P-001'}
          </Text>
        </View>

        {/* Steps Tracker Card */}
        <View style={styles.stepsCard}>
          {/* Step 1 */}
          <View style={styles.stepRow}>
            <View style={[styles.statusIconContainer, styles.statusSuccess]}>
              <Text style={styles.statusCheck}>✓</Text>
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepRowTitle}>Device identity confirmed</Text>
              <Text style={styles.stepRowSubtitle}>Matched to the scanned label.</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Step 2 - Dynamic based on scan status */}
          <View style={styles.stepRow}>
            {scanStatus === 'scanning' && (
              <View style={[styles.statusIconContainer, styles.statusLoading]}>
                <ActivityIndicator size="small" color="#8C3182" />
              </View>
            )}
            {scanStatus === 'found' && (
              <View style={[styles.statusIconContainer, styles.statusSuccess]}>
                <Text style={styles.statusCheck}>✓</Text>
              </View>
            )}
            {scanStatus === 'not_found' && (
              <View style={[styles.statusIconContainer, styles.statusFailed]}>
                <Text style={styles.statusCross}>✕</Text>
              </View>
            )}

            <View style={styles.stepTextContainer}>
              <Text style={styles.stepRowTitle}>Discovering setup connection</Text>
              <Text style={styles.stepRowSubtitle}>
                {scanStatus === 'scanning' && 'Searching for device AP in WiFi list...'}
                {scanStatus === 'found' && 'Device Access Point detected! Redirecting...'}
                {scanStatus === 'not_found' && 'Device Access Point not found in WiFi list.'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Step 3 */}
          <View style={styles.stepRow}>
            <View style={[styles.statusIconContainer, styles.statusPending]}>
              <Text style={styles.statusNumber}>3</Text>
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepRowTitleDisabled}>Connect your phone</Text>
              <Text style={styles.stepRowSubtitle}>
                You may see a system network prompt.
              </Text>
            </View>
          </View>
        </View>

        {/* Security Note Box */}
        <View style={styles.securityBox}>
          <Text style={styles.securityIcon}>🛡️</Text>
          <Text style={styles.securityText}>
            Only connect to the IntelliTemp identity you just scanned.
          </Text>
        </View>

        {/* If Not Found - Scan Again Button */}
        {scanStatus === 'not_found' && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={scanForAccessPoint}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel discovery</Text>
          <Text style={styles.cancelButtonArrow}> →</Text>
        </TouchableOpacity>

        <View style={styles.footerBrand}>
          <Text style={styles.poweredByText}>Powered By </Text>
          <Text style={styles.brandText}>EVOLUZN</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default FindIntelliTempDevice;

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
    color: '#333',
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
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  radarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#8C3182',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F9',
  },
  radarInnerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 20,
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
  stepsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  statusIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  statusSuccess: {
    backgroundColor: '#E8F7EE',
  },
  statusFailed: {
    backgroundColor: '#FDE8E8',
  },
  statusCheck: {
    color: '#27AE60',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusCross: {
    color: '#E53E3E',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusLoading: {
    backgroundColor: '#FDF0F9',
    borderWidth: 1.5,
    borderColor: '#8C3182',
  },
  statusPending: {
    borderWidth: 1,
    borderColor: '#D1D1D6',
  },
  statusNumber: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  stepRowTitleDisabled: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 2,
  },
  stepRowSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  divider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginVertical: 4,
    marginLeft: 40,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  securityIcon: {
    fontSize: 16,
    color: '#8C3182',
    marginRight: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#7C7C80',
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: '#8C3182',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    backgroundColor: '#8C3182',
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButtonArrow: {
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