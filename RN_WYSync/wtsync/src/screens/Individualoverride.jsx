import React, { useState, useLayoutEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

import { getDraft, updateDraft } from '../services/installationDraft';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;
const PROBES = [
  { id: 'T1', name: 'Ambient air' },
  { id: 'T2', name: 'Cooling block' },
  { id: 'T3', name: 'Exhaust duct' },
  { id: 'T4', name: 'Enclosure surface' },
];

// ---------- Themes ----------
const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFC',
  chip: '#EFEFF3',
  border: '#E5E7EB',
  divider: '#F0F0F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  label: '#374151',
  icon: '#333333',
  stepper: '#8E8E93',
  placeholder: '#A1A1AA',
  accent: '#8B2A8B',
  accentSoft: '#F5E6F5',
  accentSoft2: '#F3E1F3',
  onAccent: '#FFFFFF',
  stepBar: '#E5E5EA',
  segmentActiveBg: '#FFFFFF',
  footerText: '#6E6577',
  footerBrand: '#7B2B75',
  shadow: '#000',
};

const DARK = {
  bg: '#17151B',
  surface: '#232027',
  surfaceAlt: '#2B2830',
  chip: '#2B2830',
  border: '#3A3640',
  divider: '#2E2B33',
  textPrimary: '#FFFFFF',
  textSecondary: '#A9A3B3',
  textMuted: '#8F8999',
  label: '#E5E1EA',
  icon: '#FFFFFF',
  stepper: '#A9A3B3',
  placeholder: '#6E6877',
  accent: '#E6A8E1',
  accentSoft: '#3A2C3C',
  accentSoft2: '#3A2C3C',
  onAccent: '#1C1A20',
  stepBar: '#3A3640',
  segmentActiveBg: '#3A3640',
  footerText: '#A9A3B3',
  footerBrand: '#E6A8E1',
  shadow: '#000',
};

const toNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(String(value).trim());
};

// Temperature Input Component defined OUTSIDE the parent component
const TemperatureInput = ({ value, onChangeText, style, styles, colors, scheme }) => {
  const handleIncrement = () => {
    const num = toNumber(value);
    onChangeText(String(Number.isNaN(num) ? 1 : num + 1));
  };

  const handleDecrement = () => {
    const num = toNumber(value);
    onChangeText(String(Number.isNaN(num) ? -1 : num - 1));
  };

  return (
    <View style={[styles.limitInputWrap, style]}>
      <TextInput
        style={styles.limitInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numbers-and-punctuation"
        placeholder="0"
        placeholderTextColor={colors.placeholder}
        keyboardAppearance={scheme === 'dark' ? 'dark' : 'light'}
      />
      <View style={styles.stepperContainer}>
        <TouchableOpacity style={styles.stepperButton} onPress={handleIncrement} activeOpacity={0.6}>
          <Feather name="chevron-up" size={14} color={colors.stepper} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.stepperButton} onPress={handleDecrement} activeOpacity={0.6}>
          <Feather name="chevron-down" size={14} color={colors.stepper} />
        </TouchableOpacity>
      </View>
      <Text style={styles.unitText}>°C</Text>
    </View>
  );
};

