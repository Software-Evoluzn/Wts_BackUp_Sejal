import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import IP_ADDRESS from '../services/ipconfig';
import { exportReport } from '../services/reportExporter';

const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F6',
  border: '#E5E7EB',
  divider: '#EFECEF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#8E8E93',
  icon: '#333333',
  accent: '#8B2A8B',
  onAccent: '#FFFFFF',
  footerText: '#6E6577',
  footerBrand: '#7B2B75',
  dropdownBg: '#ECECEF',
  dropdownActive: '#666669',
  dropdownActiveText: '#FFFFFF',
  dropdownBorder: '#C8C8CE',
  dropdownDivider: '#D4D4DA',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  surfaceAlt: '#2E2A33',
  border: '#3A3540',
  divider: '#3A3540',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#A1A1AA',
  icon: '#FFFFFF',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  footerText: '#A1A1AA',
  footerBrand: '#E5A0DC',
  dropdownBg: '#2C2832',
  dropdownActive: '#524B5E',
  dropdownActiveText: '#FFFFFF',
  dropdownBorder: '#4A4454',
  dropdownDivider: '#3D3746',
};

const BOTTOM_TABS = [
  { key: 'Site', label: 'Site', icon: 'home', screen: null },
  { key: 'Panels', label: 'Panels', icon: 'layout', screen: null },
  { key: 'Units', label: 'Units', icon: 'radio', screen: null },
  { key: 'Reports', label: 'Reports', icon: 'file-text', screen: null },
];

