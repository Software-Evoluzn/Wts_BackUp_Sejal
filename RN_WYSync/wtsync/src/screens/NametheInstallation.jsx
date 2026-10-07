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
  const styles = useMemo(() => createStyles(insets), [insets]);

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
            placeholderTextColor="#A1A1AA"
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
              color="#111827"
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
                    <Feather name="check" size={16} color="#8B2A8B" />
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
          <Feather name="copy" size={16} color="#8B2A8B" style={styles.hintIcon} />
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

export default NametheInstallation;

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

    /* Fields */
    fieldGroup: {
      marginBottom: 18,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: '#374151',
      marginBottom: 8,
    },
    input: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: '#111827',
    },
    dropdownTrigger: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownTriggerText: {
      fontSize: 15,
      color: '#111827',
      fontWeight: '500',
    },

    /* Info card */
    infoCard: {
      backgroundColor: '#FFF',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 16,
      marginTop: 4,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#EDEDF0',
    },
    infoRowLast: {
      borderBottomWidth: 0,
    },
    infoLabel: {
      fontSize: 13,
      color: '#6B7280',
    },
    infoValue: {
      fontSize: 13,
      fontWeight: '700',
      color: '#111827',
    },

    /* Hint card */
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F3EFF6',
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

    /* Inline application dropdown */
    dropdownTriggerOpen: {
      borderColor: '#8B2A8B',
    },
    dropdownList: {
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
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
      borderBottomColor: '#F3F4F6',
    },
    optionRowLast: {
      borderBottomWidth: 0,
    },
    optionText: {
      fontSize: 15,
      color: '#111827',
    },
    optionTextSelected: {
      color: '#8B2A8B',
      fontWeight: '600',
    },
  });