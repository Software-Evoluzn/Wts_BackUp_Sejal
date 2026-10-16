import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Image,
  useColorScheme,
} from 'react-native';

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
const LIGHT = {
  bg: '#F8F8FC',
  header: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EFEFEF',
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
  radarBg: '#FAF5F9',
  okBg: '#E8F5E9',
  okText: '#2E7D32',
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
  radarBg: '#17141A',
  okBg: '#143A24',
  okText: '#4ADE80',
  noteBg: '#2A2430',
  noteBorder: '#2A2430',
  noteText: '#A1A1AA',
  statusBar: 'light-content',
};

const FindSiteNetworks = ({ navigation, route }) => {
  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = createStyles(t);

  // Receiving parameters from ConnectToDeviceScreen
  const { product, autoConnect, serialNo, ssid } = route?.params || {};

  const displaySerialNo =
    serialNo || (product && product['Serial No']) || 'DEMO-4P-001';

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('HomeWifiListScreen', {
        product,
        autoConnect,
        serialNo: displaySerialNo,
        ssid,
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, product, autoConnect, displaySerialNo, ssid]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.header} />

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
        {/* Progress Bar (6 steps) */}
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

        {/* Title and Subtitle */}
        <Text style={styles.mainTitle}>Finding site networks.</Text>
        <Text style={styles.subTitle}>Scanning for nearby 2.4 GHz Wi-Fi.</Text>

        {/* Wi-Fi Scanning Radar Circle */}
        <View style={styles.radarContainer}>
          <View style={styles.radarCircle}>
            <Text style={styles.wifiIcon}>📶</Text>
          </View>
        </View>

        {/* Device Info Badge */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceCardLeft}>
            <Text style={styles.thermometerIcon}>🌡️</Text>
            <Text style={styles.deviceName}>IntelliTemp 4P</Text>
          </View>
          <Text style={styles.deviceCode}>{displaySerialNo}</Text>
        </View>

        {/* Connection Established Status Box */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardTitle}>
            Device connection established
          </Text>
          <Text style={styles.statusCardSubtitle}>
            IntelliTemp is looking for networks it can join.
          </Text>

          <View style={styles.badgeContainer}>
            <Text style={styles.badgeCheck}>✓</Text>
            <Text style={styles.badgeText}>Connected to device</Text>
          </View>
        </View>

        {/* Wi-Fi Warning Note Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>ⓘ</Text>
          <Text style={styles.warningText}>
            A 5 GHz-only network cannot be used for this setup.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          activeOpacity={0.8}
          onPress={() => navigation?.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel scan</Text>
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

export default FindSiteNetworks;

const createStyles = (t) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
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
    backButton: {
      paddingRight: 12,
    },
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
      backgroundColor: t.accent,
    },
    progressInactive: {
      backgroundColor: t.stepOff,
    },
    stepText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.accent,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    mainTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textStrong,
      marginBottom: 6,
    },
    subTitle: {
      fontSize: 14,
      color: t.sub,
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
      borderColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.radarBg,
    },
    wifiIcon: {
      fontSize: 24,
      color: t.accent,
    },
    deviceCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 8,
      padding: 16,
      borderWidth: 1,
      borderColor: t.border,
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
      color: t.deviceName,
    },
    deviceCode: {
      fontSize: 13,
      color: t.muted,
    },
    statusCard: {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 18,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    statusCardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: t.text,
      marginBottom: 6,
    },
    statusCardSubtitle: {
      fontSize: 13.5,
      color: t.sub,
      lineHeight: 18,
      marginBottom: 14,
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.okBg,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    badgeCheck: {
      fontSize: 12,
      color: t.okText,
      fontWeight: 'bold',
      marginRight: 6,
    },
    badgeText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.okText,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.noteBg,
      borderRadius: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: t.noteBorder,
    },
    warningIcon: {
      fontSize: 16,
      color: t.accent,
      marginRight: 10,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: t.noteText,
      lineHeight: 18,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.footerBorder,
    },
    cancelButton: {
      backgroundColor: t.accent,
      borderRadius: 10,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 12,
    },
    cancelButtonText: {
      color: t.onAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    cancelButtonArrow: {
      color: t.onAccent,
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
      color: t.muted,
    },
    brandText: {
      fontSize: 12,
      fontWeight: '800',
      color: t.accent,
    },
    brandLogo: {
      width: 75,
      height: 45,
    },
  });