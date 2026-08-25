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

import { registerUser } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

const PURPLE = '#9C3AB3';

const RegisterScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState('')

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword || !contact) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await registerUser(name, email, password, contact);
    setLoading(false);

    if (result.success) {
      Alert.alert('Success', 'Registration Successful');
      navigation.replace('Main');
    } else {
      Alert.alert('Registration Failed', result.message);
    }
  };

  const renderInput = (
    key,
    placeholder,
    value,
    setter,
    extraProps = {},
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{placeholder}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        style={[styles.input, focused === key && styles.inputFocused]}
        value={value}
        onChangeText={setter}
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
        {...extraProps}
      />
    </View>
  );

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
          <Feather name="user-plus" size={26} color={PURPLE} />
        </View>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>
          Create your account to get started with IntelliTemp
        </Text>

        <View style={styles.form}>
          {renderInput('name', 'Full Name', name, setName)}
          {renderInput('email', 'Email', email, setEmail, {
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}

          {renderInput(
            'contact',
            'Contact Number',
            contact,
            setContact,
            {
              keyboardType: 'phone-pad',
              maxLength: 10,
            },
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View
              style={[
                styles.passwordWrapper,
                focused === 'password' && styles.inputFocused,
              ]}>
              <TextInput
                placeholder="Password"
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

          {renderInput(
            'confirm',
            'Confirm Password',
            confirmPassword,
            setConfirmPassword,
            { secureTextEntry: !showPassword },
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.footerLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const createStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#FFFFFF' },
    container: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingTop: 50,
      paddingBottom: 40,
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
      backgroundColor: '#F1EAFB',
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'center',
      marginTop: 8,
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
      marginTop: 10,
      marginBottom: 28,
      lineHeight: 21,
      paddingHorizontal: 12,
    },
    form: {
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
      marginBottom: 18,
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
    passwordWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1.5,
      borderColor: '#E5E7EB',
      backgroundColor: '#F5F5F7',
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    passwordInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 15,
      fontWeight: '500',
      color: '#111827',
    },
    button: {
      backgroundColor: PURPLE,
      height: 54,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
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
      marginTop: 22,
      alignItems: 'center',
    },
    footerText: {
      color: '#6B7280',
      fontSize: 14,
    },
    footerLink: {
      color: PURPLE,
      fontWeight: '700',
    },
  });