const Individualoverride = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme(); // follows phone setting
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(insets, colors), [insets, colors]);

  const groupHighLimit = route?.params?.highLimit || getDraft().alertForm?.highLimit || '65';
  const [selectedProbeIndex, setSelectedProbeIndex] = useState(3); // Default T4 (index 3)

  // Load existing overrides from installationDraft, falling back to '60'
  const loadSavedOverrides = () => {
    const savedOverrides = getDraft().overrides || {};
    return PROBES.map((probe) => String(savedOverrides[probe.id] ?? '60'));
  };

  const [individualHigh, setIndividualHigh] = useState(loadSavedOverrides);

  // Sync with draft state whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      setIndividualHigh(loadSavedOverrides());
    }, [])
  );

  const resetMargin = '3.0';

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

  const updateIndividualHigh = (index, value) => {
    setIndividualHigh((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const currentProbe = PROBES[selectedProbeIndex];
  const currentIndividualValue = individualHigh[selectedProbeIndex];

  const handleRemoveOverride = () => {
    updateIndividualHigh(selectedProbeIndex, groupHighLimit);

    // Remove override entry for this probe in the draft store
    const existingOverrides = { ...(getDraft().overrides || {}) };
    delete existingOverrides[currentProbe.id];
    updateDraft({ overrides: existingOverrides });

    Alert.alert(
      'Override Removed',
      `${currentProbe.id} will now use the group limit (${groupHighLimit}°C).`
    );
  };

  const onSaveOverride = () => {
    const badIndex = individualHigh.findIndex((v) => Number.isNaN(toNumber(v)));
    if (badIndex !== -1) {
      Alert.alert('Validation Error', `Please enter a valid high limit for ${PROBES[badIndex].id}.`);
      return;
    }

    // Persist all current overrides to the installation draft store
    const updatedOverrides = { ...(getDraft().overrides || {}) };
    PROBES.forEach((probe, idx) => {
      const val = individualHigh[idx];
      if (val !== undefined && val !== null && val !== '') {
        updatedOverrides[probe.id] = toNumber(val);
      }
    });

    updateDraft({ overrides: updatedOverrides });

    Alert.alert('Saved', `${currentProbe.id} override updated successfully.`, [
      {
        text: 'OK',
        onPress: () => navigation.navigate('Setclearalertlimits'),
      },
    ]);
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
            <Feather name="arrow-left" size={22} color={colors.icon} />
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
          <TouchableOpacity
            style={styles.segmentTab}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Setclearalertlimits')}>
            <Text style={styles.segmentText}>Group rule</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.segmentTab, styles.segmentTabActive]} activeOpacity={0.8}>
            <Text style={[styles.segmentText, styles.segmentTextActive]}>Individual override</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.stepTitle}>A rule for one probe.</Text>
        <Text style={styles.stepDescription}>
          An individual rule takes precedence only for the selected input.
        </Text>

        {/* Probe Selector Chips */}
        <View style={styles.probeSelectorRow}>
          {PROBES.map((probe, idx) => (
            <TouchableOpacity
              key={probe.id}
              style={[
                styles.probeSelectorChip,
                selectedProbeIndex === idx && styles.probeSelectorChipActive,
              ]}
              onPress={() => setSelectedProbeIndex(idx)}>
              <Text
                style={[
                  styles.probeSelectorChipText,
                  selectedProbeIndex === idx && styles.probeSelectorChipTextActive,
                ]}>
                {probe.id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Individual Probe Card */}
        <View style={styles.individualCard}>
          <View style={styles.individualCardTopRow}>
            <View style={styles.probeBadge}>
              <Text style={styles.probeBadgeText}>{currentProbe.id}</Text>
            </View>

            <View style={styles.probeNameContainer}>
              <Text style={styles.probeNameText}>{currentProbe.name}</Text>
              <Text style={styles.groupLimitText}>Group high limit: {groupHighLimit}°C</Text>
            </View>

            <View style={styles.individualBadge}>
              <Text style={styles.individualBadgeText}>Individual</Text>
            </View>
          </View>
        </View>

        {/* Individual High Limit Field */}
        <View style={styles.individualInputSection}>
          <Text style={styles.inputLabelBold}>Individual high limit</Text>
          <TemperatureInput
            value={currentIndividualValue}
            onChangeText={(val) => updateIndividualHigh(selectedProbeIndex, val)}
            styles={styles}
            colors={colors}
            scheme={scheme}
          />
        </View>
      </ScrollView>

      {/* Footer Sheet */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onSaveOverride}>
          <Text style={styles.primaryActionButtonText}>Save {currentProbe.id} override</Text>
          <Feather name="arrow-right" size={18} color={colors.onAccent} />
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

export default Individualoverride;

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
    headerSubtitleText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSecondary,
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
      backgroundColor: c.stepBar,
      borderRadius: 2,
      marginRight: 8,
    },
    stepBarActive: {
      backgroundColor: c.accent,
    },
    stepSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: c.accent,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    stepDescription: {
      fontSize: 14.5,
      color: c.textSecondary,
      marginTop: 6,
      marginBottom: 20,
      lineHeight: 20,
    },
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.chip,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
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
      backgroundColor: c.segmentActiveBg,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    segmentText: {
      fontSize: 13.5,
      fontWeight: '600',
      color: c.textSecondary,
    },
    segmentTextActive: {
      color: c.accent,
    },
    probeSelectorRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    probeSelectorChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.chip,
    },
    probeSelectorChipActive: {
      backgroundColor: c.accent,
    },
    probeSelectorChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
    },
    probeSelectorChipTextActive: {
      color: c.onAccent,
    },
    individualCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 16,
    },
    individualCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    probeBadge: {
      backgroundColor: c.accentSoft,
      borderRadius: 10,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    probeBadgeText: {
      fontSize: 15,
      fontWeight: '800',
      color: c.accent,
    },
    probeNameContainer: {
      flex: 1,
    },
    probeNameText: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
    },
    groupLimitText: {
      fontSize: 13,
      color: c.textMuted,
      marginTop: 2,
    },
    individualBadge: {
      backgroundColor: c.accentSoft2,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    individualBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.accent,
    },
    individualInputSection: {
      marginBottom: 16,
    },
    inputLabelBold: {
      fontSize: 13.5,
      fontWeight: '600',
      color: c.label,
      marginBottom: 8,
    },
    limitInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
    },
    limitInput: {
      flex: 1,
      fontSize: 15,
      color: c.textPrimary,
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
      color: c.textSecondary,
    },
    branchBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    branchIcon: {
      width: 22,
      height: 22,
      marginRight: 12,
      marginTop: 0,
    },
    branchText: {
      flex: 1,
      fontSize: 13.5,
      color: c.textSecondary,
      lineHeight: 19,
    },
    removeOverrideButton: {
      marginBottom: 20,
    },
    removeOverrideText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.accent,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    infoIcon: {
      marginRight: 12,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 13.5,
      color: c.textSecondary,
      lineHeight: 19,
    },
    bottomFooterSheet: {
      backgroundColor: c.surface,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Math.max(insets.bottom, 16),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 16,
      gap: 8,
    },
    primaryActionButtonText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    brandFooterRow: {
      alignItems: 'center',
      marginTop: 14,
    },
    brandFooterText: {
      fontSize: 12,
      color: c.footerText,
    },
    brandFooterBold: {
      fontWeight: '800',
      color: c.footerBrand,
      letterSpacing: 1.2,
    },
  });