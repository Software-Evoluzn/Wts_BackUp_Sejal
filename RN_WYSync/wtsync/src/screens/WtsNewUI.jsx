import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity,
  Modal, Alert, Dimensions, Animated, Platform, PanResponder, StatusBar, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Svg, { Line as SvgLine, Path, Text as SvgText, Circle } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import io from 'socket.io-client';
import auth from '@react-native-firebase/auth';
import RNFetchBlob from 'react-native-blob-util';
import IP_ADDRESS from '../services/ipconfig';
import { verifyDeviceWifi, resetDeviceWifi } from '../services/WifiService';
import { useAppTheme } from '../services/theme';
import { fetchPhaseLabels, updatePhaseLabel, updatePhaseLabelsBulk } from '../services/WtsApi';

/* ───────────────────────────── constants ───────────────────────────── */

const BACKEND_URL = IP_ADDRESS;
const COLORS = {
  online: '#10B981', offline: '#EF4444', shadow: '#000000', now: '#F43F5E', live: '#10B981', disabledDay: '#C7CCDA',
  R: '#DC2626', Y: '#D97706', B: '#2563EB', N: '#6B7280',
};
const SERIES_COLOR_VARIANTS = {
  R: ['#DC2626', '#F87171', '#991B1B', '#FCA5A5', '#7F1D1D', '#FECACA'],
  Y: ['#D97706', '#FBBF24', '#92400E', '#FDE68A', '#78350F', '#FEF3C7'],
  B: ['#2563EB', '#60A5FA', '#1E3A8A', '#93C5FD', '#1E40AF', '#BFDBFE'],
  N: ['#6B7280', '#9CA3AF', '#374151', '#D1D5DB', '#111827', '#E5E7EB'],
};
const PHASE_COLUMNS = [1, 2, 3, 4, 5, 6].flatMap((n) => ['R', 'Y', 'B', 'N'].map((c) => `${c}${n}`));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const HEADER_MENU_OPTIONS = ['Reset WiFi', 'Change WiFi'];
const EXPORT_OPTIONS = ['Today', 'Set Range'];
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
const GRAPH_SCROLL_BUFFER = 8;
const LIST_PAD = 16;
const CARD_GAP = 16;
const CALENDAR_CELL_SIZE = 36;
const DAY_MINUTES = 1440;
const FULL_VIEW = { start: 0, end: DAY_MINUTES };
const MIN_VIEW_SPAN = 20; // minutes — max pinch-zoom
const DOUBLE_TAP_MS = 300;
const TAP_MOVE_TOLERANCE = 6;
const TICK_STEPS = [[40, 5], [90, 15], [180, 30], [480, 60], [900, 120]];

const screenWidth = Dimensions.get('window').width;
const CHART_WIDTH = screenWidth - 64;
const CHART_HEIGHT = 240;
const CHART_PAD = { top: 14, right: 14, bottom: 26, left: 42 };
const PLOT_WIDTH = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
const PLOT_HEIGHT = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
const PLOT_BOTTOM = CHART_HEIGHT - CHART_PAD.bottom;

/* ───────────────────────────── helpers ───────────────────────────── */

