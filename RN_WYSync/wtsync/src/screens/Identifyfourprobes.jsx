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
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { updateDraft } from '../services/installationDraft';

/* ---------- Theme palettes (light = original colours, dark = new) ---------- */
const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFF',
  border: '#E5E7EB',
  divider: '#EDEDF0',
  footerBorder: '#F0F0F5',
  backIcon: '#333',
  title: '#1C1C1E',
  titleSub: '#8E8E93',
  text: '#111827',
  sub: '#6B7280',
  muted: '#9CA3AF',
  placeholder: '#A1A1AA',
  inputLine: '#D1D5DB',
  accent: '#8B2A8B',
  onAccent: '#FFF',
  stepOff: '#E5E5EA',
  chip: '#F5E6F5',
  hint: '#F3EFF6',
  badge: '#EDEDF0',
  okIcon: '#15803D',
  warnIcon: '#D97706',
  brandText: '#6E6577',
  brandBold: '#7B2B75',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  divider: '#3A3540',
  footerBorder: '#2E2A33',
  backIcon: '#FFFFFF',
  title: '#FFFFFF',
  titleSub: '#E5A0DC',
  text: '#F4F4F5',
  sub: '#A1A1AA',
  muted: '#A1A1AA',
  placeholder: '#71717A',
  inputLine: '#4B4651',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  chip: '#3A2A3A',
  hint: '#2A2430',
  badge: '#332F38',
  okIcon: '#4ADE80',
  warnIcon: '#FBBF24',
  brandText: '#A1A1AA',
  brandBold: '#E5A0DC',
};

const TOTAL_STEPS = 6;
const CURRENT_STEP = 3;

const DEFAULT_LABELS = [
  'Incomer R phase',
  'Incomer Y phase',
  'Incomer B phase',
  'Enclosure surface',
];

