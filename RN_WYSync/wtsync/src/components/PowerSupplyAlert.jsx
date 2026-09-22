import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useAppTheme } from '../services/theme';

// Same brand color as the Register button on ProductRegistrationScreen
const ACCENT = '#7F2E94';

const STEPS = [
  'Connect the power adapter to the device.',
  'Switch on the power supply.',
  'Wait until the device turns on, then continue.',
];

/**
 * PowerSupplyAlert
 * -----------------------------------------------------------------------
 * Now a fully CONTROLLED component — `visible` is owned by the parent
 * screen (ProductRegistrationScreen), not by an internal useFocusEffect.
 *
 * Why the change: the old version called setVisible(true) on every
 * focus event, so it also popped up when navigating BACK to
 * ProductRegistrationScreen from PasswordScreen (i.e. after the device
 * was already powered on and WiFi-configured). The parent is the only
 * place that actually knows "fresh entry" vs "returning from setup",
 * so it now decides when to show this.
 * -----------------------------------------------------------------------
 */
const PowerSupplyAlert = ({ visible, onConfirm, onCancel }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="power" size={28} color={ACCENT} />
          </View>

          <Text style={styles.title}>Connect power to the device</Text>
          <Text style={styles.message}>
            The device must be powered on before you register it.
          </Text>

          <View style={styles.steps}>
            {STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={onConfirm}>
            <Feather name="check" size={16} color="#fff" />
            <Text style={styles.primaryButtonText}>Power is connected</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.7}
            onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default PowerSupplyAlert;

const createStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(127,46,148,0.12)',
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    message: {
      fontSize: 14,
      color: colors.subText,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    steps: {
      marginTop: 20,
      marginBottom: 24,
      gap: 12,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    stepNumber: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: ACCENT,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      marginTop: 1,
    },
    stepNumberText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    stepText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
    primaryButton: {
      backgroundColor: ACCENT,
      paddingVertical: 15,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    secondaryButton: {
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 6,
    },
    secondaryButtonText: { color: colors.subText, fontSize: 14, fontWeight: '600' },
  });