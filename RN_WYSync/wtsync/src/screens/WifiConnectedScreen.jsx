import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAppTheme } from '../services/theme';

// Image import (apne local file path ke mutabiq modify karein)
import logo from '../assests/images/logo.png';

const WifiConnectedScreen = ({ route, navigation }) => {
  const { network, product, password, deviceId, firebaseUid, autoConnect, serialNo, ssid } = route.params || {};
  const { colors } = useAppTheme();

  const displaySsid = network?.SSID || ssid || 'Unknown Network';
  const productName = product?.name || 'IntelliTemp';
  const productVariant = product?.variant || '4P';
  const displayDeviceId = serialNo || product?.deviceId || product?.id || 'N/A';

  const handleNext = () => {
    navigation.navigate('NametheInstallation', {
      product,
      network,
      password,
      deviceId: displayDeviceId,
      firebaseUid,
      autoConnect,
      serialNo,
      ssid,
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ── Top Header Bar ───────────────────────────────────────── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {productName}{' '}
          </Text>
          <Text style={styles.headerSubtitle}>{productVariant}</Text>
        </View>

        {/* ── Brand Badge with Image ──────────────────────────────── */}
        <View style={styles.brandBadge}>
          <Image
            source={logo}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Stepper Indicator ───────────────────── */}
        <View style={styles.stepperContainer}>
          <View style={[styles.stepBar, styles.stepActive]} />
          <View style={[styles.stepBar, styles.stepActive]} />
          <View style={[styles.stepBar, styles.stepInactive]} />
          <View style={[styles.stepBar, styles.stepInactive]} />
          <View style={[styles.stepBar, styles.stepInactive]} />
          <View style={[styles.stepBar, styles.stepInactive]} />
        </View>

        {/* ── Wifi Icon Banner ─────────────────────────────────────── */}
        <View style={styles.wifiBannerIconWrap}>
          <Feather name="wifi" size={26} color="#0F6E56" />
        </View>

        {/* ── Step Label & Heading ─────────────────────────────────── */}
        <Text style={styles.stepTitleLabel}>STEP 2 OF 6 • CONNECT</Text>
        <Text style={[styles.mainHeading, { color: colors.text }]}>
          Wi-Fi is connected.
        </Text>
        <Text style={[styles.subHeading, { color: colors.subText }]}>
          Next, confirm the monitoring service and your sensor readings.
        </Text>

        {/* ── Site Wi-Fi Network Card & Device Info ───────────────── */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={styles.cardHeaderLabel}>SITE WI-FI NETWORK</Text>
          <View style={styles.networkRow}>
            <Text
              style={[styles.networkSSID, { color: colors.text }]}
              numberOfLines={1}
            >
              {displaySsid}
            </Text>
            <Feather name="wifi" size={18} color={colors.text} />
          </View>
          <Text style={[styles.networkMeta, { color: colors.subText }]}>
            2.4 GHz • Password protected
          </Text>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.deviceIdRow}>
            <Text style={[styles.deviceIdLabel, { color: colors.subText }]}>DEVICE ID</Text>
            <Text style={[styles.deviceIdValue, { color: colors.text }]}>
              {displayDeviceId}
            </Text>
          </View>
        </View>

        {/* ── Progress Checklist Card ─────────────────────────────── */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.checkItemRow}>
            <View style={[styles.iconCircle, styles.iconCircleSuccess]}>
              <Feather name="check" size={14} color="#15803D" />
            </View>
            <View style={styles.checkItemTextWrap}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                {productName} joined the site network
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.subText }]}>
                Network setup completed.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.checkItemRow}>
            <View style={[styles.iconCircle, styles.iconCircleActive]}>
              <Feather name="plus" size={14} color="#9C3AB3" />
            </View>
            <View style={styles.checkItemTextWrap}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                Return the phone to site Wi-Fi
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.subText }]}>
                Use the system prompt if requested.
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.checkItemRow}>
            <View style={[styles.iconCircle, styles.iconCirclePending]}>
              <Text style={styles.pendingNumber}>3</Text>
            </View>
            <View style={styles.checkItemTextWrap}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>
                Check monitoring service
              </Text>
              <Text style={[styles.itemSubtitle, { color: colors.subText }]}>
                We will wait for the device to report.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Info Note ────────────────────────────────────────────── */}
        <View style={styles.infoRow}>
          <Feather
            name="info"
            size={18}
            color="#9C3AB3"
            style={styles.infoIcon}
          />
          <Text style={[styles.infoText, { color: colors.subText }]}>
            Network setup complete. Monitoring setup still in progress.
          </Text>
        </View>
      </ScrollView>

      {/* ── Bottom Action Button ──────────────────────────────────── */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleNext}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Continue to Installation</Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.footerBrand}>
          Powered By <Text style={styles.footerBrandBold}>EVOLUZN</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default WifiConnectedScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 8 : 12,
    paddingBottom: 12,
  },
  backButton: {
    paddingRight: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#9C3AB3',
  },
  brandBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandLogoImage: {
    width: 70,
    height: 24,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 20,
    gap: 6,
  },
  stepBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepActive: {
    backgroundColor: '#9C3AB3',
  },
  stepInactive: {
    backgroundColor: '#E5E7EB',
  },
  wifiBannerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E6F4EA',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepTitleLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9C3AB3',
    textAlign: 'center',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  mainHeading: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subHeading: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9C3AB3',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  networkSSID: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  networkMeta: {
    fontSize: 12,
  },
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceIdLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deviceIdValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconCircleSuccess: {
    backgroundColor: '#E6F4EA',
  },
  iconCircleActive: {
    backgroundColor: '#F3E8FF',
  },
  iconCirclePending: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  pendingNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  checkItemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#8B2C92',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerBrand: {
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  footerBrandBold: {
    fontWeight: '800',
    color: '#9C3AB3',
  },
});