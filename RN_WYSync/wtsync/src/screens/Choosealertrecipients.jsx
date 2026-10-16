import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import { getUserDetails } from '../services/AuthService';
import { getDraft, updateDraft } from '../services/installationDraft';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;

// ---------- Themes ----------
const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  divider: '#F0F0F5',
  innerDivider: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  label: '#374151',
  icon: '#333333',
  accent: '#8B2A8B',
  onAccent: '#FFFFFF',
  stepBar: '#E5E5EA',
  footerText: '#6E6577',
  footerBrand: '#7B2B75',
  headerSub: '#8E8E93',
  headerTitle: '#1C1C1E',
  successBg: '#E8F5E9',
  successText: '#166534',
  successIcon: '#15803D',
  badgeBg: '#DCFCE7',
  badgeText: '#15803D',
  neutralBadgeBg: '#F3F4F6',
  neutralBadgeText: '#6B7280',
  switchOff: '#E5E7EB',
  switchThumb: '#FFFFFF',
};

const DARK = {
  bg: '#17151B',
  surface: '#232027',
  border: '#3A3640',
  divider: '#2E2B33',
  innerDivider: '#3A3640',
  textPrimary: '#FFFFFF',
  textSecondary: '#A9A3B3',
  label: '#E5E1EA',
  icon: '#FFFFFF',
  accent: '#E6A8E1',
  onAccent: '#1C1A20',
  stepBar: '#3A3640',
  footerText: '#A9A3B3',
  footerBrand: '#E6A8E1',
  headerSub: '#A9A3B3',
  headerTitle: '#FFFFFF',
  successBg: '#1F3A2B',
  successText: '#A7E3BB',
  successIcon: '#4ADE80',
  badgeBg: '#1F3A2B',
  badgeText: '#86EFAC',
  neutralBadgeBg: '#3A3640',
  neutralBadgeText: '#A9A3B3',
  switchOff: '#4A4650',
  switchThumb: '#FFFFFF',
};

