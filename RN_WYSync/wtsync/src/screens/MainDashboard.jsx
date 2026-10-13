import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Image,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import io from 'socket.io-client';
import auth from '@react-native-firebase/auth';
import IP_ADDRESS from '../services/ipconfig';
import { fetchPhaseLabels } from '../services/WtsApi';

const BACKEND_URL = IP_ADDRESS;
const PRIMARY = '#812975';

const panelName = (p) => p.custom_name || `Panel ${p.panel_no}`;
const same = (a, b) => (a || '').trim().toUpperCase() === (b || '').trim().toUpperCase();

const timeAgo = (date, now) => {
  if (!date) return 'waiting for data';
  const s = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (s < 60) return `${s} sec ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} hr ago`;
};

const MainDashboard = ({ navigation, route }) => {
  const product = route?.params?.product || {};
  const serial = product?.serial_no;
  const firebaseUid = route?.params?.firebaseUid || auth().currentUser?.uid;

  const [device, setDevice] = useState(null);
  const [phaseLabels, setPhaseLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [now, setNow] = useState(Date.now());
  const labelsLoaded = useRef(false);

  // tick for "x sec ago"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  // initial snapshot from API
  const fetchDevice = useCallback(async () => {
    if (!firebaseUid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: firebaseUid }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const found = serial ? data.find((d) => same(d.serial_no, serial)) : data[0];
        if (found) {
          setDevice(found);
          setLastUpdated(new Date());
        }
      } else {
        console.warn('API returned empty or error:', data);
      }
    } catch (error) {
      console.warn('Network error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [firebaseUid, serial]);

  useEffect(() => { fetchDevice(); }, [fetchDevice]);

  // phase labels (custom names for channels)
  const deviceSerial = device?.serial_no;
  useEffect(() => {
    if (!deviceSerial || labelsLoaded.current) return;
    labelsLoaded.current = true;
    fetchPhaseLabels(deviceSerial)
      .then((labels) => setPhaseLabels(labels || {}))
      .catch((e) => {
        console.warn('Phase label fetch error:', e);
        labelsLoaded.current = false;
      });
  }, [deviceSerial]);

  // live socket
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socket.on('connect_error', (e) => console.warn('Socket error:', e?.message));
    socket.on('live_telemetry', (live) => {
      const target = serial || null;
      if (target && !same(live.serial_no, target)) return;
      setDevice((prev) => {
        if (!prev) return prev;
        if (!target && !same(live.serial_no, prev.serial_no)) return prev;
        const panels = prev.panels.map((p) => {
          const lp = live.panels?.find((x) => Number(x.panel_no) === Number(p.panel_no));
          return lp ? { ...p, temperatures: lp.temperatures, custom_name: lp.custom_name || p.custom_name } : p;
        });
        return { ...prev, status: live.status, panels };
      });
      setLastUpdated(new Date());
    });
    return () => socket.disconnect();
  }, [serial]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDevice();
  }, [fetchDevice]);

  const isConnected = device?.status === 'Online';

  // panels -> channels, fully dynamic (any number of panels / phases)
  const groups = useMemo(() => {
    let n = 0; // running T-number across all panels: T1, T2, T3...
    return (device?.panels || [])
      .map((p) => ({
        key: String(p.panel_no),
        title: panelName(p),
        channels: (p.temperatures || []).map((t) => {
          n += 1;
          return {
            id: `${p.panel_no}-${t.phase}`,
            tag: `T${n}`,
            phase: t.phase,
            panelNo: p.panel_no,
            label: phaseLabels[t.phase] || t.phase,
            temp: t.current,
          };
        }),
      }))
      .filter((g) => g.channels.length > 0);
  }, [device?.panels, phaseLabels]);

  const totalChannels = groups.reduce((n, g) => n + g.channels.length, 0);
  const reporting = groups.reduce((n, g) => n + g.channels.filter((c) => c.temp != null).length, 0);

  const deviceTitle = device ? `${device.device_name || 'IntelliTemp'}` : product?.title || product?.name || 'IntelliTemp';
  const deviceSubTitle = device
    ? `${device.serial_no} · ${totalChannels} temperature input${totalChannels === 1 ? '' : 's'}`
    : product?.description || product?.type || '';

  const alertTitle = !isConnected
    ? 'Device is offline.'
    : reporting === totalChannels && totalChannels > 0
      ? `All ${totalChannels} channels are reporting.`
      : `${reporting} of ${totalChannels} channels reporting.`;
  const alertSub = !isConnected ? 'Showing the last known readings.' : 'Readings update live.';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <View style={styles.logoGroup}>
          <MaterialCommunityIcons name="thermometer" color={PRIMARY} size={26} />
          <Text style={styles.logoText}>IntelliTemp</Text>
        </View>
        <Image source={require('../assests/images/logo.png')} style={styles.brandLogo} resizeMode="contain" />
      </View>

      {loading && !device ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[PRIMARY]} tintColor={PRIMARY} />}
        >
          <Text style={styles.sectionCategory}>DEVICE OVERVIEW</Text>
          <Text style={styles.deviceTitle}>{deviceTitle}</Text>
          <Text style={styles.deviceSubTitle}>{deviceSubTitle}</Text>

          <View style={styles.statusRow}>
            <View style={[styles.connectedBadge, !isConnected && styles.disconnectedBadge]}>
              <Feather name={isConnected ? 'check' : 'x'} size={14} color={isConnected ? '#15803d' : '#b91c1c'} />
              <Text style={[styles.connectedText, !isConnected && styles.disconnectedText]}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
            <View style={styles.timeBadge}>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#6b7280" />
              <Text style={styles.timeText}>{timeAgo(lastUpdated, now)}</Text>
            </View>
          </View>

          {groups.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="power-plug-off" size={34} color="#94a3b8" />
              <Text style={styles.emptyText}>No channel data available</Text>
            </View>
          ) : (
            groups.map((g) => (
              <View key={g.key} style={styles.groupWrap}>
                {groups.length > 1 && <Text style={styles.groupTitle}>{g.title}</Text>}
                <View style={styles.gridContainer}>
                  {g.channels.map((c) => {
                    const has = c.temp != null;
                    const valid = has && isConnected;
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.card}
                        activeOpacity={0.7}
                        onPress={() =>
                          navigation?.navigate('TemperatureHistory', {
                            product: device || product,
                            channel: c.phase,
                            panelNo: c.panelNo,
                          })
                        }
                      >
                        <View style={styles.cardHeader}>
                          <Text style={styles.sensorLabel} numberOfLines={1}>
                            <Text style={styles.sensorTag}>{c.tag}</Text> · Temperature
                          </Text>
                          <Feather
                            name={valid ? 'check-circle' : 'alert-circle'}
                            size={16}
                            color={valid ? '#16a34a' : '#9ca3af'}
                          />
                        </View>
                        <Text style={styles.sensorTitle} numberOfLines={1}>{c.label}</Text>
                        <View style={styles.tempContainer}>
                          <Text style={styles.tempValue}>{has ? Number(c.temp).toFixed(1) : '--'}</Text>
                          {has && <Text style={styles.tempUnit}>°C</Text>}
                        </View>
                        <Text style={[styles.sensorStatus, !valid && { color: '#9ca3af' }]}>
                          {valid ? 'Valid · In range' : 'No reading'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))
          )}

          {totalChannels > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alertTitle}</Text>
                <Text style={styles.alertSub}>{alertSub}</Text>
              </View>
              <Feather name={isConnected ? 'check' : 'wifi-off'} size={22} color="#374151" />
            </View>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation?.navigate('TemperatureHistory', { product: device || product })}
          >
            <MaterialCommunityIcons name="chart-line" size={20} color={PRIMARY} />
            <Text style={styles.actionButtonText}>Explore temperature history</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <View />
            <TouchableOpacity onPress={() => navigation?.navigate('DeviceDetails', { product: device || product })}>
              <Text style={styles.deviceDetailsLink}>Device details</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation?.navigate('MainDashboard', { product })}>
          <Feather name="home" size={22} color={PRIMARY} />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Devices</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation?.navigate('AddDevice')}>
          <Ionicons name="add-circle-outline" size={24} color="#6b7280" />
          <Text style={styles.navLabel}>Add device</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation?.navigate('Settings')}>
          <MaterialCommunityIcons name="tune-vertical" size={22} color="#6b7280" />
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.poweredByContainer}>
        <Text style={styles.poweredByText}>
          Powered By <Text style={styles.poweredByBrand}>EVOLUZN</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default MainDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', marginTop: 5, justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  logoGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  brandLogo: { width: 80, height: 40, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  sectionCategory: { fontSize: 12, fontWeight: '700', color: PRIMARY, letterSpacing: 1, marginBottom: 4 },
  deviceTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  deviceSubTitle: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  connectedBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4,
  },
  disconnectedBadge: { backgroundColor: '#fee2e2' },
  connectedText: { color: '#15803d', fontSize: 12, fontWeight: '600' },
  disconnectedText: { color: '#b91c1c' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: '#64748b', fontSize: 12 },
  groupWrap: { marginBottom: 4 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  card: {
    width: '48%', backgroundColor: '#ffffff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sensorLabel: { fontSize: 12, color: '#64748b', flexShrink: 1, marginRight: 6 },
  sensorTag: { color: PRIMARY, fontWeight: '500' },
  sensorTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  tempContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  tempValue: { fontSize: 26, fontWeight: '700', color: '#0f172a' },
  tempUnit: { fontSize: 14, fontWeight: '500', color: '#64748b', marginLeft: 2 },
  sensorStatus: { fontSize: 11, color: '#0891b2', fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, fontSize: 13, color: '#64748b' },
  alertCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1,
    borderColor: '#e2e8f0', marginBottom: 12,
  },
  alertContent: { flex: 1, paddingRight: 8 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  alertSub: { fontSize: 12, color: '#64748b' },
  actionButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', gap: 8, marginBottom: 20,
  },
  actionButtonText: { color: PRIMARY, fontWeight: '700', fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deviceDetailsLink: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  bottomNav: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#ffffff',
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  navItem: { alignItems: 'center', gap: 4 },
  navLabel: { fontSize: 11, color: '#6b7280' },
  activeNavLabel: { color: PRIMARY, fontWeight: '600' },
  poweredByContainer: { alignItems: 'center', backgroundColor: '#ffffff', paddingBottom: 8 },
  poweredByText: { fontSize: 10, color: '#94a3b8' },
  poweredByBrand: { fontWeight: '700', color: PRIMARY },
});