const parseProbeCount = (probeType, explicitCount) => {
  const direct = Number(explicitCount);
  if (Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }
  if (typeof probeType === 'string') {
    const match = probeType.trim().match(/^(\d+)/);
    if (match) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return 4;
};

const buildPanelOptions = (probeType, explicitCount, customPanelNames = []) => {
  const totalProbes = parseProbeCount(probeType, explicitCount);
  // 4 probes per panel (4P -> 1 panel, 8P -> 2 panels, 12P -> 3 panels, 24P -> 6 panels)
  const panelCount = Math.max(1, Math.ceil(totalProbes / 4));

  const options = [{ label: 'All panels in scope', value: 'all' }];
  for (let i = 0; i < panelCount; i += 1) {
    const customName =
      Array.isArray(customPanelNames) && customPanelNames[i]
        ? String(customPanelNames[i]).trim()
        : '';
    options.push({
      label: customName || `Panel ${i + 1}`,
      value: `panel_${i + 1}`,
    });
  }
  return options;
};

const ReportsAndRecordsScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(insets, colors), [insets, colors]);

  const params = route?.params || {};
  const serialNo =
    params.serialNo ||
    params.deviceId ||
    params.device_id ||
    params.product?.serial_no ||
    '';
  const siteName =
    params.siteName || params.product?.location || 'Demo industrial site';
  const currentDeviceDisplay = serialNo || 'Not available';

  const [productMeta, setProductMeta] = useState(params.product || null);
  const [selectedPanel, setSelectedPanel] = useState({
    label: 'All panels in scope',
    value: 'all',
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Reports');
  const [statusMessage, setStatusMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const fetchProductMeta = useCallback(async () => {
    const uid = params.firebaseUid || params.product?.firebase_uid;
    if (!serialNo || !uid || !IP_ADDRESS) return;

    try {
      const res = await fetch(`${IP_ADDRESS}/get-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: uid }),
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.products)) {
        const matched = data.products.find(
          (item) =>
            String(item.serial_no || '').toLowerCase() ===
            String(serialNo).toLowerCase()
        );
        if (matched) {
          setProductMeta((prev) => ({ ...(prev || {}), ...matched }));
        }
      }
    } catch (_) {
      // Keep existing route/state values if network error occurs
    }
  }, [serialNo, params.firebaseUid, params.product?.firebase_uid]);

  useEffect(() => {
    fetchProductMeta();
  }, [fetchProductMeta]);

  const probeType =
    params.probeType ||
    productMeta?.probe_type ||
    params.product?.probe_type ||
    '4P';
  const probeCount =
    params.probeCount || params.channelCount || productMeta?.probe_count;
  const customPanelNames =
    params.panelNames || productMeta?.panel_names || [];

  const panelOptions = useMemo(
    () => buildPanelOptions(probeType, probeCount, customPanelNames),
    [probeType, probeCount, customPanelNames]
  );

  useEffect(() => {
    const stillExists = panelOptions.some(
      (opt) => opt.value === selectedPanel.value
    );
    if (!stillExists) {
      setSelectedPanel(panelOptions[0]);
    }
  }, [panelOptions, selectedPanel.value]);

  const onBack = () => {
    setDropdownOpen(false);
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Commissioned', serialNo ? { serialNo } : undefined);
  };

  const triggerExport = async (format) => {
    if (isExporting) return;
    setDropdownOpen(false);
    setStatusMessage('');
    setIsExporting(true);

    const labelText = 'Excel';

    if (!params.liveReadings?.probes?.length) {
      setIsExporting(false);
      Alert.alert(
        'No readings available',
        'Open this screen from the device screen so the latest readings can be exported.'
      );
      return;
    }

    try {
      const { filePath, queryCutoff } = await exportReport({
        format,
        deviceId: currentDeviceDisplay,
        panelLabel: selectedPanel.label,
        panelValue: selectedPanel.value,
        probeType,
        isDeviceOffline: Boolean(params.isDeviceOffline),
        liveReadings: params.liveReadings || null,
      });

      if (!filePath) {
        throw new Error('Export completed without returning a file path.');
      }

      setStatusMessage(
        `${labelText} saved to ${filePath} · ${selectedPanel.label}.`
      );
    } catch (err) {
      console.log('[Reports] export failed:', err);
      Alert.alert(
        'Export failed',
        err?.message || `Unable to generate ${labelText} report.`
      );
    } finally {
      setIsExporting(false);
    }
  };

  const onDownloadExcel = () => triggerExport('excel');

  const onOpenSamplePdf = () => {
    setDropdownOpen(false);
    const probes = Array.isArray(params.liveReadings?.probes)
      ? params.liveReadings.probes
      : [];
    const breachingProbe = probes.find((p) => {
      const val = Number(p?.value);
      const lim = Number(p?.threshold ?? params.liveReadings?.threshold);
      return Number.isFinite(val) && Number.isFinite(lim) && val > lim;
    });
    const targetProbe = breachingProbe || probes[0];

    navigation.navigate('TemperatureAlert', {
      probe: targetProbe?.probe || 'T1',
      label: targetProbe?.label || 'Incomer R phase',
      temperature:
        targetProbe?.value !== undefined && String(targetProbe.value).trim() !== ''
          ? targetProbe.value
          : '71.2',
      threshold:
        targetProbe?.threshold || params.liveReadings?.threshold || '65',
      durationMinutes: 4,
      probeType,
      serialNo: currentDeviceDisplay,
      triggeredAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    });
  };

  const onTabPress = (tab) => {
    setDropdownOpen(false);
    setActiveTab(tab.key);
    if (tab.key === 'Site') {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  };

  const onSelectPanel = (item) => {
    setSelectedPanel(item);
    setStatusMessage('');
    setDropdownOpen(false);
  };

  const renderPanelMenu = () => {
    if (!dropdownOpen) return null;

    return (
      <View style={styles.inlineDropdownMenu}>
        {panelOptions.map((item, idx) => {
          const isSelected = item.value === selectedPanel.value;
          const isLast = idx === panelOptions.length - 1;
          return (
            <TouchableOpacity
              key={item.value}
              style={[
                styles.inlineOptionRow,
                isSelected && styles.inlineOptionRowActive,
                !isLast && !isSelected && styles.inlineOptionDivider,
              ]}
              activeOpacity={0.85}
              onPress={() => onSelectPanel(item)}>
              <Text
                style={[
                  styles.inlineOptionText,
                  isSelected && styles.inlineOptionTextActive,
                ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.75}
            onPress={onBack}>
            <Feather name="arrow-left" size={22} color={colors.icon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thermidity</Text>
        </View>

        <Image
          source={require('../assests/images/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          if (dropdownOpen) setDropdownOpen(false);
        }}>
        <Text style={styles.overline}>SITE / ELECTRICAL PANELS</Text>
        <Text style={styles.screenTitle}>Reports for your scope.</Text>
        <Text style={styles.screenSubtitle}>{siteName}</Text>

        {/* Current Device ID */}
        <Text style={styles.fieldLabel}>Device ID</Text>
        <View style={styles.deviceIdBox}>
          <Text style={styles.deviceIdValue}>{currentDeviceDisplay}</Text>
        </View>

        {/* Panel Field & Inline Dropdown */}
        <Text style={styles.fieldLabel}>Panel</Text>
        <View style={styles.fieldContainer}>
          <TouchableOpacity
            style={styles.selectField}
            activeOpacity={0.8}
            onPress={() => setDropdownOpen((prev) => !prev)}>
            <Text style={styles.selectValue}>{selectedPanel.label}</Text>
            <Feather
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textPrimary}
            />
          </TouchableOpacity>
          {renderPanelMenu()}
        </View>

        {/* Primary Export Button */}
        <TouchableOpacity
          style={[styles.primaryButton, isExporting && styles.buttonDisabled]}
          activeOpacity={0.85}
          disabled={isExporting}
          onPress={onDownloadExcel}>
          <Text style={styles.primaryButtonText}>Download Excel</Text>
        </TouchableOpacity>

        {!!statusMessage && (
          <Text style={styles.statusFeedback}>{statusMessage}</Text>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Feather
            name="info"
            size={16}
            color={colors.accent}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Exports include point, unit, port, mapping version, limits, quality and query cutoff, using the latest readings from the device screen.
          </Text>
        </View>

        {/* Full-site Reference Card */}
        <View style={styles.referenceCard}>
          <Text style={styles.referenceTitle}>Full-site reference</Text>
          <Text style={styles.referenceSubtitle}>
            Fixed example; not affected by these filters.
          </Text>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={onOpenSamplePdf}
            style={styles.referenceLinkWrap}>
            <Text style={styles.referenceLink}>Open full-site sample PDF →</Text>
          </TouchableOpacity>

          <Text style={styles.referenceFooter}>
            Controlled PDF issuance and scheduled delivery remain Phase 2. Basic downloads are separate.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.tabRow}>
          {BOTTOM_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tint = isActive ? colors.accent : colors.textSecondary;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                activeOpacity={0.8}
                onPress={() => onTabPress(tab)}>
                <Feather name={tab.icon} size={20} color={tint} />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: tint },
                    isActive && styles.activeTabLabel,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.brandFooterRow}>
          <Text style={styles.brandFooterText}>
            Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

export default ReportsAndRecordsScreen;

const createStyles = (insets, c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 12),
      paddingBottom: 14,
      backgroundColor: c.bg,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      paddingVertical: 4,
      paddingRight: 14,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.textPrimary,
    },
    brandLogo: {
      width: 90,
      height: 24,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 32,
    },
    overline: {
      fontSize: 12,
      fontWeight: '700',
      color: c.accent,
      letterSpacing: 0.9,
      marginBottom: 8,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: 14.5,
      color: c.textSecondary,
      marginTop: 6,
      marginBottom: 22,
    },
    fieldLabel: {
      fontSize: 13.5,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 8,
    },
    deviceIdBox: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 15,
      marginBottom: 18,
    },
    deviceIdValue: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '600',
    },
    fieldContainer: {
      marginBottom: 18,
      zIndex: 20,
    },
    selectField: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },
    selectValue: {
      fontSize: 15,
      color: c.textSecondary,
      fontWeight: '500',
    },
    inlineDropdownMenu: {
      marginTop: 4,
      backgroundColor: c.dropdownBg,
      borderWidth: 1,
      borderColor: c.dropdownBorder,
      borderRadius: 4,
      overflow: 'hidden',
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 4,
    },
    inlineOptionRow: {
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    inlineOptionRowActive: {
      backgroundColor: c.dropdownActive,
    },
    inlineOptionDivider: {
      borderBottomWidth: 1,
      borderBottomColor: c.dropdownDivider,
    },
    inlineOptionText: {
      fontSize: 15,
      color: c.textPrimary,
      fontWeight: '400',
    },
    inlineOptionTextActive: {
      color: c.dropdownActiveText,
      fontWeight: '500',
    },
    primaryButton: {
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      marginBottom: 16,
    },
    primaryButtonText: {
      color: c.onAccent,
      fontSize: 15.5,
      fontWeight: '700',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    statusFeedback: {
      fontSize: 12.5,
      color: c.accent,
      textAlign: 'center',
      marginBottom: 12,
      fontWeight: '600',
    },
    infoNote: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 14,
    },
    infoIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: c.textSecondary,
    },
    referenceCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginTop: 14,
    },
    referenceTitle: {
      fontSize: 15.5,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 6,
    },
    referenceSubtitle: {
      fontSize: 13.5,
      lineHeight: 19,
      color: c.textSecondary,
    },
    referenceLinkWrap: {
      marginTop: 14,
      marginBottom: 14,
      alignSelf: 'flex-start',
    },
    referenceLink: {
      fontSize: 15,
      fontWeight: '500',
      color: c.textPrimary,
    },
    referenceFooter: {
      fontSize: 13,
      lineHeight: 19,
      color: c.textSecondary,
    },
    bottomBar: {
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingTop: 10,
      paddingBottom: Math.max(insets.bottom, 10),
    },
    tabRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      marginBottom: 6,
    },
    tabItem: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    tabLabel: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
    },
    activeTabLabel: {
      fontWeight: '700',
    },
    brandFooterRow: {
      alignItems: 'center',
      marginTop: 2,
    },
    brandFooterText: {
      fontSize: 11.5,
      color: c.footerText,
    },
    brandFooterBold: {
      fontWeight: '800',
      color: c.footerBrand,
      letterSpacing: 1.1,
    },
  });