import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  inputBg: '#F9FAFB',
  border: '#E5E7EB',
  divider: '#EFECEF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  icon: '#333333',
  accent: '#8B2A8B',
  seenBg: '#15803D',
  onAccent: '#FFFFFF',
  alertTemp: '#D9532F',
  openBadgeBg: '#FDF2EE',
  openBadgeBorder: '#F3C7B8',
  openBadgeText: '#C84B28',
  seenBadgeBg: '#ECFDF5',
  seenBadgeBorder: '#A7F3D0',
  seenBadgeText: '#15803D',
  warningBg: '#FBF1D6',
  warningBorder: '#F2DFAA',
  warningText: '#7C5A24',
  warningIcon: '#9A6B2F',
  footerText: '#6E6577',
  footerBrand: '#7B2B75',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  inputBg: '#1E1A22',
  border: '#3A3540',
  divider: '#3A3540',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  icon: '#FFFFFF',
  accent: '#E5A0DC',
  seenBg: '#166534',
  onAccent: '#2A1230',
  alertTemp: '#F97352',
  openBadgeBg: '#3A1F1A',
  openBadgeBorder: '#6B3429',
  openBadgeText: '#FCA58E',
  seenBadgeBg: '#183324',
  seenBadgeBorder: '#26593C',
  seenBadgeText: '#86EFAC',
  warningBg: '#332914',
  warningBorder: '#5C491F',
  warningText: '#F3D28B',
  warningIcon: '#EAB308',
  footerText: '#A1A1AA',
  footerBrand: '#E5A0DC',
};

const formatTimeShort = (input) => {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return '14:00';
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatDurationText = (minutes) => {
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins <= 0) return 'just now';
  if (mins === 1) return 'for 1 minute';
  return `for ${Math.round(mins)} minutes`;
};

const TemperatureAlertScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(insets, colors), [insets, colors]);

  const params = route?.params || {};
  const alertData = params.alert || params;

  const probeCode =
    alertData.probe ||
    alertData.point ||
    alertData.probeId ||
    'T1';

  const probeLabel =
    alertData.label ||
    alertData.probeLabel ||
    alertData.title ||
    'Incomer R phase';

  const probeType =
    alertData.probeType ||
    alertData.probe_type ||
    '4P';

  const rawTemp =
    alertData.temperature ??
    alertData.currentTemp ??
    alertData.value ??
    alertData.reading;

  const formattedTemp = useMemo(() => {
    if (
      rawTemp === undefined ||
      rawTemp === null ||
      String(rawTemp).trim() === ''
    ) {
      return '--.-';
    }
    const num = Number(rawTemp);
    return Number.isFinite(num) ? num.toFixed(1) : String(rawTemp);
  }, [rawTemp]);

  const thresholdValue =
    alertData.threshold ??
    alertData.highLimit ??
    alertData.limit ??
    '65';

  const durationMinutes =
    alertData.durationMinutes ??
    alertData.elapsedMinutes ??
    4;

  const [isSeen, setIsSeen] = useState(Boolean(alertData.isSeen));
  const [seenAtTime, setSeenAtTime] = useState(
    alertData.seenAt ? formatTimeShort(alertData.seenAt) : ''
  );

  // Acknowledge form state
  const [attendedBy, setAttendedBy] = useState(alertData.attendedBy || '');
  const [timeInput, setTimeInput] = useState(
    alertData.attendedTime || formatTimeShort(new Date())
  );
  const [issueInput, setIssueInput] = useState(alertData.issue || '');
  const [submittedRecord, setSubmittedRecord] = useState(null);

  useEffect(() => {
    if (typeof alertData.isSeen === 'boolean') {
      setIsSeen(alertData.isSeen);
    }
    if (alertData.seenAt) {
      setSeenAtTime(formatTimeShort(alertData.seenAt));
    }
  }, [alertData.isSeen, alertData.seenAt]);

  const triggeredAt = formatTimeShort(
    alertData.triggeredAt || alertData.timestamp
  );
  const notifiedAt = formatTimeShort(
    alertData.notifiedAt || alertData.sentAt
  );
  const currentEventTime = formatTimeShort(
    alertData.updatedAt || alertData.timestamp
  );

  const onBack = () => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate('Commissioned', {
      serialNo: alertData.serialNo || alertData.deviceId,
    });
  };

  const applyAcknowledge = (extraFields = {}) => {
    const loggedTime =
      String(extraFields.time || timeInput || '').trim() ||
      formatTimeShort(new Date());

    setIsSeen(true);
    setSeenAtTime(loggedTime);

    if (typeof params.onAcknowledge === 'function') {
      params.onAcknowledge({
        probe: probeCode,
        serialNo: alertData.serialNo || alertData.deviceId,
        seenAt: new Date().toISOString(),
        ...extraFields,
      });
    }
  };

  const onMarkAsSeen = () => {
    applyAcknowledge();
  };

  const onSubmitAcknowledgeForm = () => {
    const cleanAttendedBy = attendedBy.trim();
    const cleanTime = timeInput.trim() || formatTimeShort(new Date());
    const cleanIssue = issueInput.trim();

    if (!cleanAttendedBy) {
      Alert.alert('Missing field', 'Please enter who attended this alert.');
      return;
    }
    if (!cleanIssue) {
      Alert.alert('Missing field', 'Please enter the issue observed.');
      return;
    }

    const record = {
      attendedBy: cleanAttendedBy,
      time: cleanTime,
      issue: cleanIssue,
      probe: probeCode,
      serialNo: alertData.serialNo || alertData.deviceId || '',
      temperature: formattedTemp,
    };

    setTimeInput(cleanTime);
    setSubmittedRecord(record);
    applyAcknowledge(record);
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.75}
            onPress={onBack}>
            <Feather name="arrow-left" size={22} color={colors.icon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thermidity</Text>
          <Text style={styles.headerBadge}>{probeType}</Text>
        </View>

        <Image
          source={require('../assests/images/logo.png')}
          style={styles.brandLogo}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}>
        <Text style={styles.overline}>
          HIGH TEMPERATURE · LIVE THRESHOLD ALERT
        </Text>
        <Text style={styles.screenTitle}>
          High temperature at {probeCode}.
        </Text>
        <Text style={styles.screenSubtitle}>
          Mark the alert as seen, then inspect safely.
        </Text>

        {/* Probe Reading Card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.probeName}>{probeLabel}</Text>
            <View
              style={[
                styles.statusPill,
                isSeen ? styles.seenPill : styles.openPill,
              ]}>
              <Feather
                name={isSeen ? 'check-circle' : 'alert-triangle'}
                size={13}
                color={isSeen ? colors.seenBadgeText : colors.openBadgeText}
              />
              <Text
                style={[
                  styles.statusPillText,
                  isSeen ? styles.seenPillText : styles.openPillText,
                ]}>
                {isSeen ? 'Seen' : 'Open'}
              </Text>
            </View>
          </View>

          <View style={styles.tempRow}>
            <Text style={styles.tempValue}>{formattedTemp}</Text>
            <Text style={styles.tempUnit}>°C</Text>
          </View>

          <Text style={styles.limitMeta}>
            High limit {thresholdValue}°C · observed {formatDurationText(durationMinutes)}
          </Text>
        </View>

        {/* Event Timeline Card */}
        <View style={styles.card}>
          <View style={styles.timelineItem}>
            <Text style={styles.timelineTime}>{triggeredAt}</Text>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>Threshold condition met</Text>
              <Text style={styles.timelineDesc}>
                Valid {probeCode} samples at or above the high limit.
              </Text>
            </View>
          </View>

          <View style={styles.timelineDivider} />

          <View style={styles.timelineItem}>
            <Text style={styles.timelineTime}>{notifiedAt}</Text>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>
                Notification accepted by provider
              </Text>
              <Text style={styles.timelineDesc}>
                Alert opened for {probeCode} live temperature review.
              </Text>
            </View>
          </View>

          <View style={styles.timelineDivider} />

          <View style={styles.timelineItem}>
            <Text style={styles.timelineTime}>
              {isSeen && seenAtTime ? seenAtTime : currentEventTime}
            </Text>
            <View style={styles.timelineBody}>
              <Text style={styles.timelineTitle}>
                {isSeen ? 'Marked as seen' : 'Not yet marked as seen'}
              </Text>
              <Text style={styles.timelineDesc}>
                {submittedRecord
                  ? `Attended by ${submittedRecord.attendedBy} at ${submittedRecord.time} — ${submittedRecord.issue}`
                  : isSeen
                  ? 'Acknowledged in app; continue monitoring live probe temperature.'
                  : 'The temperature above-limit event remains open.'}
              </Text>
            </View>
          </View>
        </View>

        {/* Acknowledge Form */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Acknowledge form</Text>

          <Text style={styles.inputLabel}>Attended by</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter technician or operator name"
            placeholderTextColor={colors.textMuted}
            value={attendedBy}
            onChangeText={setAttendedBy}
          />

          <Text style={styles.inputLabel}>Time</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (e.g. 14:05)"
            placeholderTextColor={colors.textMuted}
            value={timeInput}
            onChangeText={setTimeInput}
          />

          <Text style={styles.inputLabel}>Issue</Text>
          <TextInput
            style={[styles.input, styles.issueInput]}
            placeholder="Describe observed issue or inspection note"
            placeholderTextColor={colors.textMuted}
            value={issueInput}
            onChangeText={setIssueInput}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.submitButton}
            activeOpacity={0.85}
            onPress={onSubmitAcknowledgeForm}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>

          {submittedRecord && (
            <Text style={styles.submittedNote}>
              Submitted: {submittedRecord.attendedBy} ({submittedRecord.time}) · {submittedRecord.issue}
            </Text>
          )}
        </View>

        {/* Safety Notice Banner */}
        <View style={styles.warningBanner}>
          <Feather
            name="shield"
            size={18}
            color={colors.warningIcon}
            style={styles.warningIcon}
          />
          <Text style={styles.warningText}>
            Marking as seen does not clear the reading, close maintenance work or prove the equipment is safe.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action & Footer */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            isSeen && styles.actionButtonSeen,
          ]}
          activeOpacity={0.85}
          onPress={onMarkAsSeen}>
          <Text style={styles.actionButtonText}>
            {isSeen ? 'Marked as seen' : 'Mark as seen'}
          </Text>
          <Feather
            name="check"
            size={18}
            color={colors.onAccent}
            style={styles.actionIcon}
          />
        </TouchableOpacity>

        <View style={styles.brandFooterRow}>
          <Text style={styles.brandFooterText}>
            Powered By <Text style={styles.brandFooterBold}>EVOLUZN</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

