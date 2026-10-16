import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView, StyleSheet, Animated, Image, KeyboardAvoidingView, Platform,
  useColorScheme,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import Feather from 'react-native-vector-icons/Feather';

import { saveDeviceWifi } from '../services/WifiService';

const ESP_AP_IP = 'http://192.168.4.1';

// Verification tuning
const POLL_EVERY_MS = 3000;     // har 3s me ESP ko ping karo
const MAX_VERIFY_MS = 30000;    // 30s tak verify karo, uske baad fail maan lo
const UNREACHABLE_STREAK_OK = 2; // 2 baar lagataar unreachable = AP band = success

// State machine ke liye saaf-saaf status values
const STATUS = {
  IDLE: 'idle',
  SENDING: 'sending',     // /wifisave pe POST ja raha hai
  VERIFYING: 'verifying', // ESP connect kar raha hai, hum monitor kar rahe hain
  SUCCESS: 'success',     // ESP ne target WiFi join kar liya
  FAILED: 'failed',       // wrong password / network na mila
};

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
const LIGHT = {
  bg: '#F8F9FB',
  header: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EFEFEF',
  inputBorder: '#E0E0E0',
  footerBorder: '#F0F0F0',
  backIcon: '#333333',
  title: '#222222',
  titleSub: '#777777',
  strong: '#111111',
  label: '#333333',
  sub: '#666666',
  muted: '#777777',
  iconMuted: '#8E8E93',
  iconStrong: '#4A4A4A',
  placeholder: '#8E8E93',
  accent: '#8E24AA',
  infoIcon: '#9C3AB3',
  onAccent: '#FFFFFF',
  stepOff: '#E5E5EA',
  required: '#D32F2F',
  poweredBy: '#888888',
};

const DARK = {
  bg: '#17141A',
  header: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  inputBorder: '#3A3540',
  footerBorder: '#2E2A33',
  backIcon: '#FFFFFF',
  title: '#FFFFFF',
  titleSub: '#E5A0DC',
  strong: '#FFFFFF',
  label: '#F4F4F5',
  sub: '#A1A1AA',
  muted: '#A1A1AA',
  iconMuted: '#A1A1AA',
  iconStrong: '#F4F4F5',
  placeholder: '#71717A',
  accent: '#E5A0DC',
  infoIcon: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  required: '#F87171',
  poweredBy: '#A1A1AA',
};

