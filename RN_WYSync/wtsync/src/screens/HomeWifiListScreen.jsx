import React, { useEffect, useState, useRef, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Image,
  useColorScheme,
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import Feather from 'react-native-vector-icons/Feather';

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
const LIGHT = {
  bg: '#F8F8FC',
  header: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EFEFEF',
  divider: '#F2F2F7',
  footerBorder: '#F0F0F0',
  headerText: '#1F1F1F',
  backIcon: '#333333',
  chevron: '#A0A0A0',
  text: '#1C1C1E',
  textStrong: '#1A1A1A',
  sub: '#666666',
  muted: '#8E8E93',
  accent: '#8C3182',
  onAccent: '#FFFFFF',
  stepOff: '#E5E5EA',
  badgeBg: '#FDF0F9',
  noteBg: '#FAFAFC',
  noteBorder: '#F0F0F5',
  statusBar: 'dark-content',
};

const DARK = {
  bg: '#17141A',
  header: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  divider: '#3A3540',
  footerBorder: '#2E2A33',
  headerText: '#FFFFFF',
  backIcon: '#FFFFFF',
  chevron: '#A1A1AA',
  text: '#F4F4F5',
  textStrong: '#FFFFFF',
  sub: '#A1A1AA',
  muted: '#A1A1AA',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  badgeBg: '#3A2A3A',
  noteBg: '#2A2430',
  noteBorder: '#2A2430',
  statusBar: 'light-content',
};

export default function HomeWifiListScreen({ navigation, route }) {
  const { product,
    autoConnect,
    serialNo,
    ssid,
   } = route.params || {};

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = createStyles(t);

  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState(null);

  const isScanningRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastAutoRefreshAtRef = useRef(0);
  const AUTO_REFRESH_THROTTLE_MS = 4000;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWifiList();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchWifiList();
  }, []);

  const fetchWifiList = async ({ silent = false } = {}) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;

    try {
      const wifiList = await WifiManager.reScanAndLoadWifiList();

      const filteredList = (wifiList || []).filter(
        (item) =>
          item.SSID &&
          item.SSID.length > 0 &&
          !item.SSID.startsWith('WTS') &&
          item.frequency >= 2400 &&
          item.frequency <= 2500
      );

      if (isMountedRef.current) {
        setNetworks(filteredList);
        if (!silent) {
          setLoading(false);
        }
      }
    } catch (error) {
      console.log(error);
      if (!silent) {
        Alert.alert('Error', 'Unable to scan WiFi');
        if (isMountedRef.current) setLoading(false);
      }
    } finally {
      isScanningRef.current = false;
    }
  };

  const handleEndReached = useCallback(() => {
    const now = Date.now();
    if (
      isScanningRef.current ||
      loading ||
      now - lastAutoRefreshAtRef.current < AUTO_REFRESH_THROTTLE_MS
    ) {
      return;
    }

    lastAutoRefreshAtRef.current = now;
    fetchWifiList({ silent: true });
  }, [loading]);

  const getSignalLabel = (level) => {
    if (level >= -60) return 'Strong signal';
    if (level >= -75) return 'Good signal';
    return 'Fair signal';
  };

  const renderItem = ({ item, index }) => {
    const isSelected = selectedSsid === item.SSID;
    const isLastItem = index === networks.length - 1;

    return (
      <View style={styles.networkRowContainer}>
        <TouchableOpacity
          style={styles.networkRow}
          activeOpacity={0.7}
          onPress={() => {
            setSelectedSsid(item.SSID);
            navigation.navigate('Password', 
              { 
                network: item, 
                product ,
                autoConnect,
                serialNo,
                ssid
              });
          }}
        >
          <Feather name="wifi" size={18} color={t.accent} style={styles.wifiIcon} />

          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.ssidText} numberOfLines={1}>
              {item.SSID}
            </Text>
            <Text style={styles.metaText}>
              {getSignalLabel(item.level)} · Password protected
            </Text>
          </View>

          {isSelected ? (
            <View style={styles.selectedCheckWrap}>
              <Feather name="check" size={12} color={t.onAccent} />
            </View>
          ) : (
            <Feather name="chevron-right" size={18} color={t.chevron} />
          )}
        </TouchableOpacity>

        {!isLastItem && <View style={styles.rowDivider} />}
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.scrollContent}>
      {/* Progress Bar (Step 2 Active) */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressActive]} />
        <View style={[styles.progressSegment, styles.progressInactive]} />
        <View style={[styles.progressSegment, styles.progressInactive]} />
        <View style={[styles.progressSegment, styles.progressInactive]} />
        <View style={[styles.progressSegment, styles.progressInactive]} />
      </View>

      {/* Step Info */}
      <Text style={styles.stepText}>STEP 2 OF 6 · CONNECT</Text>
      <Text style={styles.mainTitle}>Choose site Wi-Fi.</Text>
      <Text style={styles.subTitle}>Select the network IntelliTemp should use.</Text>

      {/* Section Title with Badge */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Available networks</Text>
        <View style={styles.badge24}>
          <Text style={styles.badge24Text}>2.4 GHz</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={t.accent} />
          <Text style={styles.loadingText}>Scanning 2.4GHz WiFi...</Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View style={styles.scrollContent}>
      {/* Scan Again Button */}
      <TouchableOpacity
        style={styles.scanAgainButton}
        activeOpacity={0.7}
        onPress={() => {
          setLoading(true);
          fetchWifiList();
        }}
      >
        <Feather name="rotate-cw" size={16} color={t.accent} style={{ marginRight: 8 }} />
        <Text style={styles.scanAgainText}>Scan again</Text>
      </TouchableOpacity>

      {/* Network Not Listed Button */}
      <TouchableOpacity style={styles.notListedBox} activeOpacity={0.8}>
        <Text style={styles.notListedText}>My network is not listed</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={t.statusBar} backgroundColor={t.header} />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={22} color={t.backIcon} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleBold}>IntelliTemp </Text>
          <Text style={styles.headerTitleSub}>4P</Text>
        </View>

        <View style={styles.logoContainer}>
                  <Image
                    source={require('../assests/images/logo.png')}
                    style={styles.brandLogo}
                    resizeMode="contain"
                  />
                </View>
      </View>

      <FlatList
        data={loading ? [] : networks}
        keyExtractor={(item, index) => item.SSID || index.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No 2.4GHz networks found</Text>
              <Text style={styles.emptyDescription}>
                Make sure your home WiFi is broadcasting on 2.4GHz.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          activeOpacity={0.8}
          onPress={() => {
            if (networks.length > 0) {
              const selectedNetwork = networks.find((n) => n.SSID === selectedSsid) || networks[0];
              navigation.navigate('Password', { network: selectedNetwork, product });
            }
          }}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
          <Feather name="arrow-right" size={18} color={t.onAccent} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <View style={styles.footerBrand}>
          <Text style={styles.poweredByText}>Powered By </Text>
          <Text style={styles.brandText}>EVOLUZN</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (t) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: t.bg,
    },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      backgroundColor: t.header,
      borderBottomWidth: 1,
      borderBottomColor: t.footerBorder,
    },
    backButton: {
      paddingRight: 12,
    },
    headerTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitleBold: {
      fontSize: 18,
      fontWeight: '700',
      color: t.headerText,
    },
    headerTitleSub: {
      fontSize: 13,
      fontWeight: '700',
      color: t.muted,
    },
    logoContainer: {
      width: 75,
      height: 45,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: t.accent,
    },
    listContainer: {
      paddingHorizontal: 20,
    },
    scrollContent: {
      paddingTop: 16,
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
      backgroundColor: t.accent,
    },
    progressInactive: {
      backgroundColor: t.stepOff,
    },
    stepText: {
      fontSize: 12,
      fontWeight: '700',
      color: t.accent,
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    mainTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textStrong,
      marginBottom: 6,
    },
    subTitle: {
      fontSize: 14,
      color: t.sub,
      marginBottom: 24,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: t.text,
    },
    badge24: {
      backgroundColor: t.badgeBg,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    badge24Text: {
      color: t.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    networkRowContainer: {
      backgroundColor: t.surface,
      paddingHorizontal: 16,
      borderColor: t.border,
      borderLeftWidth: 1,
      borderRightWidth: 1,
    },
    networkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    wifiIcon: {
      marginRight: 14,
    },
    ssidText: {
      fontSize: 15,
      fontWeight: '600',
      color: t.text,
      marginBottom: 3,
    },
    metaText: {
      fontSize: 12.5,
      color: t.muted,
    },
    rowDivider: {
      height: 1,
      backgroundColor: t.divider,
      marginLeft: 32,
    },
    selectedCheckWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scanAgainButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 16,
    },
    scanAgainText: {
      color: t.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    notListedBox: {
      backgroundColor: t.noteBg,
      borderRadius: 10,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.noteBorder,
      marginBottom: 20,
    },
    notListedText: {
      fontSize: 15,
      fontWeight: '700',
      color: t.accent,
    },
    loadingWrap: {
      paddingVertical: 30,
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 16,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: t.muted,
    },
    emptyWrap: {
      paddingVertical: 24,
      alignItems: 'center',
      backgroundColor: t.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.border,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: t.text,
      marginBottom: 4,
    },
    emptyDescription: {
      fontSize: 13,
      color: t.muted,
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: t.surface,
      borderTopWidth: 1,
      borderTopColor: t.footerBorder,
    },
    continueButton: {
      backgroundColor: t.accent,
      borderRadius: 10,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 12,
    },
    continueButtonText: {
      color: t.onAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    footerBrand: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    poweredByText: {
      fontSize: 12,
      color: t.muted,
    },
    brandText: {
      fontSize: 12,
      fontWeight: '800',
      color: t.accent,
    },
    brandLogo: {
      width: 75,
      height: 45,
    },
  });