import React, { useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;

// Demo values (match the design). They are used whenever the earlier steps
// don't pass real data into this screen.
const DEMO = {
  location: 'Floor 3 · MCC-01',
  deviceModel: 'IntelliTemp 4P',
  probes: 'T1–T4',
  highLines: ['High: at or above 65°C'],
  lowLine: 'Low: disabled',
  persistenceLine: 'Persist 60s · clear below 62°C',
  repeatLine: 'Repeat every 15 min until acknowledged',
  recipient: 'operator@demo.example',
  masterNotifications: 'on',
};

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const formatNumber = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

// Builds the summary lines from the data passed by the earlier steps
const buildSummary = (params = {}) => {
  const config = params.alertConfig;

  const location = params.location || DEMO.location;
  const deviceModel = params.deviceModel || params.product?.['Device Name'] || DEMO.deviceModel;

  let highLines = DEMO.highLines;
  let lowLine = DEMO.lowLine;
  let persistenceLine = DEMO.persistenceLine;
  let repeatLine = DEMO.repeatLine;

  if (config) {
    // High limit(s)
    if (config.high) {
      if (config.mode === 'individual') {
        highLines = Object.entries(config.high)
          .filter(([, v]) => isNum(v))
          .map(([probe, v]) => `${probe} high: at or above ${formatNumber(v)}°C`);
      } else if (isNum(config.high.all)) {
        highLines = [`High: at or above ${formatNumber(config.high.all)}°C`];
      }
    }

    // Low limit
    lowLine =
      config.low?.enabled && isNum(config.low.limit)
        ? `Low: at or below ${formatNumber(config.low.limit)}°C`
        : 'Low: disabled';

    // Behaviour
    const b = config.behaviour || {};
    const firstHigh = config.mode === 'individual' ? null : config.high?.all;

    const persistPart = isNum(b.persistence)
      ? `Persist ${formatNumber(b.persistence)} reading${b.persistence === 1 ? '' : 's'}`
      : 'Persist as configured';
    const clearPart =
      isNum(firstHigh) && isNum(b.resetMargin)
        ? ` · clear below ${formatNumber(firstHigh - b.resetMargin)}°C`
        : isNum(b.resetMargin)
        ? ` · ${formatNumber(b.resetMargin)}°C reset band`
        : '';
    persistenceLine = `${persistPart}${clearPart}`;

    repeatLine = isNum(b.repeatEveryMinutes)
      ? `Repeat every ${formatNumber(b.repeatEveryMinutes)} min until acknowledged`
      : DEMO.repeatLine;
  }

  return {
    location,
    deviceModel,
    probes: DEMO.probes,
    highLines,
    lowLine,
    persistenceLine,
    repeatLine,
    recipient: params.recipientEmail || DEMO.recipient,
    masterNotifications: params.masterNotificationsOn === false ? 'off' : DEMO.masterNotifications,
  };
};

const Section = ({ title, lines, styles, last }) => (
  <View style={[styles.section, last && styles.sectionLast]}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {lines.map((line, i) => (
      <Text key={`${title}-${i}`} style={styles.sectionLine}>
        {line}
      </Text>
    ))}
  </View>
);

const Reviewbeforeapplying = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets), [insets]);

  const summary = useMemo(() => buildSummary(route?.params), [route?.params]);

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

  const onApply = () => {
    // TODO: change 'Applyconfiguration' to the actual route name of the next step
    navigation.navigate('Applyconfiguration', {
      ...(route?.params || {}),
    });
  };

  const onEditRule = () => {
    // Go back to the alert rule screen (step 4)
    navigation.navigate('Setclearalertlimits', { ...(route?.params || {}) });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.canGoBack() && navigation.goBack()}>
            <Feather name="arrow-left" size={22} color="#333" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            IntelliTemp <Text style={styles.headerSubtitleText}>4P</Text>
          </Text>
        </View>

        <Image
          source={require('../assests/images/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        <Text style={styles.stepSubtitle}>STEP 4 OF 6 · SET ALERTS</Text>
        <Text style={styles.stepTitle}>Review, then apply.</Text>
        <Text style={styles.stepDescription}>No device settings change until you confirm.</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Section
            title="INSTALLATION"
            lines={[summary.location, `${summary.deviceModel} · ${summary.probes}`]}
            styles={styles}
          />
          <Section
            title="TEMPERATURE RULE"
            lines={[...summary.highLines, summary.lowLine]}
            styles={styles}
          />
          <Section
            title="HIGH-ALERT BEHAVIOUR"
            lines={[summary.persistenceLine, summary.repeatLine]}
            styles={styles}
          />
          <Section
            title="RECIPIENT"
            lines={[
              summary.recipient,
              `Account master notifications: ${summary.masterNotifications}`,
            ]}
            styles={styles}
            last
          />
        </View>

        {/* Hint card */}
        <View style={styles.hintCard}>
          <Feather name="file" size={16} color="#8B2A8B" style={styles.hintIcon} />
          <Text style={styles.hintText}>
            The app must wait for the device to acknowledge the applied configuration.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onApply}>
          <Text style={styles.primaryActionButtonText}>Apply to IntelliTemp</Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryActionButton}
          activeOpacity={0.7}
          onPress={onEditRule}>
          <Text style={styles.secondaryActionButtonText}>Edit rule</Text>
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

export default Reviewbeforeapplying;

const createStyles = (insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F7F7FA',
    },

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 12),
      paddingBottom: 14,
      backgroundColor: '#FFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F5',
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
      color: '#1C1C1E',
    },
    headerSubtitleText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#8E8E93',
    },
    brandLogo: {
      width: 90,
      height: 24,
    },

    /* Content */
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    stepProgressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    stepBar: {
      flex: 1,
      height: 4,
      backgroundColor: '#E5E5EA',
      borderRadius: 2,
      marginRight: 8,
    },
    stepBarActive: {
      backgroundColor: '#8B2A8B',
    },
    stepSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#8B2A8B',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: '#111827',
      letterSpacing: -0.5,
    },
    stepDescription: {
      fontSize: 15,
      color: '#6B7280',
      marginTop: 4,
      marginBottom: 22,
    },

    /* Summary card */
    summaryCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 16,
    },
    section: {
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#EDEDF0',
    },
    sectionLast: {
      borderBottomWidth: 0,
    },
    sectionTitle: {
      fontSize: 12,
      color: '#9CA3AF',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    sectionLine: {
      fontSize: 13.5,
      lineHeight: 21,
      color: '#1F2937',
    },

    /* Hint card */
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F3EFF6',
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
    },
    hintIcon: {
      marginRight: 10,
      marginTop: 1,
    },
    hintText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: '#6B7280',
    },

    /* Footer */
    bottomFooterSheet: {
      backgroundColor: '#FFF',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Math.max(insets.bottom, 16),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderTopColor: '#F0F0F5',
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#8B2A8B',
      borderRadius: 14,
      paddingVertical: 16,
      gap: 8,
    },
    primaryActionButtonText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryActionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 10,
    },
    secondaryActionButtonText: {
      color: '#8B2A8B',
      fontSize: 15,
      fontWeight: '700',
    },
    brandFooterRow: {
      alignItems: 'center',
      marginTop: 14,
    },
    brandFooterText: {
      fontSize: 12,
      color: '#6E6577',
    },
    brandFooterBold: {
      fontWeight: '800',
      color: '#7B2B75',
      letterSpacing: 1.2,
    },
  });