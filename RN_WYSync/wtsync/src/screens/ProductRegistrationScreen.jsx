import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';

import { Camera } from 'react-native-camera-kit';
import Feather from 'react-native-vector-icons/Feather';

import { registerProduct } from '../services/ProductApi';
import { getUserDetails } from '../services/AuthService';
import { useAppTheme } from '../services/theme';
import PowerSupplyAlert from '../components/PowerSupplyAlert';

const DEVICE_LIST = [
  'IntelliTemp 4P',
  'IntelliTemp 12P',
  'IntelliTemp 24P',
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
  'IntelliTemp 4P': ['4P'],
  'IntelliTemp 12P': ['12P'],
  'IntelliTemp 24P': ['24P'],
};

const SCAN_BOX_HEIGHT = 230;

const SAFETY_STEPS = [
  {
    title: 'Use the approved power connection',
    desc: 'IntelliTemp uses an internal AC/DC supply. Follow the supplied installation instructions.',
  },
  {
    title: 'Keep the phone near the device',
    desc: "Stay within the setup network's range.",
  },
  {
    title: 'Have site Wi-Fi details ready',
    desc: 'Use an approved 2.4 GHz network.',
  },
];

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

  console.log('PARSED QR DATA: ', result);

  return Object.keys(result).length > 0 ? result : null;
};

const EMPTY_FORM = {
  'Device Name': 'IntelliTemp 4P',
  'Serial No': '',
};

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

const ProductRegistrationScreen = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets);

  const [mode, setMode] = useState('scan');
  const [product, setProduct] = useState(null);
  const [scannedData, setScannedData] = useState(null); // parsed QR waiting for confirmation
  const [pendingDevice, setPendingDevice] = useState(null); // device waiting on the confirm screen
  const [showSafety, setShowSafety] = useState(false); // step 2: prepare the device safely
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [manualForm, setManualForm] = useState(EMPTY_FORM);

  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [selectedProbe, setSelectedProbe] = useState('4P');

  const [thresholdType, setThresholdType] = useState('global');
  const [globalThreshold, setGlobalThreshold] = useState('');
  const [individualThresholds, setIndividualThresholds] = useState({});

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

  const [deviceSetupComplete, setDeviceSetupComplete] = useState(false);
  const [showPowerAlert, setShowPowerAlert] = useState(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const invalidAlertShownRef = useRef(false);

  // Hide tab bar completely for this screen
  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'none' },
    });

    const parentNav = navigation.getParent();
    if (parentNav) {
      parentNav.setOptions({
        tabBarStyle: { display: 'none' },
      });
    }

    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
      if (parentNav) {
        parentNav.setOptions({
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

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

  const consumedProductRef = useRef(null);

  const resetForm = useCallback(() => {
    setMode('scan');
    setProduct(null);
    setScannedData(null);
    setPendingDevice(null);
    setShowSafety(false);
    setSafetyConfirmed(false);
    invalidAlertShownRef.current = false;
    setManualForm(EMPTY_FORM);
    setShowDatePicker(false);
    setPurchaseDate(new Date());
    setGlobalThreshold('');
    setIndividualThresholds({});
    setThresholdType('global');
    setSelectedProbe('4P');
    setEmailEnabled(false);
    setSmsEnabled(false);
    setAlertEmail('');
    setSmsPhone('');
    setLocation('');
    setWhatsAppEnabled(false);
    setWhatsAppAlert('');
    setDeviceSetupComplete(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const incomingProduct = route.params?.product;

      if (incomingProduct) {
        if (consumedProductRef.current !== incomingProduct) {
          consumedProductRef.current = incomingProduct;
          setProduct(incomingProduct);
          setMode('manual');
          setDeviceSetupComplete(true);
        }
        setShowPowerAlert(false);
      } else {
        resetForm();
        setShowPowerAlert(true);
      }
    }, [route.params?.product, resetForm])
  );

  const switchMode = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setProduct(null);
    setScannedData(null);
    setPendingDevice(null);
    setShowSafety(false);
    setSafetyConfirmed(false);
    invalidAlertShownRef.current = false;
  };

  const updateManualField = (key, value) => {
    setManualForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeviceSelect = (device) => {
    updateManualField('Device Name', device);
    setShowDevicePicker(false);

    if (PROBE_OPTIONS[device]) {
      setSelectedProbe(PROBE_OPTIONS[device][0]);
    } else {
      setSelectedProbe('');
    }
    setIndividualThresholds({});
  };

  const handleConfirmPower = useCallback(() => {
    setShowPowerAlert(false);
  }, []);

  const handleCancelPower = useCallback(() => {
    setShowPowerAlert(false);
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const getProbeCount = () => {
    if (!selectedProbe) return 0;
    const match = selectedProbe.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  const onManualSubmit = () => {
    if (!manualForm['Device Name'] || !manualForm['Device Name'].trim()) {
      Alert.alert('Validation Error', 'Please select a product model.');
      return;
    }

    if (!manualForm['Serial No'] || !manualForm['Serial No'].trim()) {
      Alert.alert('Validation Error', 'Please enter device serial number.');
      return;
    }

    const constructedProduct = {
      'Device Name': manualForm['Device Name'].trim(),
      'Model No': manualForm['Device Name'].trim(),
      'Serial No': manualForm['Serial No'].trim(),
      'MAC ID': 'N/A',
    };

    setPendingDevice(constructedProduct);
  };

  // "Use scanned device" button
  const onUseScannedDevice = () => {
    if (!scannedData) {
      Alert.alert(
        'No device scanned',
        'Align the QR code on your device label within the frame to scan it.'
      );
      return;
    }
    setPendingDevice(scannedData);
  };

  const onSampleLabelPress = () => {
    Alert.alert(
      'Sample label',
      'The QR code is printed on the label of your IntelliTemp device. It includes Device Name, Model No, Serial No and MAC ID.'
    );
  };

  const onScanAgain = () => {
    setPendingDevice(null);
    setShowSafety(false);
    setSafetyConfirmed(false);
    setScannedData(null);
    invalidAlertShownRef.current = false;
    setMode('scan');
  };

  const onSetupDevice = () => {
    if (!pendingDevice) return;

    const serialNumber = pendingDevice['Serial No'] || '';
    if (!serialNumber) {
      Alert.alert('Validation Error', 'Serial Number is missing in product details.');
      return;
    }

    setSafetyConfirmed(false);
    setShowSafety(true);
  };

  const onFindDevice = () => {
    if (!pendingDevice || !safetyConfirmed) return;

     console.log("serial number sejal " , pendingDevice['Serial No'])
     
    navigation.navigate('FindIntelliTempDevice', {
      product: pendingDevice,
      autoConnect: true,
      serialNo: pendingDevice['Serial No'] || '',
    });
  };

  const onContinueToConfig = () => {
    if (!product) {
      Alert.alert('Validation Error', 'Product details are missing');
      return;
    }

    const serialNumber = product['Serial No'] || product['serial_no'] || '';

    if (!serialNumber) {
      Alert.alert('Validation Error', 'Serial Number is missing in product details.');
      return;
    }

    navigation.navigate('FindIntelliTempDevice', {
      product: pendingDevice,
      autoConnect: true,
      serialNo: serialNumber,
    });
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
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main' }],
              });
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

  // Start the camera only when the scan view is actually visible
  // (same approach as the working scanner: mount <Camera> only while active)
  useEffect(() => {
    const scanViewVisible = mode === 'scan' && !product && !pendingDevice && !showPowerAlert;
    setIsCameraActive(scanViewVisible);
  }, [mode, product, pendingDevice, showPowerAlert]);

  useEffect(() => {
    if (!isCameraActive) return undefined;

    scanAnimation.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: SCAN_BOX_HEIGHT - 2,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCameraActive, scanAnimation]);

  const onReadCode = (event) => {
    const qrData = event.nativeEvent.codeStringValue;

    console.log('QR Scanned: ', qrData);

    if (!qrData) {
      Alert.alert('Invalid QR', 'QR code data is empty.');
      return;
    }

    const parsed = parseQR(qrData);

    console.log('PARSED DATA:', parsed);

    if (!parsed) {
      Alert.alert('Invalid QR', 'QR Code format is not valid.');
      return;
    }

    setScannedData(parsed);
    setIsCameraActive(false);
    Alert.alert('Success', 'QR Code scanned successfully!');
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setPurchaseDate(selectedDate);
  };

  const probeCount = getProbeCount();
  const isScanMode = mode === 'scan' && !product && !pendingDevice;
  const isManualMode = mode === 'manual' && !product && !pendingDevice;
  const isConfirmMode = !!pendingDevice && !product && !showSafety;
  const isSafetyMode = !!pendingDevice && !product && showSafety;
  const activeSteps = isSafetyMode ? 2 : 1;

  // Confirm-screen display values.
  // Works for both manual entry ("IntelliTemp 4P") and scanned QR data, where the
  // model can come from "Device Name" and/or "Model No" in a different format.
  const confirmName = (pendingDevice?.['Device Name'] || '').trim();
  const confirmModelNo = (pendingDevice?.['Model No'] || '').trim();
  const confirmSource = `${confirmName} ${confirmModelNo}`;
  const confirmIsIntelliTemp = /intelli\s*-?\s*temp/i.test(confirmSource);
  const confirmProbeMatch = confirmIsIntelliTemp
    ? confirmSource.match(/(\d{1,2})\s*-?\s*P(?![a-z])/i)
    : null;
  const confirmProbeCount = confirmProbeMatch ? parseInt(confirmProbeMatch[1], 10) : 0;
  const confirmSeries = confirmIsIntelliTemp ? 'IntelliTemp' : confirmName || confirmModelNo;
  const confirmModel = confirmProbeCount > 0 ? `${confirmProbeCount}P` : '';
  const confirmInputsValue =
    confirmProbeCount > 0
      ? `${confirmProbeCount} · ${Array.from(
          { length: Math.min(confirmProbeCount, 4) },
          (_, i) => `T${i + 1}`
        ).join(', ')}${confirmProbeCount > 4 ? '…' : ''}`
      : '';

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (showSafety) {
                setShowSafety(false);
                setSafetyConfirmed(false);
                return;
              }
              if (pendingDevice) {
                setPendingDevice(null);
                return;
              }
              navigation.canGoBack() && navigation.goBack();
            }}>
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
        {/* Step Progress Indicators */}
        <View style={styles.stepProgressContainer}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.stepBar,
                i < activeSteps && styles.stepBarActive,
                i === 5 && { marginRight: 0 },
              ]}
            />
          ))}
        </View>

        <Text style={styles.stepSubtitle}>
          {isSafetyMode ? 'STEP 2 OF 6 · CONNECT' : 'STEP 1 OF 6 · IDENTIFY'}
        </Text>
        <Text style={styles.stepTitle}>
          {isSafetyMode
            ? 'Prepare the device safely.'
            : isConfirmMode
            ? `This is your ${confirmSeries}.`
            : isScanMode
            ? 'Scan the device label.'
            : 'Identify your device.'}
        </Text>
        <Text style={styles.stepDescription}>
          {isSafetyMode
            ? 'App commissioning comes after safe installation.'
            : isConfirmMode
            ? 'Confirm the model before connecting.'
            : isScanMode
            ? 'Align the QR code within the frame.'
            : 'Enter the details from the product label.'}
        </Text>

        {/* Prepare the device safely (Step 2) */}
        {isSafetyMode && (
          <View>
            <View style={styles.warningBanner}>
              <View style={styles.warningIcon}>
                <Feather name="shield" size={18} color="#8A5A12" />
                <Text style={styles.warningIconMark}>!</Text>
              </View>
              <Text style={styles.warningText}>
                Do not open, access or wire an energised electrical panel. Installation must be
                completed by a qualified person.
              </Text>
            </View>

            <View style={styles.safetyCard}>
              {SAFETY_STEPS.map((item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.safetyRow,
                    index === SAFETY_STEPS.length - 1 && styles.safetyRowLast,
                  ]}>
                  <View style={styles.safetyNumber}>
                    <Text style={styles.safetyNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.safetyTextWrap}>
                    <Text style={styles.safetyTitle}>{item.title}</Text>
                    <Text style={styles.safetyDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.checkboxRow}
              activeOpacity={0.7}
              onPress={() => setSafetyConfirmed((prev) => !prev)}>
              <View style={[styles.checkbox, safetyConfirmed && styles.checkboxChecked]}>
                {safetyConfirmed && <Feather name="check" size={14} color="#FFF" />}
              </View>
              <Text style={styles.checkboxText}>
                I confirm installation is complete and it is safe to commission the device.
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Confirm Device View */}
        {isConfirmMode && (
          <View>
            <View style={styles.confirmCard}>
              <View style={styles.confirmTopRow}>
                <View>
                  <Text style={styles.confirmSeries}>{confirmSeries.toUpperCase()}</Text>
                  {!!confirmModel && <Text style={styles.confirmModel}>{confirmModel}</Text>}
                </View>
                <Feather name="thermometer" size={34} color="#8B2A8B" />
              </View>

              {!!confirmInputsValue && (
                <View style={styles.confirmRow}>
                  <Text style={styles.label}>Primary temperature inputs</Text>
                  <Text style={styles.value}>{confirmInputsValue}</Text>
                </View>
              )}

              <View style={styles.confirmRow}>
                <Text style={styles.label}>Device identity</Text>
                <Text style={styles.value}>{pendingDevice['Serial No'] || '-'}</Text>
              </View>

              <View style={styles.confirmRow}>
                <Text style={styles.label}>Connection</Text>
                <Text style={styles.value}>Wi-Fi</Text>
              </View>

              <View style={[styles.confirmRow, styles.confirmRowLast]}>
                <Text style={styles.label}>Registration check</Text>
                <View style={styles.availableBadge}>
                  <Feather name="check" size={11} color="#15803D" />
                  <Text style={styles.availableBadgeText}>Available</Text>
                </View>
              </View>
            </View>

            {confirmProbeCount > 0 && (
              <View style={styles.hintCard}>
                <Feather name="grid" size={16} color="#8B2A8B" style={styles.hintIcon} />
                <Text style={styles.hintText}>
                  {confirmProbeCount === 4
                    ? 'The four temperature inputs will stay visible throughout setup and monitoring.'
                    : `The ${confirmProbeCount} temperature inputs will stay visible throughout setup and monitoring.`}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.notDeviceRow}
              activeOpacity={0.7}
              onPress={onScanAgain}>
              <Feather name="maximize" size={14} color="#8B2A8B" />
              <Text style={styles.notDeviceText}>Not this device? Scan again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Manual Form View */}
        {isManualMode && (
          <View style={styles.formContainer}>
            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Product model</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                activeOpacity={0.8}
                onPress={() => setShowDevicePicker(true)}>
                <Text style={styles.dropdownTriggerText}>
                  {manualForm['Device Name'] || 'Select Product Model'}
                </Text>
                <Feather name="chevron-down" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.inputLabel}>Device serial number</Text>
              <TextInput
                style={styles.input}
                placeholder="DEMO-4P-001"
                placeholderTextColor="#A1A1AA"
                autoCapitalize="characters"
                value={manualForm['Serial No']}
                onChangeText={(text) => updateManualField('Serial No', text)}
              />
            </View>

            {/* Confirmation Banner */}
            <View style={styles.infoBannerCard}>
              <View style={styles.checkIconWrapper}>
                <Feather name="check" size={14} color="#8B2A8B" />
              </View>
              <Text style={styles.infoBannerText}>
                The registered device profile will confirm the model and supported channels.
              </Text>
            </View>

            {/* Scan QR switch button */}
            <TouchableOpacity
              style={styles.scanInsteadButton}
              activeOpacity={0.7}
              onPress={() => switchMode('scan')}>
              <Feather name="maximize" size={18} color="#8B2A8B" style={{ marginRight: 8 }} />
              <Text style={styles.scanInsteadText}>Scan QR instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Camera / QR Scanner Section */}
        {isScanMode && (
          <View style={styles.scannerWrapper}>
            <View style={styles.cameraBox}>
              {isCameraActive ? (
                <Camera
                  style={styles.camera}
                  scanBarcode={true}
                  onReadCode={onReadCode}
                />
              ) : (
                <TouchableOpacity
                  style={styles.cameraIdle}
                  activeOpacity={0.8}
                  onPress={() => {
                    setScannedData(null);
                    setIsCameraActive(true);
                  }}>
                  <Feather
                    name={scannedData ? 'check-circle' : 'camera'}
                    size={30}
                    color={scannedData ? '#22C55E' : '#D9A6D9'}
                  />
                  <Text style={styles.cameraIdleText}>
                    {scannedData ? 'QR scanned · tap to scan again' : 'Tap to start scanner'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Scan line */}
              {isCameraActive && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanAnimation }] },
                  ]}
                />
              )}

              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            {/* Camera status row */}
            <View style={styles.cameraStatusRow}>
              <View style={styles.cameraStatusLeft}>
                <Feather name="camera" size={12} color="#9CA3AF" />
                <Text style={styles.cameraStatusText}>Camera permission required</Text>
              </View>
              <TouchableOpacity activeOpacity={0.7} onPress={onSampleLabelPress}>
                <Text style={styles.sampleLabelText}>Sample label</Text>
              </TouchableOpacity>
            </View>

            {/* Hint card */}
            <View style={styles.hintCard}>
              <Feather name="maximize" size={16} color="#8B2A8B" style={styles.hintIcon} />
              <Text style={styles.hintText}>
                Use the label on your IntelliTemp device, not a carton or another installed unit.
              </Text>
            </View>
          </View>
        )}

        {/* Product Details Summary */}
        {product && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Product Details</Text>
              <Feather name="check-circle" size={16} color="#22C55E" />
            </View>

            <Row label="Device Name" value={product['Device Name']} styles={styles} />
            <Row label="Model No" value={product['Model No']} styles={styles} />
            <Row label="Serial No" value={product['Serial No']} styles={styles} />

            <TouchableOpacity
              style={styles.editLinkRow}
              onPress={() => {
                setProduct(null);
                setScannedData(null);
                setDeviceSetupComplete(false);
              }}>
              <Feather name="edit-3" size={14} color="#8B2A8B" />
              <Text style={styles.editLink}>Edit Details</Text>
            </TouchableOpacity>

            {deviceSetupComplete ? (
              <View style={styles.setupCompleteBadge}>
                <View style={styles.setupCompleteIconWrap}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
                <Text style={styles.setupCompleteText}>Device Setup Complete</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryActionButton, { marginTop: 16 }]}
                activeOpacity={0.85}
                onPress={onContinueToConfig}>
                <Text style={styles.primaryActionButtonText}>Continue to Device Setup</Text>
                <Feather name="arrow-right" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {product && (
          <>
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

            <TouchableOpacity
              style={styles.primaryActionButton}
              activeOpacity={0.85}
              onPress={onRegister}>
              <Text style={styles.primaryActionButtonText}>Register Product</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Footer Sheet - Scan mode */}
      {isScanMode && (
        <View style={styles.bottomFooterSheet}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            activeOpacity={0.85}
            onPress={onUseScannedDevice}>
            <Text style={styles.primaryActionButtonText}>Use scanned device</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionButton}
            activeOpacity={0.7}
            onPress={() => switchMode('manual')}>
            <Text style={styles.secondaryActionButtonText}>Enter details manually</Text>
          </TouchableOpacity>

          <View style={styles.brandFooterRow}>
            <Text style={styles.brandFooterText}>
              Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Footer Sheet - Safety mode */}
      {isSafetyMode && (
        <View style={styles.bottomFooterSheet}>
          <TouchableOpacity
            style={[styles.primaryActionButton, !safetyConfirmed && styles.primaryActionButtonDisabled]}
            activeOpacity={0.85}
            disabled={!safetyConfirmed}
            onPress={onFindDevice}>
            <Text style={styles.primaryActionButtonText}>
              Find {confirmSeries || 'device'}
            </Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.brandFooterRow}>
            <Text style={styles.brandFooterText}>
              Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Footer Sheet - Confirm mode */}
      {isConfirmMode && (
        <View style={styles.bottomFooterSheet}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            activeOpacity={0.85}
            onPress={onSetupDevice}>
            <Text style={styles.primaryActionButtonText}>Set up device</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.brandFooterRow}>
            <Text style={styles.brandFooterText}>
              Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Footer Sheet - Manual mode */}
      {isManualMode && (
        <View style={styles.bottomFooterSheet}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            activeOpacity={0.85}
            onPress={onManualSubmit}>
            <Text style={styles.primaryActionButtonText}>Verify device</Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.brandFooterRow}>
            <Text style={styles.brandFooterText}>
              Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Device Selection Modal */}
      <Modal visible={showDevicePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDevicePicker(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Product Model</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {DEVICE_LIST.map((dev) => (
                <TouchableOpacity
                  key={dev}
                  style={styles.deviceOption}
                  onPress={() => handleDeviceSelect(dev)}>
                  <Text style={styles.deviceOptionText}>{dev}</Text>
                  {manualForm['Device Name'] === dev && (
                    <Feather name="check" size={16} color="#8B2A8B" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <PowerSupplyAlert
        visible={showPowerAlert}
        onConfirm={handleConfirmPower}
        onCancel={handleCancelPower}
      />
    </View>
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

const createStyles = (colors, insets) =>
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
    formContainer: {
      width: '100%',
    },
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
    infoBannerCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F8F4FA',
      padding: 16,
      borderRadius: 14,
      marginTop: 6,
      marginBottom: 20,
    },
    checkIconWrapper: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: '#8B2A8B',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      color: '#6B7280',
      lineHeight: 18,
    },
    scanInsteadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    scanInsteadText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#8B2A8B',
    },

    /* ---------- QR scan section ---------- */
    scannerWrapper: {
      width: '100%',
    },
    cameraBox: {
      width: '100%',
      height: SCAN_BOX_HEIGHT,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: '#2D2B33',
      position: 'relative',
    },
    camera: {
      width: '100%',
      height: '100%',
    },
    cameraIdle: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    cameraIdleText: {
      fontSize: 13,
      color: '#D1D5DB',
      fontWeight: '600',
    },
    scanLine: {
      position: 'absolute',
      left: 40,
      right: 40,
      top: 0,
      height: 1.5,
      backgroundColor: '#D9A6D9',
    },
    corner: {
      position: 'absolute',
      width: 26,
      height: 26,
      borderColor: '#C77DC7',
    },
    topLeft: { top: 18, left: 36, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 4 },
    topRight: { top: 18, right: 36, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 4 },
    bottomLeft: { bottom: 18, left: 36, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 4 },
    bottomRight: { bottom: 18, right: 36, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 4 },

    cameraStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 2,
    },
    cameraStatusLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    cameraStatusText: {
      fontSize: 12,
      color: '#9CA3AF',
    },
    sampleLabelText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#6B7280',
    },
    hintCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#F0F0F3',
      borderRadius: 12,
      padding: 14,
      marginTop: 16,
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

    /* ---------- Prepare the device safely ---------- */
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: '#FBF1DC',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    warningIcon: {
      width: 18,
      height: 18,
      marginRight: 10,
      marginTop: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    warningIconMark: {
      position: 'absolute',
      top: 3,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 9,
      lineHeight: 11,
      fontWeight: '900',
      color: '#8A5A12',
      includeFontPadding: false,
    },
    warningText: {
      flex: 1,
      fontSize: 12.5,
      lineHeight: 18,
      color: '#8A5A12',
    },
    safetyCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 16,
    },
    safetyRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#EDEDF0',
    },
    safetyRowLast: {
      borderBottomWidth: 0,
    },
    safetyNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 1,
    },
    safetyNumberText: {
      fontSize: 11,
      color: '#9CA3AF',
      fontWeight: '600',
    },
    safetyTextWrap: {
      flex: 1,
    },
    safetyTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#111827',
    },
    safetyDesc: {
      fontSize: 12.5,
      lineHeight: 18,
      color: '#6B7280',
      marginTop: 3,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 20,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: '#9CA3AF',
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: '#8B2A8B',
      borderColor: '#8B2A8B',
    },
    checkboxText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: '#4B5563',
    },

    /* ---------- Confirm device screen ---------- */
    confirmCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 4,
    },
    confirmTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 14,
    },
    confirmSeries: {
      fontSize: 12,
      color: '#6B7280',
      letterSpacing: 0.6,
    },
    confirmModel: {
      fontSize: 28,
      fontWeight: '800',
      color: '#111827',
      marginTop: 2,
    },
    confirmRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: '#EDEDF0',
    },
    confirmRowLast: {
      // keeps last row spacing balanced inside the card
    },
    availableBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#DCFCE7',
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      gap: 4,
    },
    availableBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#15803D',
    },
    notDeviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 22,
    },
    notDeviceText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#8B2A8B',
    },

    card: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 14,
    },
    cardTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
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
    primaryActionButtonDisabled: {
      opacity: 0.4,
    },
    secondaryActionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFF',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 10,
    },
    secondaryActionButtonText: {
      color: '#8B2A8B',
      fontSize: 15,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    label: {
      fontSize: 13,
      color: '#6B7280',
    },
    value: {
      fontSize: 13,
      fontWeight: '600',
      color: '#111827',
    },
    editLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 14,
      gap: 6,
    },
    editLink: {
      fontSize: 13,
      fontWeight: '600',
      color: '#8B2A8B',
    },
    setupCompleteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#DCFCE7',
      borderRadius: 10,
      paddingVertical: 10,
      marginTop: 14,
      gap: 8,
    },
    setupCompleteIconWrap: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#22C55E',
      alignItems: 'center',
      justifyContent: 'center',
    },
    setupCompleteText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#15803D',
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 10,
    },
    dateText: {
      fontSize: 14,
      color: '#111827',
    },
    counterContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#E5E7EB',
      borderRadius: 10,
      overflow: 'hidden',
    },
    counterBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: '#F3F4F6',
    },
    counterInput: {
      flex: 1,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '600',
      color: '#111827',
      paddingVertical: 8,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      backgroundColor: '#FFF',
      borderRadius: 16,
      padding: 20,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 12,
    },
    deviceOption: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    deviceOptionText: {
      fontSize: 14,
      color: '#111827',
    },
  });