const pad = (n) => String(n).padStart(2, '0');
const dateKeyOf = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fileDate = (d) => `${pad(d.getDate())}_${pad(d.getMonth() + 1)}_${String(d.getFullYear()).slice(-2)}`;
const formatDateLabel = (d) => `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
const monthStart = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const isSameDay = (a, b) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const minutesOf = (d = new Date()) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
const formatMinutes = (mins) => {
  const m = Math.round(((mins % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const panelName = (p) => p.custom_name || `Panel ${p.panel_no}`;

const getPhaseColor = (code) => COLORS[(code || '').charAt(0).toUpperCase()] || COLORS.N;
const getSeriesColor = (code) => {
  const letter = (code || '').charAt(0).toUpperCase();
  const palette = SERIES_COLOR_VARIANTS[letter] || SERIES_COLOR_VARIANTS.N;
  const idx = parseInt((code || '').replace(/\D/g, ''), 10) || 1;
  return palette[(idx - 1) % palette.length];
};

const clampView = (s, e) => {
  if (s < 0) { e -= s; s = 0; }
  if (e > DAY_MINUTES) { s -= e - DAY_MINUTES; e = DAY_MINUTES; }
  return { start: Math.max(0, s), end: Math.min(DAY_MINUTES, e) };
};
const getTickStep = (span) => (TICK_STEPS.find(([max]) => span <= max) || [0, 180])[1];
const makeScales = (v0, span, yMin, yMax) => ({
  x: (t) => CHART_PAD.left + ((t - v0) / span) * PLOT_WIDTH,
  y: (v) => CHART_PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * PLOT_HEIGHT,
});

// Merge DB rows with live points already collected for the same day.
const mergeRows = (existing, rows, dateKey) => {
  const db = {};
  rows.forEach((row) => {
    const t = minutesOf(new Date(row.timestamp));
    PHASE_COLUMNS.forEach((c) => {
      if (row[c] != null) (db[c] = db[c] || []).push({ t, v: row[c] });
    });
  });
  const old = existing?.series || {};
  const series = {};
  new Set([...Object.keys(db), ...Object.keys(old)]).forEach((phase) => {
    const dbPts = db[phase] || [];
    const maxT = dbPts.length ? dbPts[dbPts.length - 1].t : -1;
    series[phase] = [...dbPts, ...(old[phase] || []).filter((p) => p.t > maxT)];
  });
  return { dateKey, series };
};

/* ───────────────────────────── hooks ───────────────────────────── */

// Styles are built once per theme change instead of on every render of every component.
const useStyles = () => {
  const { colors, isDark } = useAppTheme();
  return useMemo(() => ({ colors, isDark, styles: createStyles(colors) }), [colors, isDark]);
};

// Popup open/close state, optionally anchored under a button.
const useMenu = (anchored = true) => {
  const ref = useRef(null);
  const [state, setState] = useState({ visible: false, anchor: null });
  const open = useCallback(() => {
    if (!anchored) return setState({ visible: true, anchor: null });
    ref.current?.measureInWindow((x, y, w, h) =>
      setState({ visible: true, anchor: { top: y + h + 6, right: Math.max(screenWidth - (x + w), 12) } })
    );
  }, [anchored]);
  const close = useCallback(() => setState((s) => ({ ...s, visible: false })), []);
  return { ref, visible: state.visible, anchor: state.anchor, open, close };
};

/* ───────────────────────────── small UI pieces ───────────────────────────── */

const StatusBadge = memo(({ status }) => {
  const { styles } = useStyles();
  const color = status === 'Online' ? COLORS.online : COLORS.offline;
  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status}</Text>
    </View>
  );
});

const Empty = ({ icon, text, wrapStyle }) => {
  const { colors, styles } = useStyles();
  return (
    <View style={wrapStyle}>
      <Icon name={icon} size={34} color={colors.subText} />
      <Text style={styles.emptyPanelText}>{text}</Text>
    </View>
  );
};

const CenterModal = ({ visible, onClose, cardStyle, children }) => {
  const { styles } = useStyles();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cardStyle}>{children}</TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Generic list popup: centered (dropdown) or anchored under a button (menus).
const PopupMenu = ({ visible, onClose, options, onSelect, selected, anchor }) => {
  const { styles } = useStyles();
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={anchor ? styles.headerMenuOverlay : styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={anchor ? [styles.headerMenuList, anchor] : styles.dropdownMenu}>
          {options.map((o) => (
            <TouchableOpacity key={o} style={styles.dropdownItem} onPress={() => { onClose(); onSelect(o); }}>
              <Text style={[styles.dropdownItemText, o === selected && styles.dropdownItemTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const PanelSelector = memo(({ options, selected, onSelect }) => {
  const { colors, styles } = useStyles();
  const menu = useMenu(false);
  return (
    <View>
      <TouchableOpacity style={styles.dropdownButton} onPress={menu.open}>
        <Text style={styles.dropdownButtonText}>{selected}</Text>
        <Icon name="arrow-drop-down" size={20} color={colors.text} />
      </TouchableOpacity>
      <PopupMenu visible={menu.visible} onClose={menu.close} options={options} selected={selected} onSelect={onSelect} />
    </View>
  );
});

const HeaderMenu = memo(({ onSelect }) => {
  const { colors, styles } = useStyles();
  const menu = useMenu();
  return (
    <View>
      <TouchableOpacity ref={menu.ref} style={styles.headerIconButton} onPress={menu.open} hitSlop={HIT}>
        <Icon name="more-vert" size={22} color={colors.text} />
      </TouchableOpacity>
      <PopupMenu visible={menu.visible} anchor={menu.anchor} onClose={menu.close} options={HEADER_MENU_OPTIONS} onSelect={onSelect} />
    </View>
  );
});

/* ───────────────────────────── phase / panel cards ───────────────────────────── */

const TemperatureCard = memo(({ temperature: { phase, current, min, max }, label, onEditLabels }) => {
  const { styles } = useStyles();
  const fmt = (v) => (v != null ? v.toFixed(2) : '--');
  return (
    <View style={styles.tempCard}>
      <TouchableOpacity onLongPress={() => onEditLabels([phase])} activeOpacity={0.6}>
        <Text style={[styles.tempPhase, { color: getPhaseColor(phase) }]}>{label || phase}</Text>
      </TouchableOpacity>
      <Text style={styles.tempValue}>{current != null ? `${fmt(current)}°C` : '--'}</Text>
      <View style={styles.tempMinMaxRow}>
        <Text style={styles.tempMinMax}>Min {fmt(min)}</Text>
        <Text style={styles.tempMinMax}>Max {fmt(max)}</Text>
      </View>
    </View>
  );
});

const PanelCard = memo(({ panel, phaseLabels, onEditLabels }) => {
  const { colors, styles } = useStyles();
  const visible = useMemo(() => panel.temperatures.filter((t) => t.current != null), [panel.temperatures]);
  if (!visible.length) return null;

  return (
    <View style={styles.panelCard}>
      <View style={styles.panelHeaderRow}>
        <Text style={styles.panelTitle}>{panel.custom_name || `Control Panel ${panel.panel_no}`}</Text>
        <TouchableOpacity onPress={() => onEditLabels(panel.temperatures.map((t) => t.phase))} hitSlop={HIT}>
          <Icon name="edit" size={16} color={colors.subText} />
        </TouchableOpacity>
      </View>
      <View style={styles.tempGrid}>
        {visible.map((temp) => (
          <TemperatureCard key={temp.phase} temperature={temp} label={phaseLabels?.[temp.phase]} onEditLabels={onEditLabels} />
        ))}
      </View>
    </View>
  );
});

// One modal for both "rename one phase" (codes.length === 1) and "edit all phases of a panel".
const EditLabelsModal = memo(({ visible, codes, labels, onClose, onSaved }) => {
  const { colors, styles } = useStyles();
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const single = codes.length === 1;

  useEffect(() => {
    if (visible) setValues(Object.fromEntries(codes.map((c) => [c, labels?.[c] || c])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const save = async () => {
    try {
      setSaving(true);
      await onSaved(Object.fromEntries(codes.map((c) => [c, (values[c] || '').trim() || c])));
      onClose();
    } catch (error) {
      Alert.alert('Save Failed', error?.message || 'Could not save the new names.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CenterModal visible={visible} onClose={onClose} cardStyle={styles.editCard}>
      <Text style={styles.renameTitle}>{single ? `Rename ${codes[0]}` : 'Edit Phase Names'}</Text>
      <ScrollView style={styles.editPanelScroll}>
        {codes.map((code) => (
          <View key={code} style={styles.editPanelFieldWrap}>
            {!single && <Text style={styles.editPanelFieldLabel}>{code}</Text>}
            <TextInput
              style={styles.renameInput}
              value={values[code] ?? ''}
              onChangeText={(text) => setValues((p) => ({ ...p, [code]: text }))}
              placeholder={code}
              placeholderTextColor={colors.subText}
              autoFocus={single}
            />
          </View>
        ))}
      </ScrollView>
      <View style={styles.renameButtonRow}>
        <TouchableOpacity style={styles.renameButton} onPress={onClose}>
          <Text style={styles.renameButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.renameButton, styles.renameButtonPrimary]} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.renameButtonText, styles.renameButtonTextPrimary]}>{single ? 'Save' : 'Save All'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </CenterModal>
  );
});

/* ───────────────────────────── calendar ───────────────────────────── */

// range=false: pick one day -> onSelect(date).  range=true: pick start/end -> onSelect(start, end).
const CalendarModal = memo(({ visible, range, selectedDate, onSelect, onClose }) => {
  const { colors, styles } = useStyles();
  const [viewMonth, setViewMonth] = useState(() => monthStart(selectedDate || new Date()));
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const today = new Date();
  const atCurrentMonth = viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  useEffect(() => {
    if (!visible) return;
    setViewMonth(monthStart(selectedDate || new Date()));
    setStart(null);
    setEnd(null);
  }, [visible, selectedDate]);

  const shiftMonth = (n) => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    return [
      ...Array(new Date(y, m, 1).getDay()).fill(null),
      ...Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => new Date(y, m, i + 1)),
    ];
  }, [viewMonth]);

  const press = (d) => {
    if (!range) return onSelect(d);
    if (!start || end) { setStart(d); setEnd(null); }
    else if (d < start) { setEnd(start); setStart(d); }
    else setEnd(d);
  };

  return (
    <CenterModal visible={visible} onClose={onClose} cardStyle={styles.calendarCard}>
      <View style={styles.calendarHeaderRow}>
        <TouchableOpacity style={styles.calendarNavBtn} onPress={() => shiftMonth(-1)} hitSlop={HIT}>
          <Icon name="chevron-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.calendarMonthText}>{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</Text>
        <TouchableOpacity
          style={[styles.calendarNavBtn, atCurrentMonth && styles.calendarNavBtnDisabled]}
          onPress={() => shiftMonth(1)}
          disabled={atCurrentMonth}
          hitSlop={HIT}
        >
          <Icon name="chevron-right" size={20} color={atCurrentMonth ? COLORS.disabledDay : colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.calendarWeekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.calendarWeekdayCell}>
            <Text style={styles.calendarWeekdayText}>{wd}</Text>
          </View>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.calendarDayCell} />;
          const future = d > today;
          const sel = range ? isSameDay(d, start) || isSameDay(d, end) : isSameDay(d, selectedDate);
          const inRange = range && start && end && d > start && d < end;
          return (
            <TouchableOpacity key={d.getTime()} style={styles.calendarDayCell} disabled={future} onPress={() => press(d)}>
              <View
                style={[
                  styles.calendarDayInner,
                  inRange && { backgroundColor: colors.border },
                  sel ? styles.calendarDaySelected : isSameDay(d, today) && styles.calendarDayToday,
                ]}
              >
                <Text style={[styles.calendarDayText, future && styles.calendarDayTextDisabled, sel && styles.calendarDayTextSelected]}>
                  {d.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {range && (
        <Text style={styles.chartHintText}>
          {start ? formatDateLabel(start) : 'Select start date'}
          {'  ->  '}
          {end ? formatDateLabel(end) : start ? 'Select end date' : ''}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.calendarTodayLink, range && !start && { opacity: 0.4 }]}
        disabled={range && !start}
        onPress={() => (range ? onSelect(start, end || start) : onSelect(new Date()))}
      >
        <Text style={styles.calendarTodayLinkText}>{range ? 'Export Selected Range' : 'Jump to Today'}</Text>
      </TouchableOpacity>
    </CenterModal>
  );
});

const DateField = memo(({ selectedDate, isToday, onChangeDate }) => {
  const { colors, styles } = useStyles();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const handleSelect = useCallback((d) => { onChangeDate(d); setOpen(false); }, [onChangeDate]);

  return (
    <View style={styles.dateFieldRow}>
      <TouchableOpacity style={styles.dateFieldBtn} onPress={() => setOpen(true)}>
        <Icon name="calendar-today" size={14} color={colors.text} />
        <Text style={styles.dateFieldText}>{formatDateLabel(selectedDate)}</Text>
        <Icon name="arrow-drop-down" size={18} color={colors.text} />
      </TouchableOpacity>
      {isToday && (
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
      )}
      <CalendarModal visible={open} selectedDate={selectedDate} onSelect={handleSelect} onClose={close} />
    </View>
  );
});

/* ───────────────────────────── chart ───────────────────────────── */

const RealtimeChart = memo(({ seriesMap, nowMinutes, loading, phaseLabels, resetKey }) => {
  const { colors, styles } = useStyles();
  const [view, setView] = useState(FULL_VIEW);
  const viewRef = useRef(view);
  const gestureRef = useRef(null);
  const lastTapRef = useRef(0);
  viewRef.current = view;

  // Reset zoom only when the day/panel changes — not on every live data tick.
  useEffect(() => { setView(FULL_VIEW); }, [resetKey]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (evt, g) => {
          const xs = evt.nativeEvent.touches.map((t) => t.pageX);
          let s = gestureRef.current;
          // (Re)baseline whenever the finger count changes (e.g. 2nd finger lands / lifts).
          if (!s || s.xs.length !== xs.length) s = gestureRef.current = { view: { ...viewRef.current }, xs, dx0: g.dx };
          const base = s.view;
          const span0 = base.end - base.start;

          if (xs.length === 2) {
            const d0 = Math.abs(s.xs[1] - s.xs[0]);
            if (d0 < 1) return;
            const newSpan = clamp(span0 / (Math.abs(xs[1] - xs[0]) / d0), MIN_VIEW_SPAN, DAY_MINUTES);
            const c = (base.start + base.end) / 2;
            setView(clampView(c - newSpan / 2, c + newSpan / 2));
          } else if (xs.length === 1) {
            const dm = -((g.dx - s.dx0) / PLOT_WIDTH) * span0;
            setView(clampView(base.start + dm, base.end + dm));
          }
        },
        onPanResponderRelease: (_, g) => {
          gestureRef.current = null;
          if (Math.abs(g.dx) >= TAP_MOVE_TOLERANCE || Math.abs(g.dy) >= TAP_MOVE_TOLERANCE) return;
          const now = Date.now();
          if (now - lastTapRef.current < DOUBLE_TAP_MS) { setView(FULL_VIEW); lastTapRef.current = 0; }
          else lastTapRef.current = now;
        },
        onPanResponderTerminate: () => { gestureRef.current = null; },
      }),
    []
  );

  const span = view.end - view.start;
  const phases = useMemo(() => Object.keys(seriesMap).sort(), [seriesMap]);

  const { yMin, yMax } = useMemo(() => {
    const lo = view.start - span * 0.05;
    const hi = view.end + span * 0.05;
    let min = Infinity;
    let max = -Infinity;
    phases.forEach((p) => seriesMap[p].forEach(({ t, v }) => {
      if (t < lo || t > hi) return;
      if (v < min) min = v;
      if (v > max) max = v;
    }));
    if (!isFinite(min) || !isFinite(max)) return { yMin: 20, yMax: 40 };
    if (max - min < 2) { const mid = (max + min) / 2; min = mid - 1; max = mid + 1; }
    const padAmt = (max - min) * 0.15;
    return { yMin: min - padAmt, yMax: max + padAmt };
  }, [seriesMap, phases, view.start, view.end, span]);

  const sc = useMemo(() => makeScales(view.start, span, yMin, yMax), [view.start, span, yMin, yMax]);

  // SVG path strings are rebuilt only when data / zoom / scale actually change.
  const lines = useMemo(() => {
    const lo = view.start - span * 0.05;
    const hi = view.end + span * 0.05;
    return phases
      .map((phase) => {
        const pts = seriesMap[phase];
        if (!pts?.length) return null;
        let d = '';
        pts.forEach(({ t, v }) => {
          if (t >= lo && t <= hi) d += `${d ? 'L' : 'M'}${sc.x(t).toFixed(1)} ${sc.y(v).toFixed(1)}`;
        });
        return d ? { phase, d, last: pts[pts.length - 1] } : null;
      })
      .filter(Boolean);
  }, [phases, seriesMap, view.start, view.end, span, sc]);

  const xTicks = useMemo(() => {
    const step = getTickStep(span);
    const out = [];
    for (let t = Math.ceil(view.start / step) * step; t <= view.end; t += step) out.push(t);
    return out;
  }, [view.start, view.end, span]);

  const yTicks = useMemo(() => Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4), [yMin, yMax]);

  const hasAnyData = phases.some((p) => seriesMap[p]?.length);
  const nowVisible = nowMinutes != null && nowMinutes >= view.start && nowMinutes <= view.end;
  const isZoomed = span < DAY_MINUTES - 1;

  return (
    <View>
      <View {...panResponder.panHandlers} style={styles.chartTouchArea}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {yTicks.map((val, i) => (
            <React.Fragment key={`y${i}`}>
              <SvgLine x1={CHART_PAD.left} y1={sc.y(val)} x2={CHART_WIDTH - CHART_PAD.right} y2={sc.y(val)} stroke={colors.border} strokeWidth={1} />
              <SvgText x={CHART_PAD.left - 6} y={sc.y(val) + 3} fontSize={9} fill={colors.subText} textAnchor="end">{val.toFixed(0)}</SvgText>
            </React.Fragment>
          ))}

          {xTicks.map((t) => (
            <React.Fragment key={`x${t}`}>
              <SvgLine x1={sc.x(t)} y1={CHART_PAD.top} x2={sc.x(t)} y2={PLOT_BOTTOM} stroke={colors.border} strokeWidth={1} />
              <SvgText x={sc.x(t)} y={PLOT_BOTTOM + 14} fontSize={9} fill={colors.subText} textAnchor="middle">{formatMinutes(t)}</SvgText>
            </React.Fragment>
          ))}

          {lines.map(({ phase, d, last }) => (
            <React.Fragment key={phase}>
              <Path d={d} stroke={getSeriesColor(phase)} strokeWidth={2} fill="none" />
              {last.t >= view.start && last.t <= view.end && (
                <Circle cx={sc.x(last.t)} cy={sc.y(last.v)} r={3} fill={getSeriesColor(phase)} />
              )}
            </React.Fragment>
          ))}

          {nowVisible && (
            <SvgLine x1={sc.x(nowMinutes)} y1={CHART_PAD.top} x2={sc.x(nowMinutes)} y2={PLOT_BOTTOM} stroke={COLORS.now} strokeWidth={1} strokeDasharray="4,4" />
          )}

          <SvgText x={CHART_WIDTH - CHART_PAD.right} y={CHART_PAD.top - 2} fontSize={9} fill={colors.subText} textAnchor="end">
            {`${formatMinutes(view.start)} - ${formatMinutes(view.end)}`}
          </SvgText>
        </Svg>

        {!hasAnyData && (
          <View style={styles.chartEmptyOverlay}>
            {loading ? <ActivityIndicator size="small" color={COLORS.B} /> : <Text style={styles.emptyPanelText}>No data for this day</Text>}
          </View>
        )}
      </View>

      <Text style={styles.chartHintText}>Pinch to zoom · drag to pan{isZoomed ? ' · double-tap to reset' : ''}</Text>

      <View style={styles.legendRow}>
        {phases.map((phase) => (
          <View key={phase} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: getSeriesColor(phase) }]} />
            <Text style={styles.legendText}>{phaseLabels?.[phase] || phase}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const TemperatureGraph = memo(
  ({ device, historyRef, historyVersion, onRequestHistory, panelOptions, onLayout, phaseLabels }) => {
    const { styles } = useStyles();
    const [selectedPanel, setSelectedPanel] = useState('All Panels');
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [historyLoading, setHistoryLoading] = useState(false);
    const [nowMinutes, setNowMinutes] = useState(() => minutesOf());

    const dateKey = useMemo(() => dateKeyOf(selectedDate), [selectedDate]);
    const isToday = dateKey === dateKeyOf(new Date());

    useEffect(() => {
      const id = setInterval(() => setNowMinutes(minutesOf()), 30000);
      return () => clearInterval(id);
    }, []);

    useEffect(() => {
      let cancelled = false;
      setHistoryLoading(true);
      Promise.resolve(onRequestHistory(device.serial_no, dateKey)).finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
      return () => { cancelled = true; };
    }, [device.serial_no, dateKey, onRequestHistory]);

    // historyVersion is bumped whenever the (mutable) history ref changes.
    const seriesMap = useMemo(() => {
      const series = historyRef.current[device.serial_no]?.[dateKey]?.series;
      if (!series) return {};
      const panels = selectedPanel === 'All Panels' ? device.panels : device.panels.filter((p) => panelName(p) === selectedPanel);
      const out = {};
      panels.forEach((p) => p.temperatures.forEach(({ phase }) => { if (series[phase]) out[phase] = series[phase]; }));
      return out;
    }, [device.panels, device.serial_no, selectedPanel, historyRef, historyVersion, dateKey]);

    return (
      <View style={styles.graphWrap} onLayout={onLayout}>
        <View style={styles.graphHeaderRow}>
          <Text style={styles.graphTitle}>Temperature Graph</Text>
          <PanelSelector options={panelOptions} selected={selectedPanel} onSelect={setSelectedPanel} />
        </View>
        <DateField selectedDate={selectedDate} isToday={isToday} onChangeDate={setSelectedDate} />
        <RealtimeChart
          seriesMap={seriesMap}
          nowMinutes={isToday ? nowMinutes : null}
          loading={historyLoading}
          phaseLabels={phaseLabels}
          resetKey={`${dateKey}|${selectedPanel}`}
        />
      </View>
    );
  }
);

/* ───────────────────────────── device card ───────────────────────────── */

const DeviceCard = memo(
  ({ device, onEditLabels, onChartPress, onMeasure, historyRef, historyVersion, onRequestHistory, phaseLabels }) => {
    const { colors, styles } = useStyles();
    const { serial_no: serial, panels } = device;
    const [fade] = useState(() => new Animated.Value(0));
    const [exporting, setExporting] = useState(false);
    const [rangeVisible, setRangeVisible] = useState(false);
    const menu = useMenu();

    useEffect(() => {
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }, [fade]);

    const panelOptions = useMemo(() => ['All Panels', ...panels.map(panelName)], [panels]);
    const editLabels = useCallback((codes) => onEditLabels(serial, codes), [onEditLabels, serial]);

    const downloadExport = useCallback(
      async (startDate, endDate) => {
        setExporting(true);
        try {
          const url =
            `${BACKEND_URL}/api/telemetry-export?serial_no=${encodeURIComponent(serial)}` +
            `&start_date=${dateKeyOf(startDate)}&end_date=${dateKeyOf(endDate)}`;
          const filename = `wts_${fileDate(startDate)}_to_${fileDate(endDate)}.xlsx`;

          // Pre-flight so we can show the server's error message (DownloadManager can't).
          let check;
          try {
            check = await fetch(url);
          } catch (e) {
            return Alert.alert('Export Failed', 'Could not reach the server. Check your connection and try again.');
          }
          if (!check.ok) {
            const serverMessage = (await check.json().catch(() => null))?.error;
            return Alert.alert(
              'Export Failed',
              serverMessage ||
                (check.status === 404
                  ? 'No data found for the selected date(s).'
                  : `Server returned an error (status ${check.status}). Check the backend logs.`)
            );
          }

          const { config, fs } = RNFetchBlob;
          const android = Platform.OS === 'android';
          const path = `${android ? fs.dirs.LegacyDownloadDir : fs.dirs.DocumentDir}/${filename}`;
          await config(
            android
              ? {
                  fileCache: true,
                  addAndroidDownloads: {
                    useDownloadManager: true, notification: true, mediaScannable: true,
                    title: filename, description: 'WTS telemetry export', mime: XLSX_MIME, path,
                  },
                }
              : { fileCache: true, path }
          ).fetch('GET', url);

          Alert.alert(
            'Export Saved',
            android ? `${filename} has been saved to your Downloads folder.` : `${filename} has been saved to:\n${path}`
          );
        } catch (error) {
          console.warn('Export error:', error);
          Alert.alert('Export Failed', 'Could not download the file. Check your connection and try again.');
        } finally {
          setExporting(false);
        }
      },
      [serial]
    );

    const handleExportSelect = (option) => {
      if (option === 'Today') {
        const now = new Date();
        downloadExport(now, now);
      } else setRangeVisible(true);
    };

    return (
      <Animated.View
        style={[styles.deviceCard, { opacity: fade }]}
        onLayout={(e) => onMeasure(serial, { h: e.nativeEvent.layout.height })}
      >
        <View style={styles.deviceHeaderRow}>
          <View style={styles.deviceHeaderLeft}>
            <Text style={styles.deviceName}>{device.device_name} ({serial})</Text>
            <StatusBadge status={device.status} />
          </View>
          <View style={styles.deviceHeaderIcons}>
            <TouchableOpacity ref={menu.ref} style={styles.iconCircle} onPress={menu.open} disabled={exporting}>
              {exporting ? <ActivityIndicator size="small" color={COLORS.B} /> : <Icon name="file-download" size={16} color={colors.subText} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconCircle} onPress={() => onChartPress(serial)}>
              <Icon name="show-chart" size={16} color={colors.subText} />
            </TouchableOpacity>
          </View>
        </View>

        <PopupMenu visible={menu.visible} anchor={menu.anchor} onClose={menu.close} options={EXPORT_OPTIONS} onSelect={handleExportSelect} />
        <CalendarModal
          range
          visible={rangeVisible}
          onClose={() => setRangeVisible(false)}
          onSelect={(s, e) => { setRangeVisible(false); downloadExport(s, e); }}
        />

        {device.status === 'Online' && panels.length > 0 ? (
          <View style={styles.panelsWrap}>
            {panels.map((p) => (
              <PanelCard key={p.panel_no} panel={p} phaseLabels={phaseLabels} onEditLabels={editLabels} />
            ))}
          </View>
        ) : (
          <Empty icon="power-off" text="No panel data available" wrapStyle={styles.emptyPanelWrap} />
        )}

        {panels.length > 0 && (
          <TemperatureGraph
            device={device}
            historyRef={historyRef}
            historyVersion={historyVersion}
            onRequestHistory={onRequestHistory}
            panelOptions={panelOptions}
            onLayout={(e) => onMeasure(serial, { graphY: e.nativeEvent.layout.y })}
            phaseLabels={phaseLabels}
          />
        )}
      </Animated.View>
    );
  }
);

/* ───────────────────────────── screen ───────────────────────────── */

const WtsNewUI = () => {
  const { colors, isDark, styles } = useStyles();
  const navigation = useNavigation();
  const route = useRoute();
  const selectedProduct = route.params?.product;
  const firebaseUid = route.params?.firebaseUid || auth().currentUser?.uid;

  const flatListRef = useRef(null);
  const layoutRef = useRef({}); // serial -> { h, graphY }
  const deviceHistoryRef = useRef({}); // serial -> dateKey -> { dateKey, series }
  const historyLoadedRef = useRef({}); // `${serial}|${dateKey}` -> true once fetched
  const labelsLoadedRef = useRef({}); // serial -> true once fetched

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [phaseLabels, setPhaseLabels] = useState({}); // serial -> { code: label }
  const [edit, setEdit] = useState({ visible: false, serialNo: null, codes: [] });

  const filteredDevices = useMemo(
    () => (selectedProduct?.serial_no ? devices.filter((d) => d.serial_no === selectedProduct.serial_no) : devices),
    [devices, selectedProduct]
  );

  /* phase labels */
  useEffect(() => {
    filteredDevices.forEach(({ serial_no: serial }) => {
      if (!serial || labelsLoadedRef.current[serial]) return;
      labelsLoadedRef.current[serial] = true;
      fetchPhaseLabels(serial)
        .then((labels) => setPhaseLabels((p) => ({ ...p, [serial]: labels })))
        .catch((error) => {
          console.warn('Phase label fetch error:', error);
          labelsLoadedRef.current[serial] = false; // retry on next devices update
        });
    });
  }, [filteredDevices]);

  const openEditLabels = useCallback((serialNo, codes) => setEdit({ visible: true, serialNo, codes }), []);
  const closeEditLabels = useCallback(() => setEdit((p) => ({ ...p, visible: false })), []);

  const saveLabels = useCallback(
    async (map) => {
      const serial = edit.serialNo;
      if (!serial) return;
      const entries = Object.entries(map);
      if (entries.length === 1) await updatePhaseLabel(serial, ...entries[0]);
      else await updatePhaseLabelsBulk(serial, map);
      setPhaseLabels((p) => ({ ...p, [serial]: { ...p[serial], ...map } }));
    },
    [edit.serialNo]
  );

  /* append live readings to today's history */
  useEffect(() => {
    const dateKey = dateKeyOf();
    const t = minutesOf();

    filteredDevices.forEach((device) => {
      if (device.status !== 'Online') return;
      const days = (deviceHistoryRef.current[device.serial_no] = deviceHistoryRef.current[device.serial_no] || {});
      const entry = (days[dateKey] = days[dateKey] || { dateKey, series: {} });

      device.panels.forEach((panel) =>
        panel.temperatures.forEach(({ phase, current }) => {
          if (current == null) return;
          const series = (entry.series[phase] = entry.series[phase] || []);
          const last = series[series.length - 1];
          if (!last || last.v !== current || t - last.t > 0.05) series.push({ t, v: current });
        })
      );
    });
    setHistoryVersion((v) => v + 1);
  }, [filteredDevices]);

  const requestHistory = useCallback(async (serial, dateKey) => {
    const cacheKey = `${serial}|${dateKey}`;
    if (historyLoadedRef.current[cacheKey]) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/telemetry-history?serial_no=${encodeURIComponent(serial)}&date=${dateKey}`);
      const rows = await res.json();
      if (!res.ok || !Array.isArray(rows)) return console.warn('Telemetry history fetch failed:', rows);

      const days = (deviceHistoryRef.current[serial] = deviceHistoryRef.current[serial] || {});
      days[dateKey] = mergeRows(days[dateKey], rows, dateKey);
      historyLoadedRef.current[cacheKey] = true;
      setHistoryVersion((v) => v + 1);
    } catch (error) {
      console.warn('Telemetry history fetch error:', error);
    }
  }, []);

  /* dashboard data + live socket */
  const fetchDashboardData = useCallback(async () => {
    if (!firebaseUid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: firebaseUid }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) setDevices(data);
      else console.warn('API returned empty or error:', data);
    } catch (error) {
      console.warn('Network error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUid]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socket.on('connect_error', (e) => console.warn('Socket error:', e?.message));
    socket.on('live_telemetry', (live) => {
      const serial = live.serial_no?.trim().toUpperCase();
      setDevices((prev) =>
        prev.map((device) => {
          if (device.serial_no?.trim().toUpperCase() !== serial) return device;
          const panels = device.panels.map((p) => {
            const lp = live.panels?.find((x) => Number(x.panel_no) === Number(p.panel_no));
            return lp ? { ...p, temperatures: lp.temperatures, custom_name: lp.custom_name || p.custom_name } : p;
          });
          return { ...device, status: live.status, panels };
        })
      );
    });
    return () => socket.disconnect();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  /* header actions */
  const handleMenuSelect = useCallback(
    async (option) => {
      const serial = selectedProduct?.serial_no;
      if (!serial) return;
      const verified = await verifyDeviceWifi(serial);
      if (!verified) return;

      if (option === 'Reset WiFi') {
        const result = await resetDeviceWifi(serial);
        if (!result.success) return Alert.alert('Error', result.message);
        navigation.navigate('Home');
      } else if (option === 'Change WiFi') {
        navigation.navigate('ResetwifiNetwork', { product: serial, verifiedData: verified });
      }
    },
    [selectedProduct, navigation]
  );

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main');
  }, [navigation]);

  /* scroll to a device's graph */
  const onMeasure = useCallback((serial, patch) => {
    layoutRef.current[serial] = { ...layoutRef.current[serial], ...patch };
  }, []);

  const handleChartPress = useCallback(
    (serial) => {
      const index = filteredDevices.findIndex((d) => d.serial_no === serial);
      if (index === -1 || !flatListRef.current) return;

      let offset = LIST_PAD;
      for (let i = 0; i < index; i += 1) {
        const h = layoutRef.current[filteredDevices[i].serial_no]?.h;
        if (h == null) return flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0 });
        offset += h + CARD_GAP;
      }
      const graphY = layoutRef.current[serial]?.graphY || 0;
      flatListRef.current.scrollToOffset({ offset: Math.max(offset + graphY - GRAPH_SCROLL_BUFFER, 0), animated: true });
    },
    [filteredDevices]
  );

  const handleScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true }), 50);
  }, []);

  const renderDevice = useCallback(
    ({ item }) => (
      <DeviceCard
        device={item}
        onEditLabels={openEditLabels}
        onChartPress={handleChartPress}
        onMeasure={onMeasure}
        historyRef={deviceHistoryRef}
        historyVersion={historyVersion}
        onRequestHistory={requestHistory}
        phaseLabels={phaseLabels[item.serial_no]}
      />
    ),
    [openEditLabels, handleChartPress, onMeasure, historyVersion, requestHistory, phaseLabels]
  );

  const keyExtractor = useCallback((item) => item.serial_no, []);
  const statusBar = <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />;

  if (loading && devices.length === 0) {
    return (
      <View style={styles.loaderWrap}>
        {statusBar}
        <ActivityIndicator size="large" color={COLORS.B} />
      </View>
    );
  }

  const deviceNotFound = !loading && !!selectedProduct?.serial_no && filteredDevices.length === 0;

  return (
    <View style={styles.screen}>
      {statusBar}

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={handleBackPress} hitSlop={HIT}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>IntelliTemp Dashboard</Text>
        </View>
        <HeaderMenu onSelect={handleMenuSelect} />
      </View>

      {deviceNotFound ? (
        <Empty icon="error-outline" text="Device Not Found" wrapStyle={styles.loaderWrap} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredDevices}
          renderItem={renderDevice}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[COLORS.B]} tintColor={COLORS.B} />}
        />
      )}

      <EditLabelsModal
        visible={edit.visible}
        codes={edit.codes}
        labels={phaseLabels[edit.serialNo]}
        onClose={closeEditLabels}
        onSaved={saveLabels}
      />
    </View>
  );
};

