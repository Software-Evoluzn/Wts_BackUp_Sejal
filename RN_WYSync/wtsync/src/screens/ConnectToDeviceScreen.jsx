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
  Image,
  useColorScheme,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
const LIGHT = {
  bg: '#F8F8FC',
  header: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EFEFEF',
  divider: '#F2F2F7',
  footerBorder: '#F0F0F0',
  headerText: '#522D70',
  text: '#1C1C1E',
  textStrong: '#1A1A1A',
  deviceName: '#222222',
  sub: '#666666',
  muted: '#8E8E93',
  accent: '#8C3182',
  onAccent: '#FFFFFF',
  stepOff: '#E5E5EA',
  noteBg: '#FAFAFC',
  noteBorder: '#F0F0F5',
  noteText: '#7C7C80',
  statusBar: 'dark-content',
};

const DARK = {
  bg: '#17141A',
  header: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  divider: '#3A3540',
  footerBorder: '#2E2A33',
  headerText: '#FFFFFF',
  text: '#F4F4F5',
  textStrong: '#FFFFFF',
  deviceName: '#F4F4F5',
  sub: '#A1A1AA',
  muted: '#A1A1AA',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  noteBg: '#2A2430',
  noteBorder: '#2A2430',
  noteText: '#A1A1AA',
  statusBar: 'light-content',
};

const ConnectToDeviceScreen = ({ navigation, route }) => {
  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = createStyles(t);

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
      <StatusBar barStyle={t.statusBar} backgroundColor={t.header} />

      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleBold}>IntelliTemp </Text>
          <Text style={styles.headerTitleSub}>4P</Text>
        </View>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assests/images/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
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
            <ActivityIndicator color={t.onAccent} size="small" />
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

const createStyles = (t) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 15,
      paddingBottom: 12,
      marginTop: 25, // Top bar ko neeche karega
      minHeight: 45,
      backgroundColor: t.header,
    },
    backButton: { paddingRight: 12, },
    backArrow: {
      fontSize: 28,
      color: t.headerText,
    },
    headerTitleContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    headerTitleBold: {
      fontSize: 20,
      fontWeight: '700',
      color: t.headerText,
    },
    headerTitleSub: {
      fontSize: 18,
      fontWeight: '500',
      color: t.headerText,
    },
    logoContainer: {
      width: 75,
      height: 45,
      justifyContent: 'center',
      alignItems: 'center',
    },

    logoText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: t.accent,
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, },
    progressBarContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, },
    progressSegment: { flex: 1, height: 3, borderRadius: 2, marginHorizontal: 3, },
    progressActive: { backgroundColor: t.accent, },
    progressInactive: { backgroundColor: t.stepOff, },
    stepText: { fontSize: 12, fontWeight: '700', color: t.accent, letterSpacing: 0.8, marginBottom: 8, },
    mainTitle: { fontSize: 24, fontWeight: '800', color: t.textStrong, marginBottom: 8, },
    subTitle: { fontSize: 14, color: t.sub, lineHeight: 20, marginBottom: 24, },
    deviceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: t.surface, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: t.border, marginBottom: 16, },
    deviceCardLeft: { flexDirection: 'row', alignItems: 'center', },
    thermometerIcon: { fontSize: 18, marginRight: 10, },
    deviceName: { fontSize: 15, fontWeight: '700', color: t.deviceName, },
    deviceCode: { fontSize: 13, color: t.muted, },
    infoCard: { backgroundColor: t.surface, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: t.border, marginBottom: 16, },
    infoCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, },
    infoCardTitle: { fontSize: 16, fontWeight: '700', color: t.text, },
    phoneIcon: { fontSize: 18, },
    infoCardBody: { fontSize: 13.5, color: t.sub, lineHeight: 19, marginBottom: 14, },
    divider: { height: 1, backgroundColor: t.divider, marginBottom: 14, },
    infoCardFooter: { fontSize: 13.5, color: t.sub, lineHeight: 19, },
    wifiHelperBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.noteBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: t.noteBorder, },
    wifiIcon: { fontSize: 16, marginRight: 10, },
    wifiHelperText: { flex: 1, fontSize: 13, color: t.noteText, lineHeight: 18, },
    footer: { paddingHorizontal: 20, paddingBottom: 20, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.footerBorder, },
    primaryButton: { backgroundColor: t.accent, borderRadius: 10, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 12, },
    disabledButton: { opacity: 0.7, },
    primaryButtonText: { color: t.onAccent, fontSize: 16, fontWeight: '700', },
    primaryButtonArrow: { color: t.onAccent, fontSize: 18, fontWeight: 'bold', },
    footerBrand: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', },
    poweredByText: { fontSize: 12, color: t.muted, },
    brandText: { fontSize: 12, fontWeight: '800', color: t.accent, },
    brandLogo: {
      width: 75,
      height: 45,
    },
  });