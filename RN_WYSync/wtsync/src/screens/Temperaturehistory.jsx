import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth } from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import Feather from 'react-native-vector-icons/Feather';

import IP_ADDRESS from '../services/ipconfig';
import { getProducts } from '../services/ProductApi';

/* ---------- Theme palettes (same colours as Monitoringready / Commissioned) ---------- */
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
  accentSoft: '#F5E6F5',
  onAccent: '#FFF',
  grid: '#ECECF0',
  limit: '#9CA3AF',
  tabActive: '#FFFFFF',
  tabTrack: '#F3F3F7',
  noteBg: '#F3EFF6',
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
  accentSoft: '#3A2A3A',
  onAccent: '#2A1230',
  grid: '#332E39',
  limit: '#A1A1AA',
  tabActive: '#3A3540',
  tabTrack: '#2A2630',
  noteBg: '#2A2430',
  brandText: '#A1A1AA',
  brandBold: '#E5A0DC',
};

/* ---------- Pure helpers ---------- */

// Probe 1..24 -> telemetry column (same order the backend uses)
const PHASE_COLUMNS = [
  'R1', 'Y1', 'B1', 'N1', 'R2', 'Y2', 'B2', 'N2',
  'R3', 'Y3', 'B3', 'N3', 'R4', 'Y4', 'B4', 'N4',
  'R5', 'Y5', 'B5', 'N5', 'R6', 'Y6', 'B6', 'N6',
];

const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET_MINUTES = 5; // the backend averages readings into points of this size
const BUCKET_MS = BUCKET_MINUTES * 60000;
// Two or more empty buckets in a row are drawn as a break instead of a joined line
const GAP_MS = BUCKET_MS * 3;
const REFRESH_MS = 60000; // today's chart is re-read every minute

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isValidReading = (v) => isNum(v) && v !== -127;

