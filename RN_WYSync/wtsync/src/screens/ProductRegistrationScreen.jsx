import React, { useState, useRef, useEffect, useCallback } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StyleSheet,
  Modal,
} from 'react-native';

import { Camera } from 'react-native-camera-kit';
import Feather from 'react-native-vector-icons/Feather';

import { registerProduct } from '../services/ProductApi';
import { getUserDetails } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

const DEVICE_LIST = [
  'IntelliTemp',
  '3Phase portable Energy Monitor',
  'CFM',
  'Load Balancer',
  'TH Monitor',
  'THO Monitor',
  'Smoke Detector',
  '3PhaseWTS',
  'Gas Detector',
  'RTU',
];

const PROBE_OPTIONS = {
  IntelliTemp: ['4P', '12P', '24P'],
};

const parseQR = (raw) => {
  if (!raw) return null;
  const result = {};
  const patterns = [
    { key: 'Device Name', regex: /Device Name\s*:\s*(.*?)\s*(?=Model No\s*:|$)/i },
    { key: 'Model No', regex: /Model No\s*:\s*(.*?)\s*(?=Serial No\s*:|$)/i },
    { key: 'Serial No', regex: /Serial No\s*:\s*(.*?)\s*(?=MAC ID\s*:|$)/i },
    { key: 'MAC ID', regex: /MAC ID\s*:\s*(.*?)\s*(?=MDF By\s*:|$)/i },
    { key: 'MDF By', regex: /MDF By\s*:\s*(.*)$/i },
  ];

  patterns.forEach(({ key, regex }) => {
    const match = raw.match(regex);
    if (match) {
      result[key] = match[1].trim();
    }
  });

  return result;
};

const EMPTY_FORM = {
  'Device Name': '',
  'Model No': '',
  'Serial No': '',
  'MAC ID': '',
  'MDF By': '',
};

