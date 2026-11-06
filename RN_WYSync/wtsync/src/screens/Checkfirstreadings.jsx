import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import io from 'socket.io-client';

import IP_ADDRESS from '../services/ipconfig';

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
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
  muted: '#9CA3AF',
  accent: '#8B2A8B',
  onAccent: '#FFF',
  stepOff: '#E5E5EA',
  chip: '#F5E6F5',
  hint: '#F3EFF6',
  okBg: '#DCFCE7',
  okText: '#15803D',
  warnBg: '#FEF3C7',
  warnText: '#B45309',
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
  muted: '#A1A1AA',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  chip: '#3A2A3A',
  hint: '#2A2430',
  okBg: '#143A24',
  okText: '#4ADE80',
  warnBg: '#3A2F20',
  warnText: '#FBBF24',
  brandText: '#A1A1AA',
  brandBold: '#E5A0DC',
};

const TOTAL_STEPS = 6;
const CURRENT_STEP = 3;

const DEFAULT_LABELS = [
  'Incomer R phase',
  'Incomer Y phase',
  'Incomer B phase',
  'Enclosure surface',
];

/* ---------- Live readings ---------- */

// Probe T1..T4 -> telemetry column. Same mapping as PROBE_TO_PHASE_COLUMN in the backend.
const PROBE_COLUMNS = ['R1', 'Y1', 'B1', 'N1'];

// Values some sensors report when a probe is unplugged. A real 0.0 stays valid.
const SENSOR_ERROR_VALUES = [-127];

// A stored reading is only used to fill the screen at the start if it is newer than this.
const PREFILL_MAX_AGE_MS = 5 * 60 * 1000;

// A reading older than this is shown as "stale" (the device normally reports more often).
const STALE_AFTER_SEC = 90;

const isValidReading = (value) =>
  typeof value === 'number' && Number.isFinite(value) && !SENSOR_ERROR_VALUES.includes(value);

// "WTS-F0C0BE " and "wtsf0c0be" are the same device
const normalizeSerial = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

// Backend "live_telemetry" message -> [T1, T2, T3, T4] (null when missing / invalid)
const readingsFromPayload = (panels) => {
  const byPhase = {};
  (panels || []).forEach((panel) =>
    (panel.temperatures || []).forEach((t) => {
      byPhase[t.phase] = t.current;
    })
  );
  return PROBE_COLUMNS.map((col) => (isValidReading(byPhase[col]) ? byPhase[col] : null));
};

// Stored readings are saved in UTC without a time zone marker, so add it before parsing
const parseServerTime = (iso) => {
  if (!iso) return NaN;
  const hasZone = /([zZ]|[+-]\d\d:?\d\d)$/.test(iso);
  return Date.parse(hasZone ? iso : `${iso}Z`);
};

const pad = (n) => String(n).padStart(2, '0');
const formatClock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const formatAgo = (seconds) => {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
};

