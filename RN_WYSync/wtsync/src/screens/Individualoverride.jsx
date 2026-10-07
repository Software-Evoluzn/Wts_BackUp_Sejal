import React, { useState, useLayoutEffect, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

// Split-arrow icon embedded as base64, so no image file needs to be added to the project
const BRANCH_SPLIT_ICON =
  'data:image/png;base64,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';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;
const PROBES = [
  { id: 'T1', name: 'Ambient air' },
  { id: 'T2', name: 'Cooling block' },
  { id: 'T3', name: 'Exhaust duct' },
  { id: 'T4', name: 'Enclosure surface' },
];

const toNumber = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return NaN;
  return Number(String(value).trim());
};

const Individualoverride = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets), [insets]);

  const groupHighLimit = route?.params?.highLimit || '65';
  const [selectedProbeIndex, setSelectedProbeIndex] = useState(3); // Default T4 (index 3)

  const [individualHigh, setIndividualHigh] = useState(
    PROBES.map(() => '60')
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

  const handleRemoveOverride = () => {
    updateIndividualHigh(selectedProbeIndex, groupHighLimit);
    Alert.alert(
      'Override Removed',
      `${PROBES[selectedProbeIndex].id} will now use the group limit (${groupHighLimit}°C).`
    );
  };

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

  const currentProbe = PROBES[selectedProbeIndex];
  const currentIndividualValue = individualHigh[selectedProbeIndex];

  const onSaveOverride = () => {
    const badIndex = individualHigh.findIndex((v) => Number.isNaN(toNumber(v)));
    if (badIndex !== -1) {
      Alert.alert(
        'Validation Error',
        `Please enter a valid high limit for ${PROBES[badIndex].id}.`
      );
      return;
    }

    Alert.alert(
      'Saved',
      `${currentProbe.id} override updated successfully.`,
      [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Setclearalertlimits'),
        },
      ]
    );
  };

  const remainingProbesText = useMemo(() => {
    const otherProbes = PROBES.filter((_, idx) => idx !== selectedProbeIndex).map((p) => p.id);
    if (otherProbes.length === 0) return '';
    return `${otherProbes[0]}–${otherProbes[otherProbes.length - 1]}`;
  }, [selectedProbeIndex]);

  const clearThreshold = useMemo(() => {
    const currentVal = toNumber(currentIndividualValue);
    const margin = toNumber(resetMargin);
    if (Number.isNaN(currentVal) || Number.isNaN(margin)) return '57.0';
    return (currentVal - margin).toFixed(1);
  }, [currentIndividualValue]);

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
          />
        </View>

        {/* Sync Warning Banner */}
        <View style={styles.branchBanner}>
          <Image
            source={{ uri: BRANCH_SPLIT_ICON }}
            style={styles.branchIcon}
            resizeMode="contain"
          />
          <Text style={styles.branchText}>
            Saving this override changes {currentProbe.id} only. {remainingProbesText} keep the
            group rule.
          </Text>
        </View>

        {/* Remove Override Button Link */}
        <TouchableOpacity
          style={styles.removeOverrideButton}
          activeOpacity={0.7}
          onPress={handleRemoveOverride}>
          <Text style={styles.removeOverrideText}>Remove override and use group rule</Text>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Feather name="info" size={18} color="#8B2A8B" style={styles.infoIcon} />
          <Text style={styles.infoText}>
            {currentProbe.id} clears below {clearThreshold}°C: a {resetMargin}°C reset band.
            Persistence and repeat follow the group rule.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Sheet */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onSaveOverride}>
          <Text style={styles.primaryActionButtonText}>
            Save {currentProbe.id} override
          </Text>
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

export default Individualoverride;

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
    probeSelectorRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    probeSelectorChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: '#EFEFF3',
    },
    probeSelectorChipActive: {
      backgroundColor: '#8B2A8B',
    },
    probeSelectorChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#6B7280',
    },
    probeSelectorChipTextActive: {
      color: '#FFF',
    },
    individualCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      padding: 16,
      marginBottom: 16,
    },
    individualCardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    probeBadge: {
      backgroundColor: '#F5E6F5',
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
      color: '#8B2A8B',
    },
    probeNameContainer: {
      flex: 1,
    },
    probeNameText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
    },
    groupLimitText: {
      fontSize: 13,
      color: '#9CA3AF',
      marginTop: 2,
    },
    individualBadge: {
      backgroundColor: '#F3E1F3',
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    individualBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#8B2A8B',
    },
    individualInputSection: {
      marginBottom: 16,
    },
    inputLabelBold: {
      fontSize: 13.5,
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
    branchBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FAFAFC',
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
      color: '#8E8E93',
      lineHeight: 19,
    },
    removeOverrideButton: {
      marginBottom: 20,
    },
    removeOverrideText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#8B2A8B',
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FAFAFC',
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
      color: '#8E8E93',
      lineHeight: 19,
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