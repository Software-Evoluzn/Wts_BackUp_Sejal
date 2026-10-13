import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { getUserDetails } from '../services/AuthService';
import { getProducts } from '../services/ProductApi';
import { fetchInstalledProducts } from '../services/InstallationService';
import { useAppTheme } from '../services/theme';

const ACCENT = '#8E338A';

// "2026-10-08T10:00:00Z" -> "20 seconds ago" / "8 minutes ago"
const formatAgo = (isoString) => {
  const time = Date.parse(isoString);
  if (Number.isNaN(time)) return null;

  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

// Devices are matched by serial number so the same device is never listed twice
const keyOf = (p) => p.serial_no || p.serial_number || `id-${p.id}`;

// Merges the normal device list with the devices installed through the setup wizard.
// The wizard data (location, application, probe names, ...) is added on top.
const mergeProducts = (base = [], installed = []) => {
  const map = new Map();
  base.forEach((p) => map.set(keyOf(p), p));
  installed.forEach((p) => {
    const key = keyOf(p);
    map.set(key, { ...(map.get(key) || {}), ...p });
  });
  return Array.from(map.values());
};

const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, isDark, insets);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const intervalRef = useRef(null);

  // Background polling that only triggers state updates if the returned data actually changed
  const loadHomeData = async () => {
    try {
      const userResult = await getUserDetails();
      if (userResult?.success) {
        setUser((prev) =>
          JSON.stringify(prev) === JSON.stringify(userResult.user) ? prev : userResult.user
        );
      }

      const uid = userResult?.user?.firebase_uid;

      // Normal device list + devices installed through the setup wizard
      const [baseResult, installedResult] = await Promise.all([
        getProducts().catch(() => null),
        uid ? fetchInstalledProducts(uid).catch(() => null) : Promise.resolve(null),
      ]);

      const baseOk = !!baseResult?.success;
      const installedOk = !!installedResult?.success;

      if (baseOk || installedOk) {
        const merged = mergeProducts(
          baseOk ? baseResult.products || [] : [],
          installedOk ? installedResult.products || [] : []
        );

        setProducts((prev) =>
          JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged
        );
      }
    } catch (e) {
      console.log('Home Screen Error', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHomeData();

      intervalRef.current = setInterval(() => {
        loadHomeData();
      }, 5000); // 5 second polling

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [])
  );

  const renderDeviceCard = ({ item }) => {
    const isConnected = item.online ?? true;

    // Devices installed through the setup wizard have an application saved
    const isInstalled = item.config_status === 'applied';
    const probeCount = item.probe_labels?.length || 4;
    const lastSeenText = item.last_seen ? formatAgo(item.last_seen) : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => {
          // Same as before: connected devices open the IntelliTemp dashboard.
          // A device that finished the installation wizard opens it too, even if
          // it has not reported yet.
          if (isConnected || isInstalled) {
            navigation.navigate('WtsDashboard', { product: item });
          } else {
            navigation.navigate('DeviceConfig', { product: item });
          }
        }}>
        {/* Device Name + Status Badge */}
        <View style={styles.cardHeader}>
          <Text style={styles.deviceName} numberOfLines={1}>
            {item.location || item.device_name || 'IntelliTemp'}
          </Text>

          <View
            style={[
              styles.statusBadge,
              isConnected ? styles.badgeConnected : styles.badgeWarning,
            ]}>
            <MaterialCommunityIcons
              name={isConnected ? 'shield-check-outline' : 'alert-circle-outline'}
              size={14}
              color={isConnected ? '#2D7A53' : '#9E6410'}
              style={styles.badgeIcon}
            />
            <Text
              style={[
                styles.statusBadgeText,
                isConnected ? styles.textConnected : styles.textWarning,
              ]}>
              {isConnected ? 'Connected' : 'No recent report'}
            </Text>
          </View>
        </View>

        {/* Model & Serial Number Row */}
        <View style={styles.subtitleRow}>
          <Text style={styles.deviceSubtitle}>
            {item.model_no || item.device_name || 'IntelliTemp 4P'} ·{' '}
            {item.application || 'Electrical panel'}
          </Text>
          <Text style={styles.deviceSerial}>
            S/N: {item.serial_no || item.serial_number || 'N/A'}
          </Text>
        </View>

        <View style={styles.cardDivider} />

        {/* Footer info metrics */}
        <View style={styles.cardFooter}>
          <View style={styles.metricItem}>
            <Feather
              name={isConnected ? 'thermometer' : 'disc'}
              size={13}
              color={isDark ? colors.subText : '#716C7B'}
              style={styles.metricIcon}
            />
            <Text style={styles.metricText}>
              {item.probes_valid ||
                (isConnected ? `${probeCount} / ${probeCount} valid` : 'Readings stale')}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Feather
              name="clock"
              size={13}
              color={isDark ? colors.subText : '#716C7B'}
              style={styles.metricIcon}
            />
            <Text style={styles.metricText}>
              {item.last_updated ||
                lastSeenText ||
                (isConnected ? '20 seconds ago' : '8 minutes ago')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.categoryTag}>MY DEVICES</Text>
      <Text style={styles.title}>Your sites, at a glance.</Text>
      <Text style={styles.subtitle}>
        See what needs attention before opening a device.
      </Text>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Assigned devices</Text>
        <Text style={styles.sectionCount}>
          {products.length} {products.length === 1 ? 'device' : 'devices'}
        </Text>
      </View>
    </View>
  );

  const ListFooter = () => (
    <View style={styles.footerContent}>
      {/* Add Device Button */}
      <TouchableOpacity
        style={styles.addDeviceBtn}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Register')}>
        <View style={styles.addIconContainer}>
          <Feather name="plus" size={16} color={ACCENT} />
        </View>
        <Text style={styles.addDeviceText}>Add a device</Text>
      </TouchableOpacity>

      {/* Info Callout Box */}
      <View style={styles.noticeBox}>
        <MaterialCommunityIcons
          name="cellphone-wireless"
          size={20}
          color={ACCENT}
          style={styles.noticeIcon}
        />
        <Text style={styles.noticeText}>
          A connected device can still have a disconnected or stale probe. Inspect
          readings separately.
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="#FFFFFF"
        translucent={true}
      />

      {/* Top Header Row with Logo */}
      <View style={styles.topHeaderContainer}>
        <View style={styles.brandRow}>
          <Feather name="thermometer" size={22} color={ACCENT} />
          <Text style={styles.brandTitle}>IntelliTemp</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Settings')}>
          <Image
            source={require('../assests/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        ListHeaderComponent={ListHeader()}
        ListFooterComponent={ListFooter()}
        renderItem={renderDeviceCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default HomeScreen;

const createStyles = (colors, isDark, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#F5F4F7',
    },

    /* Top Header Bar */
    topHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 12,
      paddingBottom: 12,
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? colors.border : '#EFECEF',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? colors.text : '#1A1622',
      letterSpacing: -0.3,
    },
    logoImage: {
      width: 90,
      height: 28,
    },

    /* List Layout */
    listContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
    },
    headerContent: {
      marginBottom: 16,
    },
    categoryTag: {
      fontSize: 11,
      fontWeight: '800',
      color: ACCENT,
      letterSpacing: 1.1,
      marginBottom: 6,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: isDark ? colors.text : '#1B1721',
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 14.5,
      color: isDark ? colors.subText : '#716C7B',
      lineHeight: 21,
      marginBottom: 24,
    },
    sectionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? colors.text : '#1B1721',
    },
    sectionCount: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? colors.subText : '#8B8796',
    },

    /* Card Styling */
    card: {
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderRadius: 14,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#EAE6EE',
      shadowColor: '#000',
      shadowOpacity: 0.03,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    deviceName: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? colors.text : '#1B1721',
      flex: 1,
      marginRight: 8,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeConnected: {
      backgroundColor: isDark ? 'rgba(34, 197, 94, 0.12)' : '#EBF7F0',
    },
    badgeWarning: {
      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.12)' : '#FEF6E8',
    },
    badgeIcon: {
      marginRight: 4,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    textConnected: {
      color: isDark ? '#4ADE80' : '#2D7A53',
    },
    textWarning: {
      color: isDark ? '#FACC15' : '#9E6410',
    },
    subtitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    deviceSubtitle: {
      fontSize: 13,
      color: isDark ? colors.subText : '#8B8796',
      flexShrink: 1,
      marginRight: 8,
    },
    deviceSerial: {
      fontSize: 12.5,
      fontWeight: '600',
      color: isDark ? colors.subText : '#716C7B',
    },
    cardDivider: {
      height: 1,
      backgroundColor: isDark ? colors.border : '#F0ECF3',
      marginVertical: 10,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    metricItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metricIcon: {
      marginRight: 6,
    },
    metricText: {
      fontSize: 12.5,
      color: isDark ? colors.subText : '#716C7B',
      fontWeight: '500',
    },

    /* List Footer Components */
    footerContent: {
      marginTop: 4,
      marginBottom: 12,
    },
    addDeviceBtn: {
      height: 50,
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E1DAE4',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    addIconContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(142, 51, 138, 0.15)' : '#F5EBF6',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    addDeviceText: {
      fontSize: 15,
      fontWeight: '700',
      color: ACCENT,
    },
    noticeBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(142, 51, 138, 0.08)' : '#FAEFFB',
      borderRadius: 12,
      padding: 14,
    },
    noticeIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    noticeText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? colors.subText : '#686070',
    },
  });