import React, { useState, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;
const PROBES = [
  { id: 'T1', name: 'Ambient air' },
  { id: 'T2', name: 'Cooling block' },
  { id: 'T3', name: 'Exhaust duct' },
  { id: 'T4', name: 'Enclosure surface' },
];

const DEFAULT_HIGH_LIMIT = '65';
const DEFAULT_LOW_LIMIT = '15';

const toNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(String(value).trim());
};

const Setclearalertlimits = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets), [insets]);

  // High-temperature alert limits
  const [highLimit, setHighLimit] = useState(DEFAULT_HIGH_LIMIT);

  // Low-temperature alert (optional)
  const [lowEnabled, setLowEnabled] = useState(false);
  const [lowLimit, setLowLimit] = useState(DEFAULT_LOW_LIMIT);

  // Persistence, reset & repeat behaviour
  const [showBehaviour, setShowBehaviour] = useState(false);
  const [persistence, setPersistence] = useState('1');
  const [resetMargin, setResetMargin] = useState('3.0');
  const [repeatEvery, setRepeatEvery] = useState('30');

  // Hide tab bar for this screen
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

  // Temperature Input Component with Stepper Arrows
  const TemperatureInput = ({ value, onChangeText, style }) => {
    const handleIncrement = () => {
      const num = toNumber(value);
      const nextVal = Number.isNaN(num) ? 1 : num + 1;
      onChangeText(String(nextVal));
    };

    const handleDecrement = () => {
      const num = toNumber(value);
      const nextVal = Number.isNaN(num) ? -1 : num - 1;
      onChangeText(String(nextVal));
    };

    return (
      <View style={[styles.limitInputWrap, style]}>
        <TextInput
          style={styles.limitInput}
          value={value}
          onChangeText={onChangeText}
          keyboardType="numbers-and-punctuation"
          placeholder="0"
          placeholderTextColor="#A1A1AA"
        />
        <View style={styles.stepperContainer}>
          <TouchableOpacity style={styles.stepperButton} onPress={handleIncrement} activeOpacity={0.6}>
            <Feather name="chevron-up" size={14} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.stepperButton} onPress={handleDecrement} activeOpacity={0.6}>
            <Feather name="chevron-down" size={14} color="#8E8E93" />
          </TouchableOpacity>
        </View>
        <Text style={styles.unitText}>°C</Text>
      </View>
    );
  };

  const onContinue = () => {
    if (Number.isNaN(toNumber(highLimit))) {
      Alert.alert('Validation Error', 'Please enter a valid high limit.');
      return;
    }

    if (lowEnabled) {
      const low = toNumber(lowLimit);
      const high = toNumber(highLimit);
      if (Number.isNaN(low)) {
        Alert.alert('Validation Error', 'Please enter a valid low limit.');
        return;
      }
      if (low >= high) {
        Alert.alert('Validation Error', 'The low limit must be below the high limit.');
        return;
      }
    }

    const alertConfig = {
      mode: 'group',
      high: { all: toNumber(highLimit) },
      low: lowEnabled ? { enabled: true, limit: toNumber(lowLimit) } : { enabled: false },
      behaviour: {
        persistence: toNumber(persistence),
        resetMargin: toNumber(resetMargin),
        repeatEveryMinutes: toNumber(repeatEvery),
      },
    };

    navigation.navigate('Choosealertrecipients', {
      ...(route?.params || {}),
      alertConfig,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
        keyboardShouldPersistTaps="handled"
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

        <Text style={styles.stepSubtitle}>STEP 4 OF 6 · SET ALERTS</Text>

        {/* Rule Mode Toggle Segment */}
        <View style={styles.segmented}>
          <TouchableOpacity style={[styles.segmentTab, styles.segmentTabActive]} activeOpacity={0.8}>
            <Text style={[styles.segmentText, styles.segmentTextActive]}>Group rule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.segmentTab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Individualoverride', { highLimit })}>
            <Text style={styles.segmentText}>Individual override</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepTitle}>Make every rule explicit.</Text>
        <Text style={styles.stepDescription}>Choose the affected probes and the condition.</Text>

        {/* High-temperature alert */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>High-temperature alert</Text>
            <View style={styles.enabledBadge}>
              <Text style={styles.enabledBadgeText}>Enabled</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>Trigger when a valid reading is at or above:</Text>

          <Text style={styles.inputLabel}>High limit</Text>
          <TemperatureInput value={highLimit} onChangeText={setHighLimit} />

          <View style={styles.chipRow}>
            {PROBES.map((probe) => (
              <View key={probe.id} style={styles.chip}>
                <Text style={styles.chipText}>{probe.id}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.appliesText}>Applies to all four temperature inputs.</Text>
        </View>

        {/* Low-temperature alert */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.lowTextWrap}>
              <Text style={styles.cardTitle}>Low-temperature alert</Text>
              <Text style={styles.cardSubtitle}>
                {lowEnabled
                  ? 'At or below the configured low limit.'
                  : 'Optional. Disabled for this example.'}
              </Text>
            </View>
            <Switch
              value={lowEnabled}
              onValueChange={setLowEnabled}
              trackColor={{ false: '#D1D5DB', true: '#C98BC9' }}
              thumbColor={lowEnabled ? '#8B2A8B' : '#FFFFFF'}
            />
          </View>

          {lowEnabled && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.inputLabel}>Low limit</Text>
              <TemperatureInput value={lowLimit} onChangeText={setLowLimit} />
            </View>
          )}
        </View>

        {/* Persistence, reset & repeat behaviour link */}
        <TouchableOpacity
          style={styles.behaviourLink}
          activeOpacity={0.7}
          onPress={() => setShowBehaviour((prev) => !prev)}>
          <Text style={styles.behaviourLinkText}>Persistence, reset &amp; repeat behaviour</Text>
          <Feather
            name={showBehaviour ? 'chevron-down' : 'chevron-right'}
            size={16}
            color="#8B2A8B"
          />
        </TouchableOpacity>

        {showBehaviour && (
          <View style={styles.card}>
            <View style={styles.behaviourRow}>
              <View style={styles.behaviourTextWrap}>
                <Text style={styles.behaviourTitle}>Persistence</Text>
                <Text style={styles.behaviourHint}>Consecutive valid readings before alerting</Text>
              </View>
              <TextInput
                style={styles.behaviourInput}
                value={persistence}
                onChangeText={setPersistence}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.behaviourRow}>
              <View style={styles.behaviourTextWrap}>
                <Text style={styles.behaviourTitle}>Reset margin (°C)</Text>
                <Text style={styles.behaviourHint}>How far back inside the limit to clear</Text>
              </View>
              <TextInput
                style={styles.behaviourInput}
                value={resetMargin}
                onChangeText={setResetMargin}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.behaviourRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.behaviourTextWrap}>
                <Text style={styles.behaviourTitle}>Repeat every (min)</Text>
                <Text style={styles.behaviourHint}>While the condition remains active</Text>
              </View>
              <TextInput
                style={styles.behaviourInput}
                value={repeatEvery}
                onChangeText={setRepeatEvery}
                keyboardType="numeric"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Sheet */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onContinue}>
          <Text style={styles.primaryActionButtonText}>Choose recipients</Text>
          <Feather name="arrow-right" size={18} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.brandFooterRow}>
          <Text style={styles.brandFooterText}>
            Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Setclearalertlimits;

const createStyles = (insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F7F7FA',
    },
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
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 24,
    },
    stepProgressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
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
      fontSize: 14.5,
      color: '#6B7280',
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 20,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: '#EFEFF3',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 3,
      marginBottom: 16,
    },
    segmentTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 9,
    },
    segmentTabActive: {
      backgroundColor: '#FFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    segmentText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: '#6B7280',
    },
    segmentTextActive: {
      color: '#8B2A8B',
    },
    card: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 16,
      marginBottom: 14,
    },
    cardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: '#111827',
    },
    cardSubtitle: {
      fontSize: 12.5,
      color: '#9CA3AF',
      marginTop: 2,
      marginBottom: 12,
    },
    enabledBadge: {
      backgroundColor: '#F3E1F3',
      borderRadius: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    enabledBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8B2A8B',
    },
    lowTextWrap: {
      flex: 1,
      marginRight: 12,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 8,
    },
    limitInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
    },
    limitInput: {
      flex: 1,
      fontSize: 15,
      color: '#111827',
      padding: 0,
    },
    stepperContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    stepperButton: {
      paddingVertical: 1,
      paddingHorizontal: 4,
    },
    unitText: {
      fontSize: 13,
      color: '#6B7280',
    },
    chipRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    chip: {
      backgroundColor: '#F5E6F5',
      borderRadius: 6,
      paddingHorizontal: 11,
      paddingVertical: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: {
      fontSize: 11.5,
      fontWeight: '700',
      color: '#8B2A8B',
    },
    appliesText: {
      fontSize: 12.5,
      color: '#6B7280',
      marginTop: 12,
    },
    behaviourLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 6,
      marginBottom: 14,
    },
    behaviourLinkText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#8B2A8B',
    },
    behaviourRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingBottom: 14,
      marginBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#EDEDF0',
    },
    behaviourTextWrap: {
      flex: 1,
      marginRight: 12,
    },
    behaviourTitle: {
      fontSize: 13.5,
      fontWeight: '600',
      color: '#111827',
    },
    behaviourHint: {
      fontSize: 12,
      color: '#9CA3AF',
      marginTop: 2,
    },
    behaviourInput: {
      width: 64,
      height: 40,
      textAlign: 'center',
      fontSize: 14,
      color: '#111827',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 10,
      padding: 0,
    },
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