const Choosealertrecipients = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme(); // follows phone setting
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(insets, colors), [insets, colors]);

  const [emailEnabled, setEmailEnabled] = useState(getDraft().emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(getDraft().smsEnabled ?? false);

  // Recipient details come from the logged-in account
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getUserDetails();
        if (result?.success && result.user) {
          setUserEmail(result.user.email || '');
          setUserPhone(result.user.contact || '');
        }
      } catch (e) {
        console.log('Failed to load user:', e);
      }
    };
    loadUser();
  }, []);

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

  const handleNext = () => {
    // Save for the backend call on the Review screen
    updateDraft({
      emailEnabled,
      smsEnabled,
      alertEmail: userEmail,
      smsPhone: userPhone,
    });

    // Navigating to the route defined in AppNavigator.js
    navigation.navigate('Reviewbeforeapplying');
  };

  const switchProps = {
    trackColor: { false: colors.switchOff, true: colors.accent },
    thumbColor: colors.switchThumb,
    ios_backgroundColor: colors.switchOff,
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
        contentContainerStyle={styles.scrollContent}>
        {/* Progress Bar */}
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

        {/* Step Header */}
        <Text style={styles.stepSubtitle}>STEP 4 OF 6 · SET ALERTS</Text>
        <Text style={styles.stepTitle}>Notify the right person.</Text>
        <Text style={styles.stepDescription}>
          Device rules use these recipients unless account-level notifications are off.
        </Text>

        {/* Account Banner */}
        <View style={styles.statusBanner}>
          <Feather name="check" size={16} color={colors.successIcon} style={styles.bannerIcon} />
          <Text style={styles.statusBannerText}>
            Account master notifications are on. Device notifications are permitted.
          </Text>
        </View>

        {/* Notification Options Card */}
        <View style={styles.card}>
          {/* Email Option */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleGroup}>
                <Text style={styles.optionTitle}>Email</Text>
                <Text style={styles.optionSubtitle}>Basic alert notification</Text>
              </View>
              <Switch {...switchProps} onValueChange={setEmailEnabled} value={emailEnabled} />
            </View>

            {emailEnabled && (
              <View style={styles.emailDetails}>
                <Text style={styles.emailAddressText}>{userEmail || 'Loading...'}</Text>
                <View style={styles.verifyBadge}>
                  <Text style={styles.verifyBadgeText}>
                    Demo recipient · verify in production
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          {/* SMS Option */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleGroup}>
                <Text style={styles.optionTitle}>SMS</Text>
                <Text style={styles.optionSubtitle}>
                  Requires verified recipient and applicable allowance or service.
                </Text>
              </View>
              <Switch {...switchProps} onValueChange={setSmsEnabled} value={smsEnabled} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* WhatsApp Option (Disabled / Unavailable) */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <View style={styles.optionTitleGroup}>
                <Text style={styles.optionTitle}>WhatsApp</Text>
                <Text style={styles.optionSubtitle}>Not included in this configuration.</Text>
              </View>
              <View style={styles.unavailableBadge}>
                <Text style={styles.unavailableBadgeText}>Unavailable</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Review Preferences Link */}
        <TouchableOpacity
          style={styles.preferencesLink}
          activeOpacity={0.7}
          onPress={() => {}}>
          <Text style={styles.preferencesLinkText}>Review account preferences</Text>
          <Feather name="chevron-right" size={16} color={colors.accent} />
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={handleNext}>
          <Text style={styles.primaryActionButtonText}>Review alert rule</Text>
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

export default Choosealertrecipients;

const createStyles = (insets, c) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
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
    headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    backButton: { paddingVertical: 4, paddingRight: 14 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: c.headerTitle },
    headerSubtitleText: { fontSize: 14, fontWeight: '600', color: c.headerSub },
    brandLogo: { width: 90, height: 24 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    stepProgressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    stepBar: { flex: 1, height: 4, backgroundColor: c.stepBar, borderRadius: 2, marginRight: 8 },
    stepBarActive: { backgroundColor: c.accent },
    stepSubtitle: { fontSize: 12, fontWeight: '700', color: c.accent, letterSpacing: 0.8, marginBottom: 6 },
    stepTitle: { fontSize: 26, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },
    stepDescription: { fontSize: 14.5, color: c.textSecondary, marginTop: 6, marginBottom: 20, lineHeight: 20 },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.successBg,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    bannerIcon: { marginRight: 10 },
    statusBannerText: { flex: 1, fontSize: 13.5, color: c.successText, lineHeight: 18, fontWeight: '500' },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
    },
    optionSection: { paddingVertical: 8 },
    optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    optionTitleGroup: { flex: 1, paddingRight: 12 },
    optionTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary },
    optionSubtitle: { fontSize: 13, color: c.textSecondary, marginTop: 2, lineHeight: 18 },
    emailDetails: { marginTop: 12 },
    emailAddressText: { fontSize: 14, color: c.label, fontWeight: '500', marginBottom: 6 },
    verifyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: c.badgeBg,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    verifyBadgeText: { fontSize: 12, color: c.badgeText, fontWeight: '600' },
    unavailableBadge: {
      backgroundColor: c.neutralBadgeBg,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    unavailableBadgeText: { fontSize: 12, color: c.neutralBadgeText, fontWeight: '600' },
    divider: { height: 1, backgroundColor: c.innerDivider, marginVertical: 6 },
    preferencesLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    preferencesLinkText: { fontSize: 14, fontWeight: '700', color: c.accent, marginRight: 4 },
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
    primaryActionButtonText: { color: c.onAccent, fontSize: 16, fontWeight: '700' },
    brandFooterRow: { alignItems: 'center', marginTop: 14 },
    brandFooterText: { fontSize: 12, color: c.footerText },
    brandFooterBold: { fontWeight: '800', color: c.footerBrand, letterSpacing: 1.2 },
  });