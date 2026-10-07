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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { loginUser } from '../services/AuthService';
import { useAppTheme } from '../services/theme';
import AutoLogin from '../components/AutoLogin';

const ACCENT = '#8E338A';
const ACCENT_LIGHT = '#A3429E';

const LoginScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);

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
        
        {/* Top Content Group */}
        <View style={styles.topContent}>
          {/* Header Section */}
          <View style={styles.headerSection}>
            <Image
              source={require('../assests/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>CONDITIONS. CLARITY. CONTROL.</Text>
            <Text style={styles.title}>Welcome back.</Text>
            <Text style={styles.subtitle}>
              Sign in to your IntelliTemp workspace.
            </Text>
          </View>

          {/* Form Body */}
          <View style={styles.form}>
            {/* Work Email Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Work email</Text>
              <TextInput
                placeholder="operator@demo.example"
                placeholderTextColor={isDark ? colors.subText : '#9E9AA7'}
                style={[
                  styles.input,
                  focused === 'email' && styles.inputFocused,
                ]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.passwordWrapper,
                  focused === 'password' && styles.inputFocused,
                ]}>
                <Feather
                  name="lock"
                  size={18}
                  color={isDark ? colors.subText : '#8E8B99'}
                  style={styles.leftIcon}
                />
                <TextInput
                  placeholder="••••••••••••••••"
                  placeholderTextColor={isDark ? colors.subText : '#9E9AA7'}
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
                    color={isDark ? colors.subText : '#8E8B99'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkbox & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                activeOpacity={0.8}
                onPress={() => setRememberMe(!rememberMe)}>
                <View
                  style={[
                    styles.checkbox,
                    rememberMe && styles.checkboxChecked,
                  ]}>
                  {rememberMe && (
                    <Feather name="check" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Keep me signed in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Forgotpassword')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            {/* Authorised Account Notice */}
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={20}
                color={ACCENT}
                style={styles.infoIcon}
              />
              <Text style={styles.infoText}>
                Use your authorised site account. Access is limited to assigned devices.
              </Text>
            </View>

            {/* AutoLogin logic rendered invisibly */}
            <View style={styles.hiddenComponent}>
              <AutoLogin />
            </View>
          </View>
        </View>

        {/* Bottom Section Card (Flat White Background, No Border or Shadow) */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Sign in</Text>
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

export default LoginScreen;

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
      paddingTop: Platform.OS === 'ios' ? 56 : 36,
      paddingBottom: Platform.OS === 'android' ? 40 : 28,
    },
    topContent: {
      flex: 1,
    },
    headerSection: {
      marginBottom: 20,
    },
    logo: {
      width: 170,
      height: 50,
      alignSelf: 'flex-start',
      marginBottom: 16,
    },
    tagline: {
      fontSize: 11,
      fontWeight: '800',
      color: ACCENT,
      letterSpacing: 1.1,
      marginBottom: 10,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: isDark ? colors.text : '#1B1721',
      letterSpacing: -0.6,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 15,
      color: isDark ? colors.subText : '#6B6775',
      lineHeight: 22,
    },
    form: {
      marginTop: 8,
    },
    fieldGroup: {
      marginBottom: 18,
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
    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 52,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#E5E0EA',
      backgroundColor: isDark ? colors.card : '#FFFFFF',
      borderRadius: 10,
      paddingHorizontal: 14,
    },
    leftIcon: {
      marginRight: 10,
    },
    passwordInput: {
      flex: 1,
      fontSize: 15,
      color: isDark ? colors.text : '#1B1721',
      height: '100%',
    },
    optionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 20,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : '#8E8B99',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    checkboxChecked: {
      backgroundColor: ACCENT,
      borderColor: ACCENT,
    },
    checkboxLabel: {
      fontSize: 14,
      color: isDark ? colors.text : '#4E4A59',
      fontWeight: '500',
    },
    forgotText: {
      color: ACCENT,
      fontWeight: '700',
      fontSize: 14,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(142, 51, 138, 0.10)' : '#FAF7FB',
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(142, 51, 138, 0.20)' : '#F2EAF3',
    },
    infoIcon: {
      marginRight: 10,
    },
    infoText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: isDark ? colors.subText : '#686373',
    },
    hiddenComponent: {
      display: 'none',
    },
    bottomSection: {
      marginTop: 24,
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