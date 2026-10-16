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
  optionDivider: '#F3F4F6',
  footerBorder: '#F0F0F5',
  backIcon: '#333',
  title: '#1C1C1E',
  titleSub: '#8E8E93',
  text: '#111827',
  label: '#374151',
  sub: '#6B7280',
  placeholder: '#A1A1AA',
  accent: '#8B2A8B',
  onAccent: '#FFF',
  stepOff: '#E5E5EA',
  hint: '#F3EFF6',
  brandText: '#6E6577',
  brandBold: '#7B2B75',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  border: '#3A3540',
  divider: '#3A3540',
  optionDivider: '#332F38',
  footerBorder: '#2E2A33',
  backIcon: '#FFFFFF',
  title: '#FFFFFF',
  titleSub: '#E5A0DC',
  text: '#F4F4F5',
  label: '#D4D4D8',
  sub: '#A1A1AA',
  placeholder: '#71717A',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  stepOff: '#3A3540',
  hint: '#2A2430',
  brandText: '#A1A1AA',
  brandBold: '#E5A0DC',
};

const APPLICATION_OPTIONS = [
  'Electrical Panel',
  'Motor or Machine',
  'Cold room',
  'Pharmaceutical storage',
  'Cleanroom',
];

const TOTAL_STEPS = 6;
const CURRENT_STEP = 3;

const getSiteTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return 'Asia/Kolkata · IST';
    return tz || 'Asia/Kolkata · IST';
  } catch (e) {
    return 'Asia/Kolkata · IST';
  }
};

const NametheInstallation = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();

  // Follows the phone's dark / light setting
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(t, insets), [t, insets]);

  // Passed from the previous step (device identification / setup)
  const product = route?.params?.product || null;
  const deviceModel =
    route?.params?.deviceModel ||
    product?.['Device Name'] ||
    product?.['Model No'] ||
    'IntelliTemp 4P';
  const siteTimezone = route?.params?.siteTimezone || getSiteTimezone();

  const [location, setLocation] = useState(route?.params?.location || '');
  const [application, setApplication] = useState(
    route?.params?.application || APPLICATION_OPTIONS[0]
  );
  const [showApplicationPicker, setShowApplicationPicker] = useState(false);

  // Hide tab bar for this screen (same as the registration screens)
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

  const onContinue = () => {
    if (!location.trim()) {
      Alert.alert('Validation Error', 'Please enter an installation location.');
      return;
    }

    // Save for the backend call on the Review screen
    updateDraft({ location: location.trim(), application, siteTimezone });

    navigation.navigate('Identifyfourprobes', {
      ...(route?.params || {}),
      product,
      deviceModel,
      location: location.trim(),
      application,
      siteTimezone,
    });
  };

  const handleApplicationSelect = (option) => {
    setApplication(option);
    setShowApplicationPicker(false);
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
        <Text style={styles.stepTitle}>Give this installation a name.</Text>
        <Text style={styles.stepDescription}>
          Use a location the on-site team will recognise.
        </Text>

        {/* Installation location */}
        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Installation location</Text>
          <TextInput
            style={styles.input}
            placeholder="Floor 3 · MCC-01"
            placeholderTextColor={t.placeholder}
            value={location}
            onChangeText={setLocation}
            returnKeyType="done"
          />
        </View>

        {/* Application */}
        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Application</Text>
          <TouchableOpacity
            style={[
              styles.dropdownTrigger,
              showApplicationPicker && styles.dropdownTriggerOpen,
            ]}
            activeOpacity={0.8}
            onPress={() => setShowApplicationPicker((prev) => !prev)}>
            <Text style={styles.dropdownTriggerText}>{application}</Text>
            <Feather
              name={showApplicationPicker ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={t.text}
            />
          </TouchableOpacity>

          {showApplicationPicker && (
            <View style={styles.dropdownList}>
              {APPLICATION_OPTIONS.map((option, index) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionRow,
                    index === APPLICATION_OPTIONS.length - 1 && styles.optionRowLast,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleApplicationSelect(option)}>
                  <Text
                    style={[
                      styles.optionText,
                      application === option && styles.optionTextSelected,
                    ]}>
                    {option}
                  </Text>
                  {application === option && (
                    <Feather name="check" size={16} color={t.accent} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Device info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device model</Text>
            <Text style={styles.infoValue}>{deviceModel}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Site timezone</Text>
            <Text style={styles.infoValue}>{siteTimezone}</Text>
          </View>
        </View>

        {/* Hint card */}
        <View style={styles.hintCard}>
          <Feather name="copy" size={16} color={t.accent} style={styles.hintIcon} />
          <Text style={styles.hintText}>
            Purchase and warranty records can be added later under Device details.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={onContinue}>
          <Text style={styles.primaryActionButtonText}>Identify probes</Text>
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

export default NametheInstallation;

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

    /* Fields */
    fieldGroup: {
      marginBottom: 18,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: t.label,
      marginBottom: 8,
    },
    input: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: t.text,
    },
    dropdownTrigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownTriggerText: {
      fontSize: 15,
      color: t.text,
      fontWeight: '500',
    },

    /* Info card */
    infoCard: {
      backgroundColor: t.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: t.border,
      paddingHorizontal: 16,
      marginTop: 4,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 13,
      color: t.sub,
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '700',
      color: t.text,
    },

    /* Hint card */
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: t.hint,
      borderRadius: 12,
      padding: 14,
      marginTop: 20,
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

    /* Inline application dropdown */
    dropdownTriggerOpen: {
      borderColor: t.accent,
    },
    dropdownList: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 12,
      marginTop: 6,
      paddingHorizontal: 16,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.optionDivider,
    },
    optionRowLast: {
      borderBottomWidth: 0,
    },
    optionText: {
      fontSize: 15,
      color: t.text,
    },
    optionTextSelected: {
      color: t.accent,
      fontWeight: '600',
    },
  });