// Reusable Counter Input Component with Plus & Minus Buttons
const CounterInput = ({ value, onChange, placeholder, styles, colors }) => {
  const numericVal = parseFloat(value) || 0;

  const handleDecrement = () => {
    const newVal = numericVal - 1;
    onChange(newVal.toString());
  };

  const handleIncrement = () => {
    const newVal = numericVal + 1;
    onChange(newVal.toString());
  };

  return (
    <View style={styles.counterContainer}>
      <TouchableOpacity
        style={styles.counterBtn}
        onPress={handleDecrement}
        activeOpacity={0.7}>
        <Feather name="minus" size={18} color={colors.text} />
      </TouchableOpacity>

      <TextInput
        style={styles.counterInput}
        placeholder={placeholder}
        placeholderTextColor={colors.subText}
        keyboardType="numeric"
        value={value}
        onChangeText={onChange}
      />

      <TouchableOpacity
        style={styles.counterBtn}
        onPress={handleIncrement}
        activeOpacity={0.7}>
        <Feather name="plus" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
};

const ProductRegistrationScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  const [mode, setMode] = useState('scan');
  const [product, setProduct] = useState(null);
  const [manualForm, setManualForm] = useState(EMPTY_FORM);

  // Custom Dropdown States
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState('');

  // Threshold Configuration
  const [thresholdType, setThresholdType] = useState('global'); // 'global' | 'individual'
  const [globalThreshold, setGlobalThreshold] = useState('');
  const [individualThresholds, setIndividualThresholds] = useState({});

  // Dates & Contact Alerts
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [location, setLocation] = useState('');
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [whatsAppAlert, setWhatsAppAlert] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const result = await getUserDetails();
      if (result?.success) setUser(result.user);
    } catch (e) {
      console.log('Failed to load user:', e);
    }
  };

  const resetForm = useCallback(() => {
    setMode('scan');
    setProduct(null);
    setManualForm(EMPTY_FORM);
    setShowDatePicker(false);
    setPurchaseDate(new Date());
    setGlobalThreshold('');
    setIndividualThresholds({});
    setThresholdType('global');
    setSelectedProbe('');
    setEmailEnabled(false);
    setSmsEnabled(false);
    setAlertEmail('');
    setSmsPhone('');
    setLocation('');
    setWhatsAppEnabled(false);
    setWhatsAppAlert('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setProduct(null);
    setManualForm(EMPTY_FORM);
  };

  const updateManualField = (key, value) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeviceSelect = (device) => {
    updateManualField('Device Name', device);
    setShowDevicePicker(false);

    if (!PROBE_OPTIONS[device]) {
      setSelectedProbe('');
      setIndividualThresholds({});
      setThresholdType('global');
    } else {
      setSelectedProbe(PROBE_OPTIONS[device][0]);
    }
  };

  const handleProbeSelect = (probe) => {
    setSelectedProbe(probe);
    setIndividualThresholds({});
  };

  const handleIndividualThresholdChange = (index, value) => {
    setIndividualThresholds((prev) => ({
      ...prev,
      [`probe_${index + 1}`]: value,
    }));
  };

  const getProbeCount = () => {
    if (!selectedProbe) return 0;
    const match = selectedProbe.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const onManualSubmit = () => {
    const required = ['Device Name', 'Model No', 'Serial No', 'MAC ID'];
    const missing = required.filter(
      (key) => !manualForm[key] || !manualForm[key].trim()
    );

    if (missing.length > 0) {
      Alert.alert('Missing Fields', `Please fill: ${missing.join(', ')}`);
      return;
    }

    const cleaned = {};
    Object.keys(manualForm).forEach((key) => {
      cleaned[key] = manualForm[key].trim();
    });

    setProduct(cleaned);
  };

  const onRegister = async () => {
    if (!user) {
      Alert.alert('Please wait', 'User information is loading.');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Validation Error', 'Please enter a device location.');
      return;
    }

    const body = {
      firebase_uid: user.firebase_uid,
      user_name: user.name,
      email: user.email,
      contact: user.contact,
      device_name: product['Device Name'],
      probe_type: selectedProbe || null,
      model_no: product['Model No'],
      serial_no: product['Serial No'],
      mac_id: product['MAC ID'],
      purchase_date: purchaseDate.toISOString().split('T')[0],
      location: location.trim(),
      threshold_type: thresholdType,
      threshold_value: thresholdType === 'global' ? parseFloat(globalThreshold) || 0 : null,
      individual_thresholds: thresholdType === 'individual' ? individualThresholds : null,
      email_enabled: emailEnabled,
      alert_email: alertEmail,
      sms_enabled: smsEnabled,
      sms_phone: smsPhone,
      whatsapp_enabled: whatsAppEnabled,
      whatsapp_phone: whatsAppAlert,
    };

    try {
      const response = await registerProduct(body);

      if (response.success) {
        Alert.alert('Success', response.message, [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to connect to server.');
    }
  };

  const scanAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 240,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [scanAnimation]);

  const onReadCode = (event) => {
    const qrData = event.nativeEvent.codeStringValue;
    const parsed = parseQR(qrData);

    if (!parsed) {
      Alert.alert('Invalid QR Code');
      return;
    }

    setProduct(parsed);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setPurchaseDate(selectedDate);
  };

  const probeCount = getProbeCount();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.screenTitle}>Register Product</Text>
        <Text style={styles.screenSubtitle}>Scan QR code or enter product details manually</Text>

        {/* Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'scan' && styles.modeButtonActive]}
            activeOpacity={0.85}
            onPress={() => switchMode('scan')}>
            <Feather
              name="camera"
              size={15}
              color={mode === 'scan' ? colors.text : colors.subText}
              style={styles.modeIcon}
            />
            <Text style={[styles.modeButtonText, mode === 'scan' && styles.modeButtonTextActive]}>
              Scan QR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
            activeOpacity={0.85}
            onPress={() => switchMode('manual')}>
            <Feather
              name="edit-3"
              size={15}
              color={mode === 'manual' ? colors.text : colors.subText}
              style={styles.modeIcon}
            />
            <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
              Enter Manually
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scanner View */}
        {mode === 'scan' && !product && (
          <View style={styles.scannerContainer}>
            <View style={styles.cameraBox}>
              <Camera style={styles.camera} scanBarcode={true} onReadCode={onReadCode} />
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanAnimation }] },
                ]}
              />
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanText}>Align QR code inside the frame</Text>
          </View>
        )}

        {/* Manual Input Form */}
        {mode === 'manual' && !product && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enter Product Details</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Device Name *</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => setShowDevicePicker(true)}>
                <Text style={styles.dropdownTriggerText}>
                  {manualForm['Device Name'] || 'Select Device'}
                </Text>
                <Feather name="chevron-down" size={18} color={colors.subText} />
              </TouchableOpacity>
            </View>

            {PROBE_OPTIONS[manualForm['Device Name']] && (
              <View style={styles.fieldGroup}>
                <Text style={styles.inputLabel}>Probe Subtype *</Text>
                <View style={styles.probeChipContainer}>
                  {PROBE_OPTIONS[manualForm['Device Name']].map((probe) => (
                    <TouchableOpacity
                      key={probe}
                      style={[
                        styles.probeChip,
                        selectedProbe === probe && styles.probeChipActive,
                      ]}
                      onPress={() => handleProbeSelect(probe)}>
                      <Text
                        style={[
                          styles.probeChipText,
                          selectedProbe === probe && styles.probeChipTextActive,
                        ]}>
                        {probe}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Model No *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. RX-200-IN"
                placeholderTextColor={colors.subText}
                autoCapitalize="characters"
                value={manualForm['Model No']}
                onChangeText={(text) => updateManualField('Model No', text)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Serial No *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. SN123456789"
                placeholderTextColor={colors.subText}
                autoCapitalize="characters"
                value={manualForm['Serial No']}
                onChangeText={(text) => updateManualField('Serial No', text)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>MAC ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. AA:BB:CC:DD:EE:FF"
                placeholderTextColor={colors.subText}
                autoCapitalize="characters"
                value={manualForm['MAC ID']}
                onChangeText={(text) => updateManualField('MAC ID', text)}
              />
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.85}
              onPress={onManualSubmit}>
              <Text style={styles.registerButtonText}>Continue</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Device Summary Card */}
        {product && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Product Details</Text>
              <Feather name="check-circle" size={16} color="#22C55E" />
            </View>

            <Row label="Device Name" value={product['Device Name']} styles={styles} />
            {selectedProbe ? <Row label="Probe Subtype" value={selectedProbe} styles={styles} /> : null}
            <Row label="Model No" value={product['Model No']} styles={styles} />
            <Row label="Serial No" value={product['Serial No']} styles={styles} />
            <Row label="MAC ID" value={product['MAC ID']} styles={styles} />

            <TouchableOpacity
              style={styles.editLinkRow}
              onPress={() => {
                if (mode === 'manual') {
                  setManualForm({ ...EMPTY_FORM, ...product });
                }
                setProduct(null);
              }}>
              <Feather
                name={mode === 'scan' ? 'refresh-cw' : 'edit-3'}
                size={14}
                color="#4F46E5"
              />
              <Text style={styles.editLink}>
                {mode === 'scan' ? 'Scan Again' : 'Edit Details'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Additional Common Fields */}
        {product && (
          <>
            {/* Purchase Date & Location Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Installation & Purchase Details</Text>

              <Text style={styles.inputLabel}>Location *</Text>
              <TextInput
                style={[styles.input, { marginBottom: 16 }]}
                placeholder="e.g. Server Room 1, Floor 2"
                placeholderTextColor={colors.subText}
                value={location}
                onChangeText={setLocation}
              />

              <Text style={styles.inputLabel}>Purchase Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                activeOpacity={0.85}
                onPress={() => setShowDatePicker(true)}>
                <Feather name="calendar" size={16} color={colors.subText} />
                <Text style={styles.dateText}>{purchaseDate.toLocaleDateString()}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={purchaseDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Threshold Configuration Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Threshold Settings</Text>

              {/* Threshold Mode Selector */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, thresholdType === 'global' && styles.tabButtonActive]}
                  onPress={() => setThresholdType('global')}>
                  <Text style={[styles.tabText, thresholdType === 'global' && styles.tabTextActive]}>
                    Group Threshold
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.tabButton, thresholdType === 'individual' && styles.tabButtonActive]}
                  onPress={() => setThresholdType('individual')}>
                  <Text style={[styles.tabText, thresholdType === 'individual' && styles.tabTextActive]}>
                    Individually
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Global Threshold Input with - and + */}
              {thresholdType === 'global' && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Global Threshold Temperature (°C)</Text>
                  <CounterInput
                    value={globalThreshold}
                    onChange={setGlobalThreshold}
                    placeholder="0"
                    styles={styles}
                    colors={colors}
                  />
                </View>
              )}

              {/* Individual Threshold Inputs with - and + */}
              {thresholdType === 'individual' && (
                <View style={{ marginTop: 12 }}>
                  {probeCount > 0 ? (
                    Array.from({ length: probeCount }).map((_, idx) => (
                      <View key={idx} style={styles.fieldGroup}>
                        <Text style={styles.inputLabel}>Probe {idx + 1} Temperature (°C)</Text>
                        <CounterInput
                          value={individualThresholds[`probe_${idx + 1}`] || ''}
                          onChange={(val) => handleIndividualThresholdChange(idx, val)}
                          placeholder="0"
                          styles={styles}
                          colors={colors}
                        />
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: colors.subText, fontSize: 13 }}>
                      Individual thresholds are supported when a multi-probe device (e.g. IntelliTemp 4P) is selected.
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Notification Alerts Settings */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Alert Notifications</Text>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setEmailEnabled(!emailEnabled)}>
                <Text style={styles.checkbox}>{emailEnabled ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxLabel}>Email Alert</Text>
              </TouchableOpacity>

              {emailEnabled && (
                <TextInput
                  style={[styles.input, { marginBottom: 16 }]}
                  placeholder="Enter Email"
                  placeholderTextColor={colors.subText}
                  keyboardType="email-address"
                  value={alertEmail}
                  onChangeText={setAlertEmail}
                />
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setSmsEnabled(!smsEnabled)}>
                <Text style={styles.checkbox}>{smsEnabled ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxLabel}>SMS Alert</Text>
              </TouchableOpacity>

              {smsEnabled && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter Phone Number"
                  placeholderTextColor={colors.subText}
                  keyboardType="phone-pad"
                  value={smsPhone}
                  onChangeText={setSmsPhone}
                />
              )}

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setWhatsAppEnabled(!whatsAppEnabled)}>
                <Text style={styles.checkbox}>{whatsAppEnabled ? '☑' : '☐'}</Text>
                <Text style={styles.checkboxLabel}>WhatsApp Alert (Optional)</Text>
              </TouchableOpacity>

              {whatsAppEnabled && (
                <TextInput
                  style={styles.input}
                  placeholder="Enter WhatsApp Number"
                  placeholderTextColor={colors.subText}
                  keyboardType="phone-pad"
                  value={whatsAppAlert}
                  onChangeText={setWhatsAppAlert}
                />
              )}
            </View>

            {/* Submission Button */}
            <TouchableOpacity
              style={styles.registerButton}
              activeOpacity={0.85}
              onPress={onRegister}>
              <Text style={styles.registerButtonText}>Register Product</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Device Picker Modal */}
      <Modal visible={showDevicePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDevicePicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Device</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {DEVICE_LIST.map((dev) => (
                <TouchableOpacity
                  key={dev}
                  style={styles.deviceOption}
                  onPress={() => handleDeviceSelect(dev)}>
                  <Text style={styles.deviceOptionText}>{dev}</Text>
                  {manualForm['Device Name'] === dev && (
                    <Feather name="check" size={16} color="#7F2E94" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const Row = ({ label, value, last, styles }) => {
  return (
    <View style={[styles.row, last && { marginBottom: 0 }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value || '-'}
      </Text>
    </View>
  );
};

export default ProductRegistrationScreen;

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 48,
    },
    screenTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.4,
    },
    screenSubtitle: {
      fontSize: 14,
      color: colors.subText,
      marginTop: 6,
      marginBottom: 24,
    },
    modeToggleContainer: {
      flexDirection: 'row',
      backgroundColor: colors.border,
      borderRadius: 14,
      padding: 4,
      marginBottom: 24,
    },
    modeButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      borderRadius: 11,
    },
    modeButtonActive: {
      backgroundColor: colors.card,
      elevation: 2,
    },
    modeIcon: {
      marginRight: 6,
    },
    modeButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.subText,
    },
    modeButtonTextActive: {
      color: colors.text,
    },
    scannerContainer: {
      alignItems: 'center',
      marginBottom: 28,
    },
    cameraBox: {
      width: '100%',
      height: 300,
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: '#0B0D12',
      borderWidth: 1,
      borderColor: colors.border,
    },
    camera: {
      width: '100%',
      height: '100%',
    },
    scanLine: {
      position: 'absolute',
      left: 20,
      right: 20,
      top: 28,
      height: 2,
      backgroundColor: '#4F46E5',
    },
    corner: {
      position: 'absolute',
      width: 28,
      height: 28,
      borderColor: '#fff',
    },
    topLeft: { top: 20, left: 20, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 8 },
    topRight: { top: 20, right: 20, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 8 },
    bottomLeft: { bottom: 20, left: 20, borderBottomWidth: 2.5, borderLeftWidth: 2.5, borderBottomLeftRadius: 8 },
    bottomRight: { bottom: 20, right: 20, borderBottomWidth: 2.5, borderRightWidth: 2.5, borderBottomRightRadius: 8 },
    scanText: { fontSize: 13, color: colors.subText, marginTop: 16 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    fieldGroup: {
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.subText,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    counterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 12,
      overflow: 'hidden',
    },
    counterBtn: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.border,
    },
    counterInput: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      paddingVertical: 10,
    },
    dropdownTrigger: {
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dropdownTriggerText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    probeChipContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    probeChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    probeChipActive: {
      backgroundColor: '#7F2E94',
      borderColor: '#7F2E94',
    },
    probeChipText: {
      color: colors.subText,
      fontWeight: '600',
    },
    probeChipTextActive: {
      color: '#FFF',
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.border,
      borderRadius: 10,
      padding: 3,
      marginBottom: 10,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 8,
    },
    tabButtonActive: {
      backgroundColor: colors.card,
    },
    tabText: {
      fontSize: 13,
      color: colors.subText,
      fontWeight: '600',
    },
    tabTextActive: {
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    label: { fontSize: 14, color: colors.subText },
    value: { fontSize: 14, fontWeight: '600', color: colors.text },
    editLinkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 6 },
    editLink: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
    },
    dateText: { fontSize: 15, color: colors.text },
    registerButton: {
      backgroundColor: '#7F2E94',
      paddingVertical: 16,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    registerButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    checkbox: { fontSize: 20, marginRight: 10, color: colors.text },
    checkboxLabel: { color: colors.text },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    deviceOption: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    deviceOptionText: { fontSize: 15, color: colors.text },
  });