/* ───────────────────────────── styles ───────────────────────────── */

const cardShadow = Platform.select({
  ios: { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  android: { elevation: 3 },
});

const createStyles = (c) => {
  const row = { flexDirection: 'row', alignItems: 'center' };
  const box = { borderWidth: 1, borderColor: c.border };
  const btn = { ...row, ...box, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: c.card };
  const pop = { backgroundColor: c.card, borderRadius: 14, ...cardShadow };
  const center = { justifyContent: 'center', alignItems: 'center' };
  const bold = (size, color = c.text) => ({ fontSize: size, fontWeight: '700', color });

  return StyleSheet.create({
    row,
    screen: { flex: 1, backgroundColor: c.background },
    loaderWrap: { flex: 1, ...center, backgroundColor: c.background },
    header: { ...row, backgroundColor: c.card,
      paddingTop:Platform.OS === 'android' ? 28 : 16,
       paddingBottom: 16, paddingHorizontal: 12, justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: c.border },
    headerIconButton: { width: 32, ...center },
    headerTitleWrap: { flex: 1, alignItems: 'center' },
    headerTitle: bold(18),
    listContent: { padding: LIST_PAD, paddingBottom: 32 },

    deviceCard: { backgroundColor: c.card, borderRadius: 14, padding: 16, marginBottom: CARD_GAP, ...box, ...cardShadow },
    deviceHeaderRow: { ...row, justifyContent: 'space-between', marginBottom: 12 },
    deviceHeaderLeft: { ...row, flexShrink: 1 },
    deviceName: { ...bold(15), marginRight: 10 },
    deviceHeaderIcons: { flexDirection: 'row' },
    iconCircle: { width: 30, height: 30, borderRadius: 15, ...box, ...center, marginLeft: 8 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    statusText: { fontSize: 12, fontWeight: '600' },

    panelsWrap: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
    panelCard: { backgroundColor: c.card, ...box, borderRadius: 12, padding: 12, margin: 6, minWidth: 260, flexGrow: 1, flexBasis: '45%' },
    panelHeaderRow: { ...row, justifyContent: 'space-between', marginBottom: 10 },
    panelTitle: bold(13),
    tempGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
    tempCard: { backgroundColor: c.card, ...box, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, margin: 4, minWidth: 110, flexGrow: 1 },
    tempPhase: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
    tempValue: { ...bold(16), marginBottom: 6 },
    tempMinMaxRow: { flexDirection: 'row', justifyContent: 'space-between' },
    tempMinMax: { fontSize: 10, color: c.subText },
    emptyPanelWrap: { ...center, paddingVertical: 40 },
    emptyPanelText: { marginTop: 10, fontSize: 13, color: c.subText },

    graphWrap: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: c.border },
    graphHeaderRow: { ...row, justifyContent: 'space-between', marginBottom: 10 },
    graphTitle: bold(13),
    dateFieldRow: { ...row, marginBottom: 10 },
    dateFieldBtn: btn,
    dateFieldText: { ...bold(12), marginHorizontal: 6 },
    liveBadge: { ...row, marginLeft: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#ECFDF5' },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.live, marginRight: 4 },
    liveBadgeText: bold(10, COLORS.live),

    calendarCard: { ...pop, padding: 16, width: CALENDAR_CELL_SIZE * 7 + 32 },
    calendarHeaderRow: { ...row, justifyContent: 'space-between', marginBottom: 12 },
    calendarNavBtn: { width: 28, height: 28, borderRadius: 14, ...box, ...center },
    calendarNavBtnDisabled: { opacity: 0.4 },
    calendarMonthText: bold(14),
    calendarWeekdayRow: { flexDirection: 'row' },
    calendarWeekdayCell: { width: CALENDAR_CELL_SIZE, alignItems: 'center', paddingBottom: 6 },
    calendarWeekdayText: bold(11, c.subText),
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calendarDayCell: { width: CALENDAR_CELL_SIZE, height: CALENDAR_CELL_SIZE, ...center },
    calendarDayInner: { width: CALENDAR_CELL_SIZE - 6, height: CALENDAR_CELL_SIZE - 6, borderRadius: (CALENDAR_CELL_SIZE - 6) / 2, ...center },
    calendarDaySelected: { backgroundColor: COLORS.B },
    calendarDayToday: { borderWidth: 1, borderColor: COLORS.B },
    calendarDayText: { fontSize: 13, color: c.text },
    calendarDayTextDisabled: { color: COLORS.disabledDay },
    calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
    calendarTodayLink: { marginTop: 10, alignItems: 'center', paddingVertical: 6 },
    calendarTodayLinkText: bold(12, COLORS.B),

    chartTouchArea: { width: CHART_WIDTH, height: CHART_HEIGHT },
    chartEmptyOverlay: { ...StyleSheet.absoluteFillObject, ...center },
    chartHintText: { marginTop: 4, fontSize: 10, color: c.subText, fontStyle: 'italic' },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
    legendItem: { ...row, marginRight: 12, marginBottom: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
    legendText: { fontSize: 11, color: c.text, fontWeight: '600' },

    dropdownButton: btn,
    dropdownButtonText: { fontSize: 12, color: c.text, marginRight: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.15)', ...center },
    dropdownMenu: { backgroundColor: c.card, borderRadius: 10, paddingVertical: 6, minWidth: 160, ...cardShadow },
    dropdownItem: { paddingVertical: 10, paddingHorizontal: 16 },
    dropdownItemText: { fontSize: 13, color: c.text },
    dropdownItemTextActive: { color: COLORS.B, fontWeight: '700' },
    headerMenuOverlay: { flex: 1, backgroundColor: 'transparent' },
    headerMenuList: { position: 'absolute', backgroundColor: c.card, borderRadius: 10, paddingVertical: 6, minWidth: 170, ...box, ...cardShadow },

    editCard: { ...pop, padding: 18, width: 300, maxHeight: '80%' },
    renameTitle: { ...bold(14), marginBottom: 12 },
    renameInput: { ...box, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, fontSize: 13, color: c.text, marginBottom: 16 },
    renameButtonRow: { flexDirection: 'row', justifyContent: 'flex-end' },
    renameButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginLeft: 8 },
    renameButtonPrimary: { backgroundColor: COLORS.B },
    renameButtonText: bold(13),
    renameButtonTextPrimary: { color: '#FFFFFF' },
    editPanelScroll: { maxHeight: 320, marginBottom: 4 },
    editPanelFieldWrap: { marginBottom: 12 },
    editPanelFieldLabel: { ...bold(11, c.subText), marginBottom: 4 },
  });
};

export default WtsNewUI;