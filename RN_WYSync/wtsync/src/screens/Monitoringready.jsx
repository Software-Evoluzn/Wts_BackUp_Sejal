import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

/* ---------- Theme palettes (same colours as the other setup screens) ---------- */
const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFF',
  border: '#E5E7EB',
  divider: '#EDEDF0',
  footerBorder: '#F0F0F5',
  backIcon: '#333',
  title: '#1C1C1E',
  titleSub: '#8E8E93',
  text: '#111827',
  sub: '#6B7280',
  accent: '#8B2A8B',
  onAccent: '#FFF',
  stepOff: '#E5E5EA',
  successBg: '#E8F5EC',
  successIcon: '#2F6B4F',
  brandText: '#6E6577',
  brandBold: '#7B2B75',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  divider: '#3A3540',
  footerBorder: '#2E2A33',
  backIcon: '#FFFFFF',
  title: '#FFFFFF',
  titleSub: '#E5A0DC',
  text: '#F4F4F5',
  sub: '#A1A1AA',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  successBg: '#143A24',
  successIcon: '#4ADE80',
  brandText: '#A1A1AA',
  brandBold: '#E5A0DC',
};

const TOTAL_STEPS = 6;
const CURRENT_STEP = 6;

/* ---------- Static content (edit the texts here) ---------- */
const LOCATION = 'Floor 3 · MCC-01';

const CHECKLIST = [
  { title: 'Device identified', detail: 'Thermidity 4P · four temperature inputs.' },
  { title: 'Wi-Fi and service connected', detail: 'Evoluzn_Demo_2G' },
  { title: 'First valid readings received', detail: '4 / 4 temperature probes reporting.' },
  { title: 'Labels and limits confirmed', detail: 'DEMO-CFG-02 applied by the device.' },
  { title: 'Test notification checked', detail: 'Receipt confirmed by the demo operator.' },
];

const Monitoringready = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  // Passed by the Review screen after a successful apply
  const serialNo = route?.params?.serialNo;

  // The setup is finished, so "back" goes to Home, never back into the setup steps
  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Main' }] });

  const onOpenDashboard = () => {
    // Open the device overview. Home stays underneath, so "back" lands on Home.
    navigation.reset({
      index: 1,
      routes: [{ name: 'Main' }, { name: 'Commissioned', params: { serialNo } }],
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={goHome}>
            <Feather name="arrow-left" size={22} color={t.backIcon} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Thermidity <Text style={styles.headerSubtitleText}>4P</Text>
          </Text>
        </View>

        <Image
          source={require('../assests/images/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Step progress (all six steps done) */}
        <View style={styles.stepProgressContainer}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.stepBar,
                i < CURRENT_STEP && styles.stepBarActive,
                i === TOTAL_STEPS - 1 && { marginRight: 0 },
              ]}
            />
          ))}
        </View>

        {/* Success mark */}
        <View style={styles.successCircle}>
          <Feather name="check" size={34} color={t.successIcon} />
        </View>

        <Text style={styles.stepSubtitle}>STEP 6 OF 6 · FINISH</Text>
        <Text style={styles.title}>Ready to monitor.</Text>
        <Text style={styles.description}>{`Setup is complete for ${LOCATION}.`}</Text>

        {/* Checklist card */}
        <View style={styles.card}>
          {CHECKLIST.map((item, index) => (
            <View
              key={item.title}
              style={[styles.row, index === CHECKLIST.length - 1 && styles.rowLast]}>
              <View style={styles.rowIcon}>
                <Feather name="check" size={13} color={t.successIcon} />
              </View>

              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onOpenDashboard}>
          <Text style={styles.primaryActionButtonText}>Open device dashboard</Text>
          <Feather name="arrow-right" size={18} color={t.onAccent} />
        </TouchableOpacity>

        <View style={styles.brandFooterRow}>
          <Text style={styles.brandFooterText}>
            Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Monitoringready;

const createStyles = (t, insets) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 12),
      paddingBottom: 14,
      backgroundColor: t.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.footerBorder,
    },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 4, paddingRight: 14 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: t.title },
    headerSubtitleText: { fontSize: 14, fontWeight: '600', color: t.titleSub },
    brandLogo: { width: 90, height: 24 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    stepProgressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
    stepBar: { flex: 1, height: 4, backgroundColor: t.stepOff, borderRadius: 2, marginRight: 8 },
    stepBarActive: { backgroundColor: t.accent },
    successCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: t.successBg,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: 22,
    },
    stepSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: t.accent,
      letterSpacing: 0.8,
      textAlign: 'center',
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: t.text,
      letterSpacing: -0.5,
      textAlign: 'center',
    },
    description: {
      fontSize: 15,
      color: t.sub,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 26,
    },
    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    rowLast: { borderBottomWidth: 0 },
    rowIcon: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: t.successBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    rowText: { flex: 1 },
    rowTitle: { fontSize: 14.5, fontWeight: '600', color: t.text },
    rowDetail: { fontSize: 12, color: t.sub, marginTop: 3 },
    bottomFooterSheet: {
      backgroundColor: t.surface,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Math.max(insets.bottom, 16),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderTopColor: t.footerBorder,
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 16,
      gap: 8,
    },
    primaryActionButtonText: { color: t.onAccent, fontSize: 16, fontWeight: '700' },
    brandFooterRow: { alignItems: 'center', marginTop: 14 },
    brandFooterText: { fontSize: 12, color: t.brandText },
    brandFooterBold: { fontWeight: '800', color: t.brandBold, letterSpacing: 1.2 },
  });