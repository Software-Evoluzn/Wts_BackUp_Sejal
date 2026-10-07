import React, { useState, useLayoutEffect, useMemo } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

const TOTAL_STEPS = 6;
const CURRENT_STEP = 4;

const Choosealertrecipients = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(insets), [insets]);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

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
    // Navigate to your next screen or review flow
    navigation.navigate('Reviewalertrule');
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
          <Feather name="check" size={16} color="#15803D" style={styles.bannerIcon} />
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
              <Switch
                trackColor={{ false: '#E5E7EB', true: '#8B2A8B' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E7EB"
                onValueChange={setEmailEnabled}
                value={emailEnabled}
              />
            </View>

            {emailEnabled && (
              <View style={styles.emailDetails}>
                <Text style={styles.emailAddressText}>operator@demo.example</Text>
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
              <Switch
                trackColor={{ false: '#E5E7EB', true: '#8B2A8B' }}
                thumbColor="#FFF"
                ios_backgroundColor="#E5E7EB"
                onValueChange={setSmsEnabled}
                value={smsEnabled}
              />
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
          <Feather name="chevron-right" size={16} color="#8B2A8B" />
        </TouchableOpacity>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooterSheet}>
        <TouchableOpacity
          style={styles.primaryActionButton}
          activeOpacity={0.85}
          onPress={handleNext}>
          <Text style={styles.primaryActionButtonText}>Review alert rule</Text>
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

export default Choosealertrecipients;

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
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#E8F5E9',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    bannerIcon: {
      marginRight: 10,
    },
    statusBannerText: {
      flex: 1,
      fontSize: 13.5,
      color: '#166534',
      lineHeight: 18,
      fontWeight: '500',
    },
    card: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
    },
    optionSection: {
      paddingVertical: 8,
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionTitleGroup: {
      flex: 1,
      paddingRight: 12,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
    },
    optionSubtitle: {
      fontSize: 13,
      color: '#6B7280',
      marginTop: 2,
      lineHeight: 18,
    },
    emailDetails: {
      marginTop: 12,
    },
    emailAddressText: {
      fontSize: 14,
      color: '#374151',
      fontWeight: '500',
      marginBottom: 6,
    },
    verifyBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#DCFCE7',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    verifyBadgeText: {
      fontSize: 12,
      color: '#15803D',
      fontWeight: '600',
    },
    unavailableBadge: {
      backgroundColor: '#F3F4F6',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
    },
    unavailableBadgeText: {
      fontSize: 12,
      color: '#6B7280',
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: '#F3F4F6',
      marginVertical: 6,
    },
    preferencesLink: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    preferencesLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#8B2A8B',
      marginRight: 4,
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