const Identifyfourprobes = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  // Optional: pass `probeLabels` (array of 4 strings) and `detectedProbes`
  // (array of 4 booleans) from the previous step / device when available.
  const initialLabels = route?.params?.probeLabels || DEFAULT_LABELS;
  const detectedProbes = route?.params?.detectedProbes || [true, true, true, true];

  const [labels, setLabels] = useState(initialLabels);

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

  const updateLabel = (index, value) => {
    setLabels((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const onContinue = () => {
    const emptyIndex = labels.findIndex((label) => !label.trim());
    if (emptyIndex !== -1) {
      Alert.alert('Validation Error', `Please enter a label for T${emptyIndex + 1}.`);
      return;
    }

    // Save for the backend call on the Review screen
    updateDraft({ probeLabels: labels.map((label) => label.trim()) });

    navigation.navigate('Checkfirstreadings', {
      ...(route?.params || {}),
      probeLabels: labels.map((label) => label.trim()),
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
            <Feather name="arrow-left" size={22} color={t.backIcon} />
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

        <Text style={styles.stepSubtitle}>STEP 3 OF 6 · IDENTIFY SENSORS</Text>
        <Text style={styles.stepTitle}>Match labels to real points.</Text>
        <Text style={styles.stepDescription}>
          Keep the physical input ID beside each friendly name.
        </Text>

        {/* Probe labels card */}
        <View style={styles.probeCard}>
          {labels.map((label, index) => {
            const detected = detectedProbes[index] !== false;
            const isLast = index === labels.length - 1;

            return (
              <View key={index} style={[styles.probeRow, isLast && styles.probeRowLast]}>
                <View style={styles.probeChip}>
                  <Text style={styles.probeChipText}>{`T${index + 1}`}</Text>
                </View>

                <View style={styles.probeContent}>
                  <TextInput
                    style={styles.probeInput}
                    value={label}
                    onChangeText={(text) => updateLabel(index, text)}
                    placeholder="Enter a friendly name"
                    placeholderTextColor={t.placeholder}
                    returnKeyType="done"
                  />
                  <Text style={styles.probeStatusText}>
                    {`Temperature input ${index + 1} · ${
                      detected ? 'probe detected' : 'no probe detected'
                    }`}
                  </Text>
                </View>

                <Feather
                  name={detected ? 'check' : 'alert-circle'}
                  size={16}
                  color={detected ? t.okIcon : t.warnIcon}
                />
              </View>
            );
          })}
        </View>

        {/* Hint card */}
        <View style={styles.hintCard}>
          <Feather name="map-pin" size={16} color={t.accent} style={styles.hintIcon} />
          <Text style={styles.hintText}>
            Confirm each label against the installed probe. A friendly name never replaces
            the T1–T4 identity.
          </Text>
        </View>

        {/* External humidity card */}
        {/* <View style={styles.humidityCard}>
          <View style={styles.humidityTopRow}>
            <Text style={styles.humidityTitle}>External humidity</Text>
            <View style={styles.notFittedBadge}>
              <Text style={styles.notFittedText}>Not fitted</Text>
            </View>
          </View>
          <Text style={styles.humidityDesc}>
            Optional RH is shown separately, only when a supported customer-facing probe is
            fitted.
          </Text>
        </View> */}
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onContinue}>
          <Text style={styles.primaryActionButtonText}>Check first readings</Text>
          <Feather name="arrow-right" size={18} color={t.onAccent} />
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

export default Identifyfourprobes;

const createStyles = (t, insets) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 12),
      paddingBottom: 14,
      backgroundColor: t.bg,
      borderBottomWidth: 1,
      borderBottomColor: t.footerBorder,
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
      color: t.title,
    },
    headerSubtitleText: {
      fontSize: 14,
      fontWeight: '600',
      color: t.titleSub,
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
      backgroundColor: t.stepOff,
      borderRadius: 2,
      marginRight: 8,
    },
    stepBarActive: {
      backgroundColor: t.accent,
    },
    stepSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: t.accent,
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    stepTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: t.text,
      letterSpacing: -0.5,
    },
    stepDescription: {
      fontSize: 15,
      color: t.sub,
      marginTop: 4,
      marginBottom: 24,
    },

    /* Probe card */
    probeCard: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 14,
    },
    probeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    probeRowLast: {
      borderBottomWidth: 0,
    },
    probeChip: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: t.chip,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    probeChipText: {
      fontSize: 11,
      fontWeight: '800',
      color: t.accent,
    },
    probeContent: {
      flex: 1,
      marginRight: 10,
    },
    probeInput: {
      fontSize: 14.5,
      fontWeight: '500',
      color: t.text,
      paddingVertical: 4,
      paddingHorizontal: 0,
      borderBottomWidth: 1,
      borderBottomColor: t.inputLine,
    },
    probeStatusText: {
      fontSize: 12,
      color: t.muted,
      marginTop: 5,
    },

    /* Hint card */
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: t.hint,
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
      color: t.sub,
    },

    /* External humidity card */
    humidityCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      marginTop: 16,
    },
    humidityTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    humidityTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: t.text,
    },
    notFittedBadge: {
      backgroundColor: t.badge,
      borderRadius: 6,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    notFittedText: {
      fontSize: 12,
      fontWeight: '500',
      color: t.sub,
    },
    humidityDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      color: t.sub,
    },

    /* Footer */
    bottomFooterSheet: {
      backgroundColor: t.surface,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Math.max(insets.bottom, 16),
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderTopWidth: 1,
      borderTopColor: t.footerBorder,
    },
    primaryActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.accent,
      borderRadius: 14,
      paddingVertical: 16,
      gap: 8,
    },
    primaryActionButtonText: {
      color: t.onAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    brandFooterRow: {
      alignItems: 'center',
      marginTop: 14,
    },
    brandFooterText: {
      fontSize: 12,
      color: t.brandText,
    },
    brandFooterBold: {
      fontWeight: '800',
      color: t.brandBold,
      letterSpacing: 1.2,
    },
  });