import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { forgotPassword } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

const ACCENT = '#8E338A';
const ACCENT_LIGHT = '#A3429E';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);

  const [email, setEmail] = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    const result = await forgotPassword(email);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Password reset link sent to your email.');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Top Header Section Box (Full Width White Card like Footer) */}
        <View style={styles.topHeaderSection}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={20} color={isDark ? colors.text : '#1B1721'} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            IntelliTemp <Text style={styles.headerSubTitle}>4P</Text>
          </Text>

          <Image
            source={require('../assests/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Main Form Content */}
        <View style={styles.topContent}>
          <Text style={styles.categoryTag}>ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>Recover your access.</Text>
          <Text style={styles.subtitle}>
            Use the email address associated with your workspace.
          </Text>

          {/* Work Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Work email</Text>
            <TextInput
              placeholder="operator@demo.example"
              placeholderTextColor={isDark ? colors.subText : '#9E9AA7'}
              value={email}
              onChangeText={setEmail}
              style={[styles.input, focused && styles.inputFocused]}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          {/* Privacy Notice Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={18}
              color={ACCENT}
              style={styles.infoIcon}
            />
            <Text style={styles.infoText}>
              For privacy, the response should not disclose whether an email address has an account.
            </Text>
          </View>

          {/* Back to sign in link */}
          <TouchableOpacity
            style={styles.backToSignRow}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={16} color={ACCENT} style={styles.backToSignIcon} />
            <Text style={styles.backToSignText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Section Box (Full Width White Card) */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleReset}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Request reset instructions</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.poweredByText}>
            Powered By <Text style={styles.brandName}>EVOLUZN</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: isDark ? colors.background : '#F6F5F8',
    },
    container: {
      flexGrow: 1,
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingBottom: Platform.OS === 'android' ? 28 : 20,
    },
    topHeaderSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginHorizontal: -24,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'ios' ? 54 : 40, // Increased top clearance for status bar/notch
      paddingBottom: 16,
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      marginBottom: 20,
    },
    headerBackBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: isDark ? colors.text : '#1B1721',
    },
    headerSubTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? colors.subText : '#8B8796',
    },
    headerLogo: {
      width: 90,
      height: 30,
    },
    topContent: {
      flex: 1,
    },
    categoryTag: {
      fontSize: 11,
      fontWeight: '800',
      color: ACCENT,
      letterSpacing: 1.1,
      marginBottom: 8,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: isDark ? colors.text : '#1B1721',
      letterSpacing: -0.6,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: isDark ? colors.subText : '#6B6775',
      lineHeight: 22,
      marginBottom: 24,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? colors.text : '#393543',
      marginBottom: 8,
    },
    input: {
      height: 52,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E0EA',
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 16,
      fontSize: 15,
      color: isDark ? colors.text : '#1B1721',
    },
    inputFocused: {
      borderColor: ACCENT,
      borderWidth: 1.5,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(142, 51, 138, 0.10)' : '#FAF7FB',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(142, 51, 138, 0.20)' : '#F2EAF3',
      marginBottom: 24,
    },
    infoIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    infoText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? colors.subText : '#686373',
    },
    backToSignRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    backToSignIcon: {
      marginRight: 6,
    },
    backToSignText: {
      fontSize: 14,
      fontWeight: '700',
      color: ACCENT,
    },
    bottomSection: {
      marginTop: 32,
      marginHorizontal: -24,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: Platform.OS === 'android' ? 28 : 20,
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      alignItems: 'center',
    },
    button: {
      width: '100%',
      height: 52,
      backgroundColor: isDark ? ACCENT_LIGHT : ACCENT,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    poweredByText: {
      marginTop: 14,
      fontSize: 13,
      color: isDark ? colors.subText : '#8B8796',
    },
    brandName: {
      fontWeight: '800',
      color: ACCENT,
    },
  });