const Checkfirstreadings = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  // Probe names come from the previous step (Identifyfourprobes)
  const labels = route?.params?.probeLabels || DEFAULT_LABELS;

  // The device being installed (passed along by every step of the wizard)
  const serial =
    route?.params?.serialNo ||
    route?.params?.deviceId ||
    route?.params?.product?.['Serial No'] ||
    '';

  const [readings, setReadings] = useState([null, null, null, null]);
  const [receivedAt, setReceivedAt] = useState(null); // when the newest reading was taken
  const [link, setLink] = useState('connecting'); // 'connecting' | 'live' | 'offline'
  const [, setTick] = useState(0);
  const receivedAtRef = useRef(null);

  const applyReadings = useCallback((values, at) => {
    receivedAtRef.current = at;
    setReadings(values);
    setReceivedAt(at);
  }, []);

  // Hide tab bar for this screen (same as the other registration screens)
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: 'none' } });

    const parentNav = navigation.getParent?.();
    if (parentNav) {
      parentNav.setOptions({ tabBarStyle: { display: 'none' } });
    }

    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
      if (parentNav) {
        parentNav.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [navigation]);

  // Live readings: listen while this screen is on top, stop when the user moves on
  useFocusEffect(
    useCallback(() => {
      if (!serial) return undefined;

      const wanted = normalizeSerial(serial);
      let cancelled = false;

      const socket = io(IP_ADDRESS, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
      });
      socket.on('connect', () => setLink('live'));
      socket.on('disconnect', () => setLink('offline'));
      socket.on('connect_error', () => setLink('offline'));

      // Every message the device publishes arrives here within a moment
      socket.on('live_telemetry', (msg) => {
        if (normalizeSerial(msg?.serial_no) !== wanted) return;
        applyReadings(readingsFromPayload(msg.panels), Date.now());
      });

      // The screen should not stay empty until the next message: fill it from the newest
      // stored reading, if that is recent. A live message that arrives first always wins.
      (async () => {
        try {
          const response = await fetch(
            `${IP_ADDRESS}/api/telemetry-history?serial_no=${encodeURIComponent(serial)}`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          const rows = await response.json();
          const last = Array.isArray(rows) ? rows[rows.length - 1] : null;
          if (!last || cancelled) return;

          const takenAt = parseServerTime(last.timestamp);
          const age = Date.now() - takenAt;
          if (Number.isNaN(takenAt) || age < -60000 || age > PREFILL_MAX_AGE_MS) return;
          if (receivedAtRef.current != null && receivedAtRef.current >= takenAt) return;

          applyReadings(
            PROBE_COLUMNS.map((col) => (isValidReading(last[col]) ? last[col] : null)),
            takenAt
          );
        } catch (e) {
          // No stored reading yet: the live message will fill the screen
        }
      })();

      return () => {
        cancelled = true;
        socket.disconnect();
      };
    }, [serial, applyReadings])
  );

  // Re-render every second so "x seconds ago" keeps counting
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const hasData = receivedAt != null;
  const validCount = readings.filter(isValidReading).length;
  const totalCount = labels.length;
  const allValid = hasData && validCount === totalCount;
  const ageSec = hasData ? Math.max(0, Math.round((Date.now() - receivedAt) / 1000)) : null;
  const isStale = ageSec != null && ageSec > STALE_AFTER_SEC;
  const sampleTime = hasData ? formatClock(receivedAt) : '';

  let titleText;
  if (!serial) {
    titleText = 'Device ID not found';
  } else if (!hasData) {
    titleText = 'Waiting for readings…';
  } else if (allValid) {
    titleText = 'Four probes. Four valid readings.';
  } else {
    titleText = `Four probes. ${validCount} valid reading${validCount === 1 ? '' : 's'}.`;
  }

  let statusText;
  if (!serial) {
    statusText = 'No device selected';
  } else if (hasData) {
    statusText = `${isStale ? 'Last reading' : 'Received'} ${formatAgo(ageSec)}`;
  } else if (link === 'offline') {
    statusText = 'Cannot reach the server, retrying…';
  } else {
    statusText = 'Listening for the device…';
  }

  const onContinue = () => {
    navigation.navigate('Setclearalertlimits', {
      ...(route?.params || {}),
      probeLabels: labels,
      readings,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() && navigation.goBack()}>
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
        {/* Step progress */}
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

        <Text style={styles.stepSubtitle}>STEP 3 OF 6 · IDENTIFY SENSORS</Text>
        <Text
          style={styles.stepTitle}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}>
          {titleText}
        </Text>
        <Text style={styles.stepDescription}>
          Check each physical point before setting alerts.
        </Text>

        {/* Readings card */}
        <View style={styles.readingsCard}>
          {labels.map((label, index) => {
            const value = readings[index];
            const valid = isValidReading(value);
            const isLast = index === labels.length - 1;

            return (
              <View key={index} style={[styles.readingRow, isLast && styles.readingRowLast]}>
                <View style={styles.probeChip}>
                  <Text style={styles.probeChipText}>{`T${index + 1}`}</Text>
                </View>

                <View style={styles.readingInfo}>
                  <Text style={styles.readingLabel} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text style={styles.readingSub}>
                    {valid
                      ? `Valid sample · ${sampleTime}`
                      : hasData
                      ? 'No valid sample'
                      : 'Waiting for reading'}
                  </Text>
                </View>

                <View style={styles.readingValueWrap}>
                  <Text style={styles.readingValue}>
                    {valid ? Number(value).toFixed(1) : '—'}
                  </Text>
                  {valid && <Text style={styles.readingUnit}>°C</Text>}
                </View>
              </View>
            );
          })}
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <View style={[styles.validBadge, !allValid && styles.validBadgeWarn]}>
            <Feather
              name={allValid ? 'check' : 'alert-circle'}
              size={11}
              color={allValid ? t.okText : t.warnText}
            />
            <Text style={[styles.validBadgeText, !allValid && styles.validBadgeTextWarn]}>
              {hasData ? `${validCount} / ${totalCount} valid` : 'Waiting'}
            </Text>
          </View>

          <View style={styles.receivedWrap}>
            <Feather name="clock" size={12} color={isStale ? t.warnText : t.muted} />
            <Text style={[styles.receivedText, isStale && { color: t.warnText }]}>
              {statusText}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.hintCard}>
          <Feather name="info" size={16} color={t.accent} style={styles.hintIcon} />
          <Text style={styles.hintText}>
            {serial
              ? 'A genuine 0.0°C is valid when reported by the sensor. Missing or invalid values are shown as —. Values update live as the device reports.'
              : 'The device ID was not passed to this step, so live readings cannot be shown. Go back and start the setup again.'}
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onContinue}>
          <Text style={styles.primaryActionButtonText}>Set alert limits</Text>
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

