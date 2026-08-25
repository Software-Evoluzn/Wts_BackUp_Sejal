import React, { useState } from 'react';
import {
  View,
  Image,
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

import { loginUser } from '../services/AuthService';
import { googleLogin } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

// Accent color used throughout the login flow (links, focus borders,
// primary button, footer link) — matches the brand's plum/purple identity.
const ACCENT = '#5B2C74';
const ACCENT_LIGHT = '#7B4A98';
const ACCENT_DARK = '#3D1E52';

const LoginScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // The "Login" button uses a solid plum/purple fill in both themes, matching
  // the reference brand color. In dark mode it lightens slightly for
  // contrast against a dark card; light mode keeps the same accent fill.
  // No token in `colors` represents this, so it's expressed explicitly here,
  // gated on `isDark`.
  const loginButtonSurfaceStyle = isDark ? { backgroundColor: ACCENT_LIGHT } : null;
  const loginButtonContentColor = '#fff';

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await googleLogin();
    setGoogleLoading(false);

    if (result.success) {
      navigation.replace('Main');
    } else {
      Alert.alert('Google Login', result.message);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    const result = await loginUser(email, password);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Login Successful');
      navigation.replace('Main');
    } else {
      Alert.alert('Login Failed', result.message);
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
        <View style={styles.logoCircle}>
          <Image
            source={require('../assests/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to IntelliTemp</Text>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={colors.subText}
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.passwordWrapper,
                focused === 'password' && styles.inputFocused,
              ]}>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={colors.subText}
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={18}
                  color={colors.subText}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate('Forgotpassword')}
            style={styles.forgotWrapper}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loginButtonSurfaceStyle]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color={loginButtonContentColor} />
            ) : (
              <Text style={[styles.buttonText, { color: loginButtonContentColor }]}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            activeOpacity={0.85}
            disabled={googleLoading}>
            {googleLoading ? (
              <ActivityIndicator color={colors.subText} />
            ) : (
              <>
                <Image
                  source={
                    isDark
                      ? require('../assests/images/googledark.png')
                      : require('../assests/images/google.png')
                  }
                  style={styles.googleIconFallback}
                />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.footerLink}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      paddingVertical: 48,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginBottom: 26,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: isDark ? ACCENT_DARK : ACCENT,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 18,
      elevation: 4,
    },
    logo: {
      width: 38,
      height: 38,
    },
    title: {
      fontSize: 27,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.subText,
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 30,
    },
    form: {
      backgroundColor: colors.card,
      borderRadius: 26,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: isDark ? ACCENT_DARK : ACCENT,
      shadowOffset: { width: 0, height: 14 },
      shadowOpacity: isDark ? 0.4 : 0.1,
      shadowRadius: 26,
      elevation: 6,
    },
    fieldGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.subText,
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    input: {
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: isDark ? colors.background : '#F1EEF3',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    inputFocused: {
      borderColor: ACCENT,
      backgroundColor: isDark ? colors.card : '#F1EEF3',
    },
    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: 'transparent',
      backgroundColor: isDark ? colors.background : '#F1EEF3',
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 15,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
    forgotWrapper: { alignSelf: 'flex-end', marginTop: 4, marginBottom: 22 },
    forgotText: { color: ACCENT, fontWeight: '600', fontSize: 13 },
    button: {
      backgroundColor: ACCENT,
      paddingVertical: 17,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: ACCENT,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.32,
      shadowRadius: 18,
      elevation: 5,
    },
    buttonText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    dividerText: {
      marginHorizontal: 14,
      color: colors.subText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    googleButton: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingVertical: 16,
      borderRadius: 16,
      gap: 10,
      shadowColor: '#0B0D12',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    googleIconFallback: {
      width: 20,
      height: 20,
    },
    googleText: { color: colors.text, fontSize: 14, fontWeight: '600' },
    footer: { marginTop: 28, alignItems: 'center' },
    footerText: { color: colors.subText, fontSize: 14 },
    footerLink: { color: ACCENT, fontWeight: '700' },
  });