export default function PasswordScreen({ route, navigation }) {
  const { network, product, autoConnect, serialNo, ssid, deviceId, firebaseUid } = route.params || {};

  console.log("Password screen serialNo", serialNo);

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const p = isDark ? DARK : LIGHT;

  const styles = createStyles(p);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorMsg, setErrorMsg] = useState('');
  const [user, setUser] = useState(null);

  const [phoneConnected, setPhoneConnected] = useState(false);
  const phoneWifiTimer = useRef(null);

  const stopPhoneWifiPolling = () => {
    if (phoneWifiTimer.current) {
      clearInterval(phoneWifiTimer.current);
      phoneWifiTimer.current = null;
    }
  };

  // 4. Database Sync Handler
  const handleSaveToDatabase = async () => {
    try {
      const res = await saveDeviceWifi({
        deviceId: deviceId || 'ESP32_DEFAULT_ID',
        firebaseUid: firebaseUid || 'DEFAULT_UID',
        ssid: network.SSID,
        password: password,
      });

      if (res.success) {
        console.log('[DB Save Success]:', res.message);
      } else {
        console.log('[DB Save Failed]:', res.message);
      }
    } catch (err) {
      console.log('[DB Save Error]:', err);
    }
  };

  const startPhoneWifiPolling = () => {
    setPhoneConnected(false);

    phoneWifiTimer.current = setInterval(async () => {
      try {
        const ssid = await WifiManager.getCurrentWifiSSID();

        const currentSSID = ssid.replace(/"/g, "");

        console.log("Current SSID:", currentSSID);
        console.log("Target SSID :", network?.SSID);

        if (currentSSID === network?.SSID) {
          stopPhoneWifiPolling();
          setPhoneConnected(true);

          await handleSaveToDatabase();
        }
      } catch (error) {
        console.log("SSID Check Error:", error);
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopPhoneWifiPolling();
    };
  }, []);

  const pollTimer = useRef(null);
  const elapsedRef = useRef(0);
  const unreachableStreak = useRef(0);

  const stopPolling = () => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  };

  const isEspApReachable = async () => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    try {
      await fetch(`${ESP_AP_IP}/`, { method: 'GET', signal: controller.signal });
      clearTimeout(t);
      return true;
    } catch (e) {
      clearTimeout(t);
      return false;
    }
  };

  const handleConnect = async () => {
    if (!network?.SSID) {
      Alert.alert('No network selected', 'Please choose a Wi-Fi network first');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password length is less than 8');
      return;
    }

    setErrorMsg('');
    setStatus(STATUS.SENDING);

    try {
      await WifiManager.forceWifiUsageWithOptions(true, { noResetOnDisconnect: false });
    } catch (e) {
      // non-fatal
    }

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(`${ESP_AP_IP}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `s=${encodeURIComponent(network.SSID)}&p=${encodeURIComponent(password)}`,
        signal: controller.signal,
      });
      clearTimeout(t);

      console.log('[wifisave] status:', res.status);
    } catch (e) {
      console.log('[wifisave] post error (expected possible):', e.message);
    }

    startVerification();
  };

  const startVerification = () => {
    setStatus(STATUS.VERIFYING);
    elapsedRef.current = 0;
    unreachableStreak.current = 0;
    stopPolling();

    pollTimer.current = setInterval(async () => {
      elapsedRef.current += POLL_EVERY_MS;

      const reachable = await isEspApReachable();

      if (reachable) {
        unreachableStreak.current = 0;
      } else {
        unreachableStreak.current += 1;
        if (unreachableStreak.current >= UNREACHABLE_STREAK_OK) {
          stopPolling();
          onSuccess();
          return;
        }
      }

      if (elapsedRef.current >= MAX_VERIFY_MS) {
        stopPolling();
        onFailed();
      }
    }, POLL_EVERY_MS);
  };

  const onSuccess = () => {
    setStatus(STATUS.SUCCESS);
    startPhoneWifiPolling();
  };

  const onFailed = () => {
    setErrorMsg(
      'Device not connected to wifi . because: Wrong password, ' +
      'network is 5Ghz (ESP32 support 2.4GHz ). ' +
      'Please check password .'
    );
    setStatus(STATUS.FAILED);
  };

  const handleRetry = () => {
    setStatus(STATUS.IDLE);
    setErrorMsg('');
  };

  const handleProceedToConnected = () => {
    navigation.navigate('WifiConnectedScreen', {
      product,
      network,
      password,
      deviceId,
      firebaseUid,
      autoConnect,
      serialNo,
      ssid
    });
  };

  const busy = status === STATUS.SENDING || status === STATUS.VERIFYING;

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(10)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 550, useNativeDriver: true }),
      Animated.timing(cardFade, { toValue: 1, duration: 600, delay: 150, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 600, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusColors = {
    success: {
      bg: isDark ? 'rgba(29,158,117,0.14)' : '#F0FDF4',
      border: isDark ? 'rgba(29,158,117,0.35)' : '#BBF7D0',
      fg: isDark ? '#34D399' : '#0F6E56',
    },
    error: {
      bg: isDark ? 'rgba(220,38,38,0.14)' : '#FEF2F2',
      border: isDark ? 'rgba(220,38,38,0.35)' : '#FECACA',
      fg: isDark ? '#F87171' : '#B91C1C',
    },
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* App Bar Header */}

        <View style={styles.topHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            disabled={busy}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={20} color={p.backIcon} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            IntelliTemp <Text style={styles.headerSubTitle}>4P</Text>
          </Text>

          {/* Evoluzn Logo Image */}
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Indicator Steps */}
          <View style={styles.stepProgressContainer}>
            <View style={[styles.stepSegment, styles.stepSegmentActive]} />
            <View style={[styles.stepSegment, styles.stepSegmentActive]} />
            <View style={styles.stepSegment} />
            <View style={styles.stepSegment} />
            <View style={styles.stepSegment} />
            <View style={styles.stepSegment} />
          </View>

          {/* Heading Section */}
          <Animated.View
            style={[
              styles.header,
              { opacity: headerFade, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <Text style={styles.eyebrow}>STEP 2 OF 6 · CONNECT</Text>
            <Text style={styles.heading}>Connect IntelliTemp.</Text>
            <Text style={styles.subtitle}>
              Enter the password for your selected site network.
            </Text>
          </Animated.View>

          <Animated.View style={{ opacity: cardFade, transform: [{ translateY: cardSlide }] }}>

            {/* Target Network Card */}
            <View style={styles.networkCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.networkLabel}>SITE WI-FI NETWORK</Text>
                <Text style={styles.networkSsid} numberOfLines={1}>{network?.SSID || 'Evoluzn_Demo_2G'}</Text>
                <Text style={styles.networkSubDetails}>2.4 GHz · Password protected</Text>
              </View>
              <Feather name="wifi" size={20} color={p.iconStrong} />
            </View>

            {/* Password Field Label */}
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
              <Text style={styles.requiredAsterisk}>*</Text>
            </View>

            {/* Password Input Box */}
            <View style={styles.fieldCard}>
              <Feather name="lock" size={18} color={p.iconMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={styles.passwordInput}
                placeholder=""
                placeholderTextColor={p.placeholder}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                editable={status === STATUS.IDLE}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={p.iconMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Passwords remain hidden by default.</Text>

            {/* Power Note Box */}
            <View style={styles.infoBox}>
              <Feather name="zap" size={16} color={p.infoIcon} style={{ marginRight: 10 }} />
              <Text style={styles.infoBoxText}>
                Keep IntelliTemp powered while the connection is configured.
              </Text>
            </View>

            {/* Choose another network button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={busy}
              style={styles.chooseNetworkButton}
            >
              <Text style={styles.chooseNetworkText}>Choose another network</Text>
            </TouchableOpacity>

            {/* ---- SENDING / VERIFYING: spinner ---- */}
            {busy && (
              <View style={[styles.button, styles.buttonBusy]}>
                <ActivityIndicator size="small" color={p.onAccent} />
                <Text style={styles.buttonText}>
                  {status === STATUS.SENDING ? 'Sending credentials...' : 'Verifying connection...'}
                </Text>
              </View>
            )}

            {/* ---- SUCCESS ---- */}
            {status === STATUS.SUCCESS && (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: statusColors.success.bg, borderColor: statusColors.success.border },
                ]}
              >
                <View style={[styles.statusIconWrap, { backgroundColor: `${statusColors.success.fg}1A` }]}>
                  <Feather name="check" size={22} color={statusColors.success.fg} />
                </View>
                <Text style={[styles.statusTitle, { color: statusColors.success.fg }]}>
                  Connected
                </Text>
                <Text style={styles.statusBody}>
                  Device connected to "{network.SSID}".
                </Text>

                <View style={styles.phonePill}>
                  <View
                    style={[
                      styles.phonePillDot,
                      { backgroundColor: phoneConnected ? statusColors.success.fg : p.sub },
                    ]}
                  />
                  <Text style={styles.phonePillText} numberOfLines={1}>
                    {phoneConnected
                      ? `Phone connected to "${network.SSID}"`
                      : `Waiting for phone to connect to "${network.SSID}"...`}
                  </Text>
                </View>

                <TouchableOpacity
                  disabled={!phoneConnected}
                  onPress={handleProceedToConnected}
                  activeOpacity={0.85}
                  style={[styles.button, styles.statusButtonSpacing, !phoneConnected && styles.buttonDisabled]}
                >
                  <Text style={styles.buttonText}>Continue to Installation</Text>
                  <Feather name="arrow-right" size={16} color={p.onAccent} />
                </TouchableOpacity>
              </View>
            )}

            {/* ---- FAILED ---- */}
            {status === STATUS.FAILED && (
              <View
                style={[
                  styles.statusCard,
                  { backgroundColor: statusColors.error.bg, borderColor: statusColors.error.border },
                ]}
              >
                <View style={[styles.statusIconWrap, { backgroundColor: `${statusColors.error.fg}1A` }]}>
                  <Feather name="x" size={22} color={statusColors.error.fg} />
                </View>
                <Text style={[styles.statusTitle, { color: statusColors.error.fg }]}>
                  Not Connected
                </Text>
                <Text style={[styles.statusBody, { color: isDark ? '#FCA5A5' : '#7F1D1D' }]}>
                  {errorMsg}
                </Text>

                <TouchableOpacity
                  onPress={handleRetry}
                  activeOpacity={0.85}
                  style={[styles.button, styles.buttonDestructive, styles.statusButtonSpacing]}
                >
                  <Feather name="refresh-cw" size={16} color={statusColors.error.fg} />
                  <Text style={[styles.buttonText, { color: statusColors.error.fg }]}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom Bar containing Primary Action Button */}
        {status === STATUS.IDLE && (
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.button} onPress={handleConnect} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Connect to site Wi-Fi</Text>
              <Feather name="arrow-right" size={18} color={p.onAccent} />
            </TouchableOpacity>
            <Text style={styles.poweredByText}>
              Powered By <Text style={styles.poweredByBrand}>EVOLUZN</Text>
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (p) => StyleSheet.create({
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: p.header,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: p.title,
  },
  headerSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: p.titleSub,
  },
  logoContainer: {
    width: 90,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  logoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#9C27B0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 90,
    height: 40,
    resizeMode: 'contain',
  },
  logoTextSymbol: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: -2,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '600',
    color: p.label,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: p.bg,
  },
  stepProgressContainer: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 16,
  },
  stepSegment: {
    flex: 1,
    height: 3,
    backgroundColor: p.stepOff,
    borderRadius: 2,
  },
  stepSegmentActive: {
    backgroundColor: p.accent,
  },
  header: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: p.accent,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: p.strong,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    color: p.sub,
    marginTop: 6,
    lineHeight: 20,
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: p.border,
  },
  networkLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: p.accent,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  networkSsid: {
    fontSize: 16,
    fontWeight: '700',
    color: p.strong,
  },
  networkSubDetails: {
    fontSize: 13,
    color: p.muted,
    marginTop: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: p.label,
  },
  requiredAsterisk: {
    color: p.required,
    marginLeft: 4,
    fontSize: 14,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: p.inputBorder,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: p.strong,
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 12,
    color: p.muted,
    marginTop: 6,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  infoBoxText: {
    fontSize: 13,
    color: p.sub,
    flex: 1,
    lineHeight: 18,
  },
  chooseNetworkButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  chooseNetworkText: {
    fontSize: 14,
    fontWeight: '700',
    color: p.accent,
  },
  bottomBar: {
    backgroundColor: p.header,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: p.footerBorder,
    alignItems: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    backgroundColor: p.accent,
  },
  buttonBusy: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: p.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDestructive: {
    backgroundColor: p.surface,
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.28)',
  },
  poweredByText: {
    fontSize: 11,
    color: p.poweredBy,
    marginTop: 10,
  },
  poweredByBrand: {
    fontWeight: '700',
    color: p.accent,
  },
  statusCard: {
    marginTop: 4,
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBody: {
    fontSize: 14,
    color: p.sub,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusButtonSpacing: {
    marginTop: 18,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: p.bg,
    borderWidth: 1,
    borderColor: p.border,
    maxWidth: '100%',
  },
  phonePillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  phonePillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: p.sub,
    flexShrink: 1,
  },
});