export default Checkfirstreadings;

const createStyles = (t, insets) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: t.bg, },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,  paddingTop: Math.max(insets.top, 12), paddingBottom: 14, backgroundColor: t.bg, borderBottomWidth: 1, borderBottomColor: t.footerBorder, },
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', },
    backButton: { paddingVertical: 4, paddingRight: 14, },
    headerTitle: { fontSize: 18, fontWeight: '700', color: t.title, },
    headerSubtitleText: {fontSize: 14,fontWeight: '600',color: t.titleSub, },
    brandLogo: {  width: 90,  height: 24, },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, },
    stepProgressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24,},
    stepBar: { flex: 1, height: 4, backgroundColor: t.stepOff, borderRadius: 2, marginRight: 8, },
    stepBarActive: { backgroundColor: t.accent, },
    stepSubtitle: { fontSize: 12, fontWeight: '700', color: t.accent, letterSpacing: 0.8, marginBottom: 6, },
    stepTitle: { fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: -0.5,},
    stepDescription: {fontSize: 15, color: t.sub, marginTop: 4, marginBottom: 24,},
    readingsCard: { backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.border, paddingHorizontal: 14, },
    readingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.divider,},
    readingRowLast: { borderBottomWidth: 0,},
    probeChip: { width: 32, height: 32, borderRadius: 8, backgroundColor: t.chip, alignItems: 'center', justifyContent: 'center', marginRight: 12,},
    probeChipText: {fontSize: 11, fontWeight: '800', color: t.accent,},
    readingInfo: { flex: 1, marginRight: 10,},
    readingLabel: { fontSize: 14.5, fontWeight: '600', color: t.text,},
    readingSub: { fontSize: 12, color: t.muted, marginTop: 4,},
    readingValueWrap: { flexDirection: 'row', alignItems: 'flex-start', },
    readingValue: { fontSize: 22, fontWeight: '600', color: t.text,},
    readingUnit: { fontSize: 11, color: t.sub,  marginTop: 4,  marginLeft: 1,},
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14,},
    validBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.okBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, gap: 4,},
    validBadgeWarn: { backgroundColor: t.warnBg,},
    validBadgeText: { fontSize: 12, fontWeight: '600', color: t.okText,},
    validBadgeTextWarn: { color: t.warnText,},
    receivedWrap: { flexDirection: 'row', alignItems: 'center', gap: 5,},
    receivedText: { fontSize: 12, color: t.muted, },
    hintCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: t.hint, borderRadius: 12, padding: 14, marginTop: 18,},
    hintIcon: {  marginRight: 10,  marginTop: 1, },
    hintText: {flex: 1, fontSize: 12.5, lineHeight: 18, color: t.sub,},
    bottomFooterSheet: { backgroundColor: t.surface, paddingHorizontal: 20, paddingTop: 16, paddingBottom: Math.max(insets.bottom, 16), borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderTopColor: t.footerBorder, },
    primaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: t.accent, borderRadius: 14, paddingVertical: 16, gap: 8,},
    primaryActionButtonText: { color: t.onAccent, fontSize: 16, fontWeight: '700',},
    brandFooterRow: { alignItems: 'center', marginTop: 14, },
    brandFooterText: { fontSize: 12, color: t.brandText,},
    brandFooterBold: { fontWeight: '800', color: t.brandBold, letterSpacing: 1.2, },
  });