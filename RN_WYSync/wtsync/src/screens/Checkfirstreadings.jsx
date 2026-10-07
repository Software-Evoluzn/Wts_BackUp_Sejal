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
const CURRENT_STEP = 3;

const DEFAULT_LABELS = [
  'Incomer R phase',
  'Incomer Y phase',
  'Incomer B phase',
  'Enclosure surface',
];

// Static demo data for now.
// Later: replace these with live values (see ReadingsApi.js).
const STATIC_READINGS = [42.8, 41.6, 42.1, 35.4];
const STATIC_SAMPLE_TIME = '14:00:00 IST';
const STATIC_RECEIVED_TEXT = 'Received 20 seconds ago';

const isValidReading = (value) =>
  typeof value === 'number' && Number.isFinite(value); // a genuine 0.0 is valid

const Checkfirstreadings = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets), [insets]);

  // Probe names come from the previous step (Identifyfourprobes)
  const labels = route?.params?.probeLabels || DEFAULT_LABELS;
  const readings = STATIC_READINGS;

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

  const validCount = readings.filter(isValidReading).length;
  const totalCount = labels.length;
  const allValid = validCount === totalCount;
  const sampleTime = STATIC_SAMPLE_TIME;

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
          {allValid
            ? 'Four probes. Four valid readings.'
            : `Four probes. ${validCount} valid reading${validCount === 1 ? '' : 's'}.`}
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
                    {valid ? `Valid sample · ${sampleTime}` : 'No valid sample'}
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
              color={allValid ? '#15803D' : '#B45309'}
            />
            <Text style={[styles.validBadgeText, !allValid && styles.validBadgeTextWarn]}>
              {`${validCount} / ${totalCount} valid`}
            </Text>
          </View>

          <View style={styles.receivedWrap}>
            <Feather name="clock" size={12} color="#9CA3AF" />
            <Text style={styles.receivedText}>{STATIC_RECEIVED_TEXT}</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.hintCard}>
          <Feather name="info" size={16} color="#8B2A8B" style={styles.hintIcon} />
          <Text style={styles.hintText}>
            A genuine 0.0°C is valid when reported by the sensor. Missing or invalid values
            are shown as —.
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
          <Feather name="arrow-right" size={18} color="#FFF" />
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
      marginBottom: 24,
    },

    /* Readings card */
    readingsCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 14,
    },
    readingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#EDEDF0',
    },
    readingRowLast: {
      borderBottomWidth: 0,
    },
    probeChip: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: '#F5E6F5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    probeChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#8B2A8B',
    },
    readingInfo: {
      flex: 1,
      marginRight: 10,
    },
    readingLabel: {
      fontSize: 14.5,
      fontWeight: '600',
      color: '#111827',
    },
    readingSub: {
      fontSize: 12,
      color: '#9CA3AF',
      marginTop: 4,
    },
    readingValueWrap: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    readingValue: {
      fontSize: 22,
      fontWeight: '600',
      color: '#111827',
    },
    readingUnit: {
      fontSize: 11,
      color: '#6B7280',
      marginTop: 4,
      marginLeft: 1,
    },

    /* Summary row */
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
    },
    validBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#DCFCE7',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    validBadgeWarn: {
      backgroundColor: '#FEF3C7',
    },
    validBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#15803D',
    },
    validBadgeTextWarn: {
      color: '#B45309',
    },
    receivedWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    receivedText: {
      fontSize: 12,
      color: '#9CA3AF',
    },


    /* Info card */
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F3EFF6',
      borderRadius: 12,
      padding: 14,
      marginTop: 18,
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