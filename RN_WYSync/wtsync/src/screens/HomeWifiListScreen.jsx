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
} from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import Feather from 'react-native-vector-icons/Feather';
import { useAppTheme } from '../services/theme';

export default function HomeWifiListScreen({ navigation, route }) {
  const { product,
    autoConnect,
    serialNo,
    ssid,
   } = route.params || {};

   
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

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
          <Feather name="wifi" size={18} color="#8C3182" style={styles.wifiIcon} />

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
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
          ) : (
            <Feather name="chevron-right" size={18} color="#A0A0A0" />
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
          <ActivityIndicator size="small" color="#8C3182" />
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
        <Feather name="rotate-cw" size={16} color="#8C3182" style={{ marginRight: 8 }} />
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Feather name="arrow-left" size={22} color="#333333" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleBold}>IntelliTemp </Text>
          <Text style={styles.headerTitleSub}>4P</Text>
        </View>

        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>evoluzn</Text>
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
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <View style={styles.footerBrand}>
          <Text style={styles.poweredByText}>Powered By </Text>
          <Text style={styles.brandText}>EVOLUZN</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: '#F8F8FC',
    },
    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
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
      color: '#1F1F1F',
    },
    headerTitleSub: {
      fontSize: 13,
      fontWeight: '700',
      color: '#8E8E93',
    },
    logoContainer: {
      justify: 'center',
    },
    logoText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#8C3182',
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
      backgroundColor: '#8C3182',
    },
    progressInactive: {
      backgroundColor: '#E5E5EA',
    },
    stepText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#8C3182',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    mainTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: '#1A1A1A',
      marginBottom: 6,
    },
    subTitle: {
      fontSize: 14,
      color: '#666666',
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
      color: '#1C1C1E',
    },
    badge24: {
      backgroundColor: '#FDF0F9',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    badge24Text: {
      color: '#8C3182',
      fontSize: 12,
      fontWeight: '600',
    },
    networkRowContainer: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      borderColor: '#EFEFEF',
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
      color: '#1C1C1E',
      marginBottom: 3,
    },
    metaText: {
      fontSize: 12.5,
      color: '#8E8E93',
    },
    rowDivider: {
      height: 1,
      backgroundColor: '#F2F2F7',
      marginLeft: 32,
    },
    selectedCheckWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#8C3182',
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
      color: '#8C3182',
      fontSize: 14,
      fontWeight: '600',
    },
    notListedBox: {
      backgroundColor: '#FAFAFC',
      borderRadius: 10,
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#F0F0F5',
      marginBottom: 20,
    },
    notListedText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#8C3182',
    },
    loadingWrap: {
      paddingVertical: 30,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EFEFEF',
      marginBottom: 16,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: '#8E8E93',
    },
    emptyWrap: {
      paddingVertical: 24,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EFEFEF',
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#1C1C1E',
      marginBottom: 4,
    },
    emptyDescription: {
      fontSize: 13,
      color: '#8E8E93',
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
    },
    continueButton: {
      backgroundColor: '#8C3182',
      borderRadius: 10,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 16,
      marginBottom: 12,
    },
    continueButtonText: {
      color: '#FFFFFF',
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
      color: '#8E8E93',
    },
    brandText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#8C3182',
    },
  });