const normalizeSerial = (s) => String(s || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

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

// Alert limit of a probe: its own limit, otherwise the group limit
const highLimitFor = (product, i) => {
  const own = product?.individual_thresholds?.[`probe_${i + 1}`];
  if (isNum(own)) return own;
  return isNum(product?.threshold_value) ? product.threshold_value : null;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// The 24 hours to show for a chosen date (in the phone's own time zone):
//  - today:      the last 24 hours, ending now
//  - an earlier day: that whole day, 00:00 to 24:00
const windowFor = (date, nowMs) => {
  if (sameDay(date, new Date(nowMs))) return { start: nowMs - DAY_MS, end: nowMs, isToday: true };
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
  return { start, end, isToday: false };
};

const formatClock = (ms) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatDayTime = (ms) => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${formatClock(ms)}`;
};
const dateChipLabel = (date) => {
  if (sameDay(date, new Date())) return `Today · ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
};

const timeZoneName = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Some phones still report India under its old name
    if (tz) return tz === 'Asia/Calcutta' ? 'Asia/Kolkata' : tz;
  } catch (e) {
    // fall through
  }
  const off = -new Date().getTimezoneOffset();
  const a = Math.abs(off);
  return `UTC${off >= 0 ? '+' : '-'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
};

// Round axis numbers (e.g. 20, 30, 40 ...) that cover [min, max]
const niceScale = (min, max) => {
  if (!isNum(min) || !isNum(max)) return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
  if (max - min < 1) {
    const mid = (min + max) / 2;
    min = mid - 1;
    max = mid + 1;
  }
  const rough = (max - min) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 1000; v += step) ticks.push(Number(v.toFixed(6)));
  return { min: lo, max: hi, ticks };
};

// Time-axis marks on whole hours (every 6 h), inside the window
const hourTicks = (start, end, everyHours = 6) => {
  const d = new Date(start);
  d.setMinutes(0, 0, 0);
  while (d.getTime() < start || d.getHours() % everyHours !== 0) d.setHours(d.getHours() + 1);
  const ticks = [];
  while (d.getTime() <= end) {
    ticks.push(d.getTime());
    d.setHours(d.getHours() + everyHours);
  }
  return ticks;
};

// Splits a series wherever readings are missing for a while, so the gap stays visible
const buildSegments = (series, gapMs) => {
  const segments = [];
  let current = [];
  series.forEach((p) => {
    if (current.length && p.t - current[current.length - 1].t > gapMs) {
      segments.push(current);
      current = [];
    }
    current.push(p);
  });
  if (current.length) segments.push(current);
  return segments;
};

// A smooth line through screen points
const smoothPath = (pts) => {
  if (pts.length < 2) return '';
  const f = (n) => n.toFixed(1);
  let d = `M${f(pts[0].x)},${f(pts[0].y)}`;
  if (pts.length === 2) return `${d} L${f(pts[1].x)},${f(pts[1].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q${f(pts[i].x)},${f(pts[i].y)} ${f(mx)},${f(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${f(last.x)},${f(last.y)}`;
};

const formatTick = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

/* ---------- Chart ---------- */

const CHART_HEIGHT = 190;
const PAD = { left: 34, right: 8, top: 10, bottom: 22 };

const TrendChart = ({ width, t, start, end, series, limit, loading }) => {
  if (!width) return <View style={{ height: CHART_HEIGHT }} />;

  const plotW = width - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const values = series.map((p) => p.v);
  if (isNum(limit)) values.push(limit);
  const scale = niceScale(values.length ? Math.min(...values) : NaN, values.length ? Math.max(...values) : NaN);

  const x = (ms) => PAD.left + ((ms - start) / (end - start)) * plotW;
  const y = (v) => PAD.top + (1 - (v - scale.min) / (scale.max - scale.min)) * plotH;

  const xTicks = hourTicks(start, end);
  const segments = buildSegments(series, GAP_MS);

  return (
    <View>
      <Svg width={width} height={CHART_HEIGHT}>
        {/* horizontal grid + value labels */}
        {scale.ticks.map((v) => (
          <React.Fragment key={`y${v}`}>
            <Line x1={PAD.left} y1={y(v)} x2={width - PAD.right} y2={y(v)} stroke={t.grid} strokeWidth={1} />
            <SvgText x={PAD.left - 6} y={y(v) + 3} fontSize={9} fill={t.muted} textAnchor="end">
              {formatTick(v)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* time labels */}
        {xTicks.map((ms) => (
          <React.Fragment key={`x${ms}`}>
            <Line x1={x(ms)} y1={PAD.top} x2={x(ms)} y2={PAD.top + plotH} stroke={t.grid} strokeWidth={1} />
            <SvgText x={x(ms)} y={CHART_HEIGHT - 6} fontSize={9} fill={t.muted} textAnchor="middle">
              {formatClock(ms)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* alert limit */}
        {isNum(limit) && (
          <Line
            x1={PAD.left}
            y1={y(limit)}
            x2={width - PAD.right}
            y2={y(limit)}
            stroke={t.limit}
            strokeWidth={1.2}
            strokeDasharray="4 4"
          />
        )}

        {/* the readings: one line per stretch of data, gaps stay open */}
        {segments.map((seg, i) => {
          const pts = seg.map((p) => ({ x: x(p.t), y: y(p.v) }));
          return pts.length === 1 ? (
            <Circle key={`s${i}`} cx={pts[0].x} cy={pts[0].y} r={2.5} fill={t.accent} />
          ) : (
            <Path
              key={`s${i}`}
              d={smoothPath(pts)}
              stroke={t.accent}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </Svg>

      {!series.length && (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          {loading ? (
            <ActivityIndicator color={t.accent} />
          ) : (
            <Text style={{ color: t.sub, fontSize: 13 }}>No readings in this time window</Text>
          )}
        </View>
      )}
    </View>
  );
};

/* ---------- Screen ---------- */

const Temperaturehistory = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting (same as Monitoringready)
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  const wantedSerial = route?.params?.serialNo || '';

  const [product, setProduct] = useState(null);
  const [labels, setLabels] = useState({});
  const [selected, setSelected] = useState(0);
  const [date, setDate] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [data, setData] = useState(null); // { points, start, end, samples }
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorText, setErrorText] = useState('');
  const [chartWidth, setChartWidth] = useState(0);

  const requestRef = useRef(0); // lets a newer request win over an older, slower one

  const serial = product?.serial_no || '';
  const count = probeCountOf(product);
  const probeType = String(product?.probe_type || '').toUpperCase();
  const isToday = sameDay(date, new Date());

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  /* The device (limits, probe count) and its probe names */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const result = await getProducts();
          if (cancelled || !result?.success) return;
          const found = pickDevice(result.products || [], wantedSerial);
          if (!found) {
            setStatus('error');
            setErrorText('This device could not be found in your account.');
            return;
          }
          setProduct(found);

          const labelRes = await fetch(
            `${IP_ADDRESS}/api/phase-labels?serial_no=${encodeURIComponent(found.serial_no)}`,
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          );
          const names = await labelRes.json();
          if (!cancelled && names && !names.error) setLabels(names);
        } catch (e) {
          console.log('[Temperaturehistory] device load failed:', e?.message);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [wantedSerial])
  );

  /* The history of the chosen date. Today's chart refreshes every minute. */
  const load = useCallback(
    async (silent) => {
      if (!serial) return;
      const ticket = ++requestRef.current;
      if (!silent) setStatus('loading');

      try {
        const user = getAuth().currentUser;
        if (!user) throw new Error('You are signed out. Please sign in again.');
        const idToken = await user.getIdToken();
        const view = windowFor(date, Date.now());

        const res = await fetch(`${IP_ADDRESS}/api/history/series`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({
            id_token: idToken,
            serial_no: serial,
            start: view.start,
            end: view.end,
            columns: PHASE_COLUMNS.slice(0, count),
            bucket_minutes: BUCKET_MINUTES,
          }),
        });

        let body = null;
        try {
          body = await res.json();
        } catch (e) {
          // not JSON: the backend does not have the history service yet
        }
        if (!body) {
          throw new Error('The history service was not found. Add routes/history.py to the backend and restart it.');
        }
        if (!res.ok || !Array.isArray(body.points)) {
          throw new Error(body.message || `The server answered ${res.status}.`);
        }
        if (ticket !== requestRef.current) return; // a newer request is already running

        setData({ points: body.points, samples: body.samples, start: view.start, end: view.end });
        setStatus('ready');
        setErrorText('');
      } catch (e) {
        console.log('[Temperaturehistory] load failed:', e?.message);
        if (ticket !== requestRef.current || silent) return; // keep showing the last good chart
        setStatus('error');
        setErrorText(e?.message || 'Could not load the history.');
      }
    },
    [serial, date, count]
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
      const id = isToday ? setInterval(() => load(true), REFRESH_MS) : null;
      return () => {
        if (id) clearInterval(id);
      };
    }, [load, isToday])
  );

  /* ---------- Derived values ---------- */
  const view = data || windowFor(date, Date.now());
  const column = PHASE_COLUMNS[Math.min(selected, count - 1)];
  const given = labels[column];
  const probeName = given && given !== column ? given : `Probe ${selected + 1}`;
  const limit = highLimitFor(product, selected);

  const series = useMemo(() => {
    if (!data) return [];
    return data.points
      .filter((p) => isValidReading(p[column]))
      .map((p) => ({ t: p.t + BUCKET_MS / 2, v: p[column] }));
  }, [data, column]);

  const onPickDate = (event, picked) => {
    setShowPicker(false);
    if (event?.type === 'dismissed' || !picked) return;
    setDate(picked);
  };

  const shiftDay = (n) => {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
    if (next.getTime() > Date.now()) return;
    setDate(next);
  };

  const tabs = Array.from({ length: count }, (_, i) => i);
  const renderTab = (i) => (
    <TouchableOpacity
      key={i}
      style={[styles.tab, count > 6 && styles.tabScrollable, selected === i && styles.tabActive]}
      activeOpacity={0.8}
      onPress={() => setSelected(i)}>
      <Text style={[styles.tabText, selected === i && styles.tabTextActive]}>{`T${i + 1}`}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Feather name="arrow-left" size={22} color={t.backIcon} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Thermidity{' '}
            {probeType ? <Text style={styles.headerSubtitleText}>{probeType}</Text> : null}
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
        <Text style={styles.overline}>TEMPERATURE TRENDS</Text>
        <Text style={styles.title}>One point. A clear history.</Text>
        <Text style={styles.description}>Choose a channel and date.</Text>

        {/* Channel tabs */}
        {count > 6 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsTrack}>
            {tabs.map(renderTab)}
          </ScrollView>
        ) : (
          <View style={[styles.tabsTrack, styles.tabsRow]}>{tabs.map(renderTab)}</View>
        )}

        {/* Time window: 24 h, and the date setter */}
        <View style={styles.windowRow}>
          <View style={styles.windowChipActive}>
            <Text style={styles.windowChipActiveText}>24h</Text>
          </View>

          <View style={styles.dateSetter}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDay(-1)} hitSlop={8}>
              <Feather name="chevron-left" size={18} color={t.sub} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              activeOpacity={0.8}
              onPress={() => setShowPicker(true)}>
              <Feather name="calendar" size={15} color={t.accent} />
              <Text style={styles.dateButtonText}>{dateChipLabel(date)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateArrow, isToday && styles.dateArrowOff]}
              onPress={() => shiftDay(1)}
              disabled={isToday}
              hitSlop={8}>
              <Feather name="chevron-right" size={18} color={t.sub} />
            </TouchableOpacity>
          </View>
        </View>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            onChange={onPickDate}
          />
        )}

        <Text style={styles.rangeText}>
          {`${isToday ? 'Last 24 hours · ' : ''}${formatDayTime(view.start)} → ${formatDayTime(view.end)}`}
        </Text>

        {/* Chart card */}
        <View
          style={styles.chartCard}
          onLayout={(e) => setChartWidth(Math.floor(e.nativeEvent.layout.width - 28))}>
          <View style={styles.chartTop}>
            <Text style={styles.chartTitle} numberOfLines={1}>
              {`T${selected + 1} · ${probeName}`}
            </Text>
            <Text style={styles.chartUnit}>°C</Text>
          </View>

          {status === 'error' ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={20} color={t.sub} />
              <Text style={styles.errorText}>{errorText}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => load(false)}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TrendChart
              width={chartWidth}
              t={t}
              start={view.start}
              end={view.end}
              series={series}
              limit={limit}
              loading={status === 'loading'}
            />
          )}

          <Text style={styles.legendText}>
            {isNum(limit) ? `High limit: ${Number(limit.toFixed(1))}°C` : 'No high limit set'}
            {' · gaps remain visible'}
          </Text>
        </View>

        {/* Gap explanation */}
        <View style={styles.noteCard}>
          <View style={styles.noteIcon} />
          <Text style={styles.noteText}>
            A missing interval is shown as a break, not joined into a continuous trace.
          </Text>
        </View>

        {/* Time zone + how many readings */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{`Time zone: ${timeZoneName()}`}</Text>
          {status === 'ready' && data ? (
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>
                {`${data.samples} reading${data.samples === 1 ? '' : 's'}`}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity style={styles.primaryActionButton} activeOpacity={0.85} onPress={goBack}>
          <Text style={styles.primaryActionButtonText}>Back to overview</Text>
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

export default Temperaturehistory;

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
    scrollContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 24 },
    overline: { fontSize: 12, fontWeight: '700', color: t.accent, letterSpacing: 0.9, marginBottom: 8 },
    title: { fontSize: 26, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
    description: { fontSize: 15, color: t.sub, marginTop: 6, marginBottom: 18 },
    tabsTrack: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 4,
    },
    tabsRow: { flexDirection: 'row' },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 10 },
    tabScrollable: { flex: 0, paddingHorizontal: 22 },
    tabActive: { backgroundColor: t.tabTrack },
    tabText: { fontSize: 14, fontWeight: '600', color: t.sub },
    tabTextActive: { color: t.text, fontWeight: '700' },
    windowRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
    windowChipActive: {
      paddingVertical: 12,
      paddingHorizontal: 26,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: t.accent,
      backgroundColor: t.surface,
    },
    windowChipActiveText: { fontSize: 14, fontWeight: '700', color: t.accent },
    dateSetter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 6,
    },
    dateArrow: { paddingVertical: 12, paddingHorizontal: 6 },
    dateArrowOff: { opacity: 0.3 },
    dateButton: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 12 },
    dateButtonText: { fontSize: 13.5, fontWeight: '600', color: t.text },
    rangeText: { fontSize: 12, color: t.muted, marginTop: 10, marginBottom: 14 },
    chartCard: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 14,
    },
    chartTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    chartTitle: { flex: 1, fontSize: 13.5, fontWeight: '700', color: t.text, marginRight: 10 },
    chartUnit: { fontSize: 12, color: t.sub },
    legendText: { fontSize: 12.5, color: t.sub, marginTop: 10 },
    errorBox: { height: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    errorText: { fontSize: 13, color: t.sub, textAlign: 'center', marginTop: 10, lineHeight: 18 },
    retryButton: {
      marginTop: 12,
      paddingVertical: 9,
      paddingHorizontal: 18,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: t.accent,
    },
    retryText: { fontSize: 13, fontWeight: '700', color: t.accent },
    noteCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.noteBg,
      borderRadius: 12,
      padding: 14,
      marginTop: 14,
    },
    noteIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.accent,
      marginRight: 12,
    },
    noteText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: t.sub },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    metaText: { fontSize: 12.5, color: t.sub },
    metaTag: { backgroundColor: t.tabTrack, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    metaTagText: { fontSize: 12, fontWeight: '700', color: t.text },
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