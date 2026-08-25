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
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

import { forgotPassword } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

const PURPLE = '#9C3AB3';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Feather name="lock" size={26} color={PURPLE} />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address and we'll send you a password
          reset link.
        </Text>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Email"
              placeholderTextColor={colors.subText}
              value={email}
              onChangeText={setEmail}
              style={[styles.input, focused && styles.inputFocused]}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
          </View>

          <Text style={styles.helperText}>
            Forgot your password? We'll send you a reset link.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleReset}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen;

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#FFFFFF' },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 32,
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 24,
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F5F5F7',
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: '#F5EAF8',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: '700',
      color: '#111827',
      textAlign: 'center',
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '400',
      color: '#6B7280',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 28,
      lineHeight: 21,
      paddingHorizontal: 16,
    },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 24,
      elevation: 2,
    },
    fieldGroup: {
      marginBottom: 0,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: '#6B7280',
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      backgroundColor: '#F5F5F7',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontWeight: '500',
      color: '#111827',
    },
    inputFocused: {
      borderColor: PURPLE,
      backgroundColor: '#FFFFFF',
    },
    helperText: {
      fontSize: 12.5,
      fontWeight: '400',
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 18,
      marginTop: 16,
      marginBottom: 28,
    },
    button: {
      backgroundColor: PURPLE,
      height: 54,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: PURPLE,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 14,
      elevation: 3,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 22,
    },
    footerText: {
      fontSize: 14,
      fontWeight: '400',
      color: '#6B7280',
    },
    footerLink: {
      fontSize: 14,
      fontWeight: '700',
      color: PURPLE,
    },
  });