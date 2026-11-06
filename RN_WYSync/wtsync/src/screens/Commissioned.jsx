import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getAuth } from '@react-native-firebase/auth';
import Feather from 'react-native-vector-icons/Feather';
import io from 'socket.io-client';

import IP_ADDRESS from '../services/ipconfig';
import { getProducts } from '../services/ProductApi';

/* ---------- Theme palettes (same colours as Monitoringready and the setup screens) ---------- */
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
  okText: '#15803D',
  okBg: '#DCFCE7',
  warnText: '#B45309',
  warnBg: '#FEF3C7',
  dangerText: '#DC2626',
  dangerBg: '#FEE2E2',
  tabInactive: '#8B8796',
  tabBorder: '#EFECEF',
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
  okText: '#4ADE80',
  okBg: '#143A24',
  warnText: '#FBBF24',
  warnBg: '#3A2F20',
  dangerText: '#F87171',
  dangerBg: '#3F1D1D',
  tabInactive: '#A1A1AA',
  tabBorder: '#3A3540',
};

/* ---------- Bottom bar (same items, icons and colours as the app's tab bar) ---------- */
const ACCENT = '#8E338A';
const TABS = [
  { label: 'Devices', icon: 'home', screen: null, active: true },
  { label: 'Add device', icon: 'plus-circle', screen: 'Register', active: false },
  { label: 'Settings', icon: 'sliders', screen: 'Settings', active: false },
];

/* ---------- Pure helpers ---------- */

// Probe 1..24 -> telemetry column (same order the backend uses)
const PHASE_COLUMNS = [
  'R1', 'Y1', 'B1', 'N1', 'R2', 'Y2', 'B2', 'N2',
  'R3', 'Y3', 'B3', 'N3', 'R4', 'Y4', 'B4', 'N4',
  'R5', 'Y5', 'B5', 'N5', 'R6', 'Y6', 'B6', 'N6',
];

// Values some sensors report when a probe is unplugged. A real 0.0 stays valid.
const SENSOR_ERROR_VALUES = [-127];

// How often the device details and the latest stored values are re-read
const REFRESH_MS = 10000;

// If the live connection delivered something this recently, it is fresher than a refresh
const LIVE_FRESH_MS = 15000;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isValidReading = (v) => isNum(v) && !SENSOR_ERROR_VALUES.includes(v);

const normalizeSerial = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

// Old records may still say "IntelliTemp"
const brandName = (s) => String(s || '').replace(/intelli\s*-?\s*temp/i, 'Thermidity');

// A list of {panel_no, temperatures:[{phase, current}]} (the same shape the live message and
// /api/dashboard use) -> 24 values, null where missing / invalid
const readingsFromPanels = (panels) => {
  const byPhase = {};
  (panels || []).forEach((panel) =>
    (panel.temperatures || []).forEach((tmp) => {
      byPhase[tmp.phase] = tmp.current;
    })
  );
  return PHASE_COLUMNS.map((col) => (isValidReading(byPhase[col]) ? byPhase[col] : null));
};

// The device to show: the one given by the previous screen, otherwise the newest one
const pickDevice = (list, wantedSerial) => {
  if (!list || !list.length) return null;
  if (wantedSerial) {
    const found = list.find((p) => normalizeSerial(p.serial_no) === normalizeSerial(wantedSerial));
    if (found) return found;
  }
  return list.reduce((a, b) => ((b.id || 0) > (a.id || 0) ? b : a));
};

// "4P" -> 4, "12P" -> 12 (default 4)
const probeCountOf = (product) => {
  const m = /^(\d+)\s*P$/i.exec(String(product?.probe_type || '').trim());
  const n = m ? parseInt(m[1], 10) : 4;
  return Math.min(Math.max(n, 1), PHASE_COLUMNS.length);
};

const NUMBER_WORDS = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 6: 'six', 8: 'eight', 12: 'twelve', 16: 'sixteen', 24: 'twenty-four' };
const numberWord = (n) => NUMBER_WORDS[n] || String(n);

// Alert limits saved for the device: own limit of the probe, otherwise the group limit
const highLimitFor = (product, i) => {
  const own = product?.individual_thresholds?.[`probe_${i + 1}`];
  if (isNum(own)) return own;
  return isNum(product?.threshold_value) ? product.threshold_value : null;
};
const lowLimitOf = (product) =>
  product?.low_enabled && isNum(product?.low_limit) ? product.low_limit : null;

// 'ok' | 'valid' (valid, but no limit set) | 'high' | 'low' | 'invalid'
const statusOf = (value, high, low) => {
  if (!isValidReading(value)) return 'invalid';
  if (high != null && value > high) return 'high';
  if (low != null && value < low) return 'low';
  return high != null || low != null ? 'ok' : 'valid';
};

const fmt = (n) => Number(n).toFixed(1);
const fmtLimit = (n) => String(Number(Number(n).toFixed(1)));

const pad = (n) => String(n).padStart(2, '0');

const formatAge = (seconds) => {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} sec ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
};

// "IST" for India, otherwise UTC+hh:mm
const tzLabel = () => {
  const off = -new Date().getTimezoneOffset();
  if (off === 330) return 'IST';
  const a = Math.abs(off);
  return `UTC${off >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
};

// The summary card under the probe cards
const buildSummary = (items, hasData) => {
  const count = items.length;
  const word = numberWord(count);
  if (!hasData) {
    return {
      tone: 'wait',
      icon: 'clock',
      title: 'Waiting for readings…',
      detail: 'Values appear here as soon as the device reports.',
    };
  }

  const high = items.filter((x) => x.status === 'high');
  const low = items.filter((x) => x.status === 'low');
  const missing = items.filter((x) => x.status === 'invalid');

  const describe = (list, kind) => {
    const shown = list.slice(0, 3).map((x) =>
      kind === 'high'
        ? `T${x.n} ${x.label}: ${fmt(x.value)}°C (limit ${fmtLimit(x.high)}°C)`
        : `T${x.n} ${x.label}: ${fmt(x.value)}°C (low limit ${fmtLimit(x.low)}°C)`
    );
    return shown.join('; ') + (list.length > 3 ? ` +${list.length - 3} more` : '');
  };

  if (high.length) {
    return {
      tone: 'high',
      icon: 'alert-triangle',
      title: `${high.length} point${high.length === 1 ? ' is' : 's are'} above limit.`,
      detail: describe(high, 'high'),
    };
  }
  if (low.length) {
    return {
      tone: 'warn',
      icon: 'alert-circle',
      title: `${low.length} point${low.length === 1 ? ' is' : 's are'} below the low limit.`,
      detail: describe(low, 'low'),
    };
  }
  if (missing.length) {
    return {
      tone: 'warn',
      icon: 'alert-circle',
      title: `${count - missing.length} of ${count} points reporting.`,
      detail: 'Check the sensor connection of the points showing —.',
    };
  }
  const anyLimit = items.some((x) => x.high != null || x.low != null);
  return {
    tone: 'ok',
    icon: 'check',
    title: anyLimit ? `All ${word} points are in range.` : `All ${word} points are reporting.`,
    detail: anyLimit
      ? 'No active temperature above-limit events in this snapshot.'
      : 'No alert limits are set for this device.',
  };
};

/* ---------- Screen ---------- */

const Commissioned = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting (same as Monitoringready)
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  // Given by the "Ready to monitor" screen. Without it, the newest device is shown.
  const wantedSerial = route?.params?.serialNo || '';

  const [product, setProduct] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [labels, setLabels] = useState({});
  const [readings, setReadings] = useState(() => Array(PHASE_COLUMNS.length).fill(null));
  const [receivedAt, setReceivedAt] = useState(null);
  const [online, setOnline] = useState(false);
  const [, setTick] = useState(0);

  const liveEventAtRef = useRef(0); // last time the live connection delivered something

  const serial = product?.serial_no || '';

  // The bottom bar mirrors the app's tabs. Setup is finished, so these start fresh at the tab.
  const goToTab = (screen) =>
    navigation.reset({
      index: 0,
      routes: [screen ? { name: 'Main', params: { screen } } : { name: 'Main' }],
    });

  /* Device information (name, location, limits, status) and the latest stored values.
     Runs when the screen opens and then every few seconds. It is the safety net, so the
     screen is correct even if the live connection is slow or unavailable. */
  const refresh = useCallback(async () => {
    try {
      const result = await getProducts();
      if (!result?.success) {
        console.log('[Commissioned] could not load devices:', result?.message);
        return;
      }

      const found = pickDevice(result.products || [], wantedSerial);
      if (!found) return;
      console.log('[Commissioned] showing device', found.serial_no, '| asked for', wantedSerial || 'none');

      setProduct(found);
      const liveIsFresher = Date.now() - liveEventAtRef.current < LIVE_FRESH_MS;
      if (!liveIsFresher) setOnline(!!found.online);

      // Latest stored values of this device
      const uid = getAuth().currentUser?.uid;
      if (!uid || liveIsFresher) return;
      const res = await fetch(`${IP_ADDRESS}/api/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ firebase_uid: uid }),
      });
      const devices = await res.json();
      const mine = Array.isArray(devices)
        ? devices.find((d) => normalizeSerial(d.serial_no) === normalizeSerial(found.serial_no))
        : null;
      if (mine && Date.now() - liveEventAtRef.current >= LIVE_FRESH_MS) {
        setReadings(readingsFromPanels(mine.panels));
      }
    } catch (e) {
      console.log('[Commissioned] refresh failed:', e?.message);
    } finally {
      setLoaded(true);
    }
  }, [wantedSerial]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const id = setInterval(refresh, REFRESH_MS);
      return () => clearInterval(id);
    }, [refresh])
  );

  /* Instant updates and probe names, while this screen is visible */
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

      // Every message the device publishes
      socket.on('live_telemetry', (msg) => {
        if (normalizeSerial(msg?.serial_no) !== wanted) return;
        liveEventAtRef.current = Date.now();
        setOnline(true);
        setReadings(readingsFromPanels(msg.panels));
        setReceivedAt(Date.now());
      });

      // The backend saw the device come online / go offline
      socket.on('device_status', (s) => {
        if (normalizeSerial(s?.serial_no) !== wanted) return;
        liveEventAtRef.current = Date.now();
        setOnline(!!s.online);
      });

      // Probe names the installer typed in the setup
      (async () => {
        try {
          const labelRes = await fetch(
            `${IP_ADDRESS}/api/phase-labels?serial_no=${encodeURIComponent(serial)}`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          const names = await labelRes.json();
          if (!cancelled && names && !names.error) setLabels(names);
        } catch (e) {
          // names are optional, "Probe 1" is shown instead
        }
      })();

      return () => {
        cancelled = true;
        socket.disconnect();
      };
    }, [serial])
  );

  // Re-render every second so "x sec ago" keeps counting
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------- Derived values ---------- */
  const count = probeCountOf(product);
  const lowLimit = lowLimitOf(product);

  const items = Array.from({ length: count }, (_, i) => {
    const col = PHASE_COLUMNS[i];
    const value = readings[i];
    const high = highLimitFor(product, i);
    const given = labels[col];
    return {
      n: i + 1,
      value,
      high,
      low: lowLimit,
      status: statusOf(value, high, lowLimit),
      label: given && given !== col ? given : `Probe ${i + 1}`,
    };
  });

  const hasData = items.some((x) => isValidReading(x.value));
  const summary = buildSummary(items, hasData);

  const lastDataAt = Math.max(receivedAt || 0, product?.last_seen || 0) || null;
  const ageSec = lastDataAt ? Math.max(0, Math.round((Date.now() - lastDataAt) / 1000)) : null;

  const title =
    brandName(product?.location || product?.device_name) ||
    (loaded ? 'Device not found' : 'Loading…');
  const modelName = brandName(product?.model_no || product?.device_name);
  const subtitle = product
    ? `${modelName ? `${modelName} · ` : ''}${numberWord(count)} temperature input${count === 1 ? '' : 's'}.`
    : loaded
    ? 'This device could not be found in your account.'
    : '';

  const toneColor = { ok: t.okText, high: t.dangerText, warn: t.warnText, wait: t.muted }[summary.tone];

  // Connection chip: neutral until the device details are loaded
  let chip;
  if (!product) {
    chip = { text: 'Checking…', icon: 'clock', fg: t.muted, bg: t.border };
  } else if (online) {
    chip = { text: 'Connected', icon: 'check', fg: t.okText, bg: t.okBg };
  } else {
    chip = { text: 'Offline', icon: 'wifi-off', fg: t.warnText, bg: t.warnBg };
  }

  const statusLine = (item) => {
    switch (item.status) {
      case 'ok':
        return { text: 'Valid · In range', color: t.okText };
      case 'valid':
        return { text: 'Valid', color: t.okText };
      case 'high':
        return { text: `Above limit · ${fmtLimit(item.high)}°C`, color: t.dangerText };
      case 'low':
        return { text: `Below low limit · ${fmtLimit(item.low)}°C`, color: t.warnText };
      default:
        return { text: hasData ? 'No valid sample' : 'Waiting for reading', color: t.muted };
    }
  };

  const statusIcon = (item) => {
    if (item.status === 'high') return { name: 'alert-triangle', color: t.dangerText };
    if (item.status === 'low') return { name: 'alert-circle', color: t.warnText };
    if (item.status === 'invalid') return { name: 'minus-circle', color: t.muted };
    return { name: 'check-circle', color: t.okText };
  };

  const onExploreHistory = () => {
    if (!serial) return;
    navigation.navigate('Temperaturehistory', { serialNo: serial });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="thermometer" size={20} color={t.accent} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Thermidity</Text>
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
        <Text style={styles.overline}>DEVICE OVERVIEW</Text>
        <Text style={styles.deviceTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.deviceSubtitle}>{subtitle}</Text>

        {/* Connection row */}
        <View style={styles.statusRow}>
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Feather name={chip.icon} size={12} color={chip.fg} />
            <Text style={[styles.statusChipText, { color: chip.fg }]}>{chip.text}</Text>
          </View>

          <View style={styles.ageWrap}>
            <Feather name="clock" size={13} color={t.muted} />
            <Text style={styles.ageText}>
              {ageSec != null ? `${formatAge(ageSec)} · ${tzLabel()}` : 'No data yet'}
            </Text>
          </View>
        </View>

        {/* Probe cards */}
        <View style={styles.grid}>
          {items.map((item) => {
            const line = statusLine(item);
            const icon = statusIcon(item);
            return (
              <View key={item.n} style={styles.probeCard}>
                <View style={styles.probeTop}>
                  <Text style={styles.probeCaption}>
                    <Text style={styles.probeCaptionAccent}>{`T${item.n}`}</Text>
                    {' · Temperature'}
                  </Text>
                  <Feather name={icon.name} size={15} color={icon.color} />
                </View>

                <Text style={styles.probeLabel} numberOfLines={1}>
                  {item.label}
                </Text>

                <View style={styles.valueRow}>
                  <Text style={styles.probeValue}>
                    {isValidReading(item.value) ? fmt(item.value) : '—'}
                  </Text>
                  {isValidReading(item.value) && <Text style={styles.probeUnit}>°C</Text>}
                </View>

                <Text style={[styles.probeStatus, { color: line.color }]} numberOfLines={1}>
                  {line.text}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{summary.title}</Text>
            <Text style={styles.summaryDetail}>{summary.detail}</Text>
          </View>
          <Feather name={summary.icon} size={20} color={toneColor} />
        </View>

        {/* History */}
        <TouchableOpacity
          style={[styles.historyButton, !serial && styles.historyButtonDisabled]}
          activeOpacity={0.85}
          onPress={onExploreHistory}
          disabled={!serial}>
          <Feather name="bar-chart-2" size={18} color={t.accent} />
          <Text style={styles.historyText}>Explore temperature history</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom bar (same look as the app's tabs; "Devices" is the active one) */}
      <View style={styles.bottomBar}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={styles.tabItem}
              activeOpacity={0.8}
              onPress={() => goToTab(tab.screen)}>
              <Feather name={tab.icon} size={20} color={tab.active ? ACCENT : t.tabInactive} />
              <Text
                style={[
                  styles.tabLabel,
                  { color: tab.active ? ACCENT : t.tabInactive },
                  tab.active && styles.activeTabLabel,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.poweredByContainer}>
          <Text style={[styles.poweredByText, { color: t.tabInactive }]}>
            Powered By <Text style={styles.brandName}>EVOLUZN</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

export default Commissioned;

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
    headerIcon: { marginRight: 10 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: t.title },
    brandLogo: { width: 90, height: 24 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
    overline: { fontSize: 12, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 },
    deviceTitle: { fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
    deviceSubtitle: { fontSize: 14.5, color: t.sub, marginTop: 8 },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      marginBottom: 18,
    },
    statusChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 5,
      gap: 5,
    },
    statusChipText: { fontSize: 12.5, fontWeight: '600' },
    ageWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    ageText: { fontSize: 12.5, color: t.muted },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    probeCard: {
      width: '48.5%',
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
      marginBottom: 12,
    },
    probeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    probeCaption: { fontSize: 12, color: t.muted },
    probeCaptionAccent: { color: t.accent, fontWeight: '600' },
    probeLabel: { fontSize: 13.5, fontWeight: '600', color: t.text, marginTop: 14 },
    valueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
    probeValue: { fontSize: 32, fontWeight: '500', color: t.text, letterSpacing: -0.5 },
    probeUnit: { fontSize: 12, color: t.sub, marginLeft: 3, marginBottom: 6 },
    probeStatus: { fontSize: 12, fontWeight: '500', marginTop: 12 },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      marginTop: 2,
    },
    summaryText: { flex: 1, marginRight: 12 },
    summaryTitle: { fontSize: 15, fontWeight: '700', color: t.text },
    summaryDetail: { fontSize: 12.5, lineHeight: 18, color: t.sub, marginTop: 6 },
    historyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      paddingVertical: 16,
      marginTop: 14,
      gap: 10,
    },
    historyButtonDisabled: { opacity: 0.5 },
    historyText: { fontSize: 15, fontWeight: '700', color: t.accent },
    bottomBar: {
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.tabBorder,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 10),
    },
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: 6,
    },
    tabItem: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    tabLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
    activeTabLabel: { fontWeight: '700' },
    poweredByContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 2 },
    poweredByText: { fontSize: 11.5 },
    brandName: { fontWeight: '800', color: ACCENT },
  });