export default TemperatureAlertScreen;

const createStyles = (insets, c) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(insets.top, 12),
      paddingBottom: 14,
      backgroundColor: c.surface,
      borderBottomWidth: 1,
      borderBottomColor: c.divider,
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
      color: c.textPrimary,
    },
    headerBadge: {
      marginLeft: 8,
      fontSize: 13.5,
      fontWeight: '500',
      color: c.textSecondary,
    },
    brandLogo: {
      width: 96,
      height: 26,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 24,
    },
    overline: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.accent,
      letterSpacing: 0.9,
      marginBottom: 8,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.4,
    },
    screenSubtitle: {
      fontSize: 14.5,
      color: c.textSecondary,
      marginTop: 6,
      marginBottom: 20,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      marginBottom: 16,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    probeName: {
      flex: 1,
      fontSize: 15.5,
      fontWeight: '700',
      color: c.textPrimary,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
    },
    openPill: {
      backgroundColor: c.openBadgeBg,
      borderColor: c.openBadgeBorder,
    },
    openPillText: {
      color: c.openBadgeText,
    },
    seenPill: {
      backgroundColor: c.seenBadgeBg,
      borderColor: c.seenBadgeBorder,
    },
    seenPillText: {
      color: c.seenBadgeText,
    },
    statusPillText: {
      fontSize: 12.5,
      fontWeight: '700',
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 14,
      marginBottom: 8,
    },
    tempValue: {
      fontSize: 44,
      fontWeight: '800',
      color: c.alertTemp,
      lineHeight: 48,
      letterSpacing: -1,
    },
    tempUnit: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textSecondary,
      marginTop: 4,
      marginLeft: 3,
    },
    limitMeta: {
      fontSize: 13,
      color: c.textSecondary,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 4,
    },
    timelineTime: {
      width: 54,
      fontSize: 13.5,
      fontWeight: '500',
      color: c.textMuted,
      paddingTop: 1,
    },
    timelineBody: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: 14.5,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 3,
    },
    timelineDesc: {
      fontSize: 13,
      lineHeight: 18,
      color: c.textSecondary,
    },
    timelineDivider: {
      height: 1,
      backgroundColor: c.divider,
      marginVertical: 14,
    },
    formTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textPrimary,
      marginBottom: 6,
    },
    input: {
      backgroundColor: c.inputBg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14.5,
      color: c.textPrimary,
      marginBottom: 14,
    },
    issueInput: {
      minHeight: 84,
      paddingTop: 12,
    },
    submitButton: {
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    submitButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: '700',
    },
    submittedNote: {
      marginTop: 12,
      fontSize: 12.5,
      fontWeight: '600',
      color: c.accent,
    },
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.warningBg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.warningBorder,
      padding: 14,
    },
    warningIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: c.warningText,
    },
    bottomBar: {
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.divider,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Math.max(insets.bottom, 12),
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 15,
      marginBottom: 10,
    },
    actionButtonSeen: {
      backgroundColor: c.seenBg,
    },
    actionButtonText: {
      color: c.onAccent,
      fontSize: 15.5,
      fontWeight: '700',
    },
    actionIcon: {
      marginLeft: 8,
    },
    brandFooterRow: {
      alignItems: 'center',
    },
    brandFooterText: {
      fontSize: 11.5,
      color: c.footerText,
    },
    brandFooterBold: {
      fontWeight: '800',
      color: c.footerBrand,
      letterSpacing: 1.1,
    },
  });
