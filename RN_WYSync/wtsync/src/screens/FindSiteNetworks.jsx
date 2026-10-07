import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
} from 'react-native';

const FindSiteNetworks = ({ navigation, route }) => {
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F9',
  },
  wifiIcon: {
    fontSize: 24,
    color: '#8C3182',
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
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    marginBottom: 16,
  },
  statusCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  statusCardSubtitle: {
    fontSize: 13.5,
    color: '#666666',
    lineHeight: 18,
    marginBottom: 14,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  badgeCheck: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginRight: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  warningIcon: {
    fontSize: 16,
    color: '#8C3182',
    marginRight: 10,
  },
  warningText: {
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