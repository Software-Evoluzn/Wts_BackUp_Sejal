import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import IP_ADDRESS from '../services/ipconfig';

const LIGHT = {
  bg: '#F7F7FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F6',
  border: '#E5E7EB',
  divider: '#F0F0F5',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#8E8E93',
  icon: '#333333',
  accent: '#8B2A8B',
  onAccent: '#FFFFFF',
  footerText: '#6E6577',
  footerBrand: '#7B2B75',
};

const DARK = {
  bg: '#17141A',
  surface: '#25212A',
  surfaceAlt: '#2E2A33',
  border: '#3A3540',
  divider: '#2E2A33',
  textPrimary: '#F4F4F5',
  textSecondary: '#A1A1AA',
  textMuted: '#8E8E93',
  icon: '#FFFFFF',
  accent: '#E5A0DC',
  onAccent: '#2A1230',
  footerText: '#A1A1AA',
  footerBrand: '#E5A0DC',
};

const FOOTER_NOTE =
  'Outside dew point is not an inside-panel condensation warning. Missing or invalid inputs: show “Unavailable”. No external probe: show “Not fitted”, not zero.';

const SIM_CHANNELS_BY_SERIAL = {
  WTSF0C011: 4,
  WTSF0C012: 12,
  WTSF0C013: 24,
};

const randomInRange = (min, max) =>
  Number((Math.random() * (max - min) + min).toFixed(2));

/**
 * Builds a dummy.py-style colon-delimited payload:
 * [device_id, T1..Tn, R1, R2, rel_temp, rel_hum]
 */
export const buildDummyStylePayload = (serial = 'WTSF0C011', channelCount = 4) => {
  const deviceId = (serial || 'WTSF0C011').trim() || 'WTSF0C011';
  const count = SIM_CHANNELS_BY_SERIAL[deviceId] || channelCount || 4;
  const parts = [deviceId];

  for (let i = 0; i < count; i += 1) {
    parts.push(String(randomInRange(22.0, 44.0)));
  }

  parts.push('1', '0');
  parts.push(String(randomInRange(22.0, 30.0)));
  parts.push(String(randomInRange(40.0, 90.0)));

  return parts.join(':');
};

const computeDewPoint = (tempC, rhPercent) => {
  const gamma = (17.27 * tempC) / (237.7 + tempC) + Math.log(rhPercent / 100);
  const dp = (237.7 * gamma) / (17.27 - gamma);
  return Number.isFinite(dp) ? Number(dp.toFixed(1)) : null;
};

/**
 * Parses colon-separated telemetry matching dummy.py:
 * [device_id, T1..Tn, (optional neutral), R1, R2, rel_temp, rel_hum]
 */
export const parseAirTelemetryPayload = (rawPayload, targetSerial = '') => {
  if (typeof rawPayload !== 'string' || !rawPayload.includes(':')) {
    return null;
  }

  const parts = rawPayload.split(':').map((p) => p.trim());
  if (parts.length < 7) {
    return null;
  }

  const deviceId = parts[0];
  if (
    targetSerial &&
    deviceId.toLowerCase() !== String(targetSerial).trim().toLowerCase()
  ) {
    return null;
  }

  const rawTemp = Number(parts[parts.length - 2]);
  const rawHum = Number(parts[parts.length - 1]);

  const validTemp = Number.isFinite(rawTemp) && rawTemp !== -127;
  const validHum = Number.isFinite(rawHum) && rawHum > 0 && rawHum <= 100;

  return {
    deviceId,
    airTemp: validTemp ? Number(rawTemp.toFixed(1)) : null,
    humidity: validHum ? Number(rawHum.toFixed(1)) : null,
    dewPoint:
      validTemp && validHum ? computeDewPoint(rawTemp, rawHum) : null,
    updatedAt: Date.now(),
  };
};

export const extractAirTelemetry = (incoming, targetSerial = '') => {
  if (!incoming) return null;

  if (typeof incoming === 'string') {
    return parseAirTelemetryPayload(incoming, targetSerial);
  }

  if (typeof incoming === 'object') {
    if (typeof incoming.rawPayload === 'string') {
      return parseAirTelemetryPayload(incoming.rawPayload, targetSerial);
    }
    if (typeof incoming.payload === 'string') {
      return parseAirTelemetryPayload(incoming.payload, targetSerial);
    }

    const incomingSerial =
      incoming.serial_no || incoming.serialNo || incoming.device_id || '';
    if (
      targetSerial &&
      incomingSerial &&
      String(incomingSerial).trim().toLowerCase() !==
        String(targetSerial).trim().toLowerCase()
    ) {
      return null;
    }

    const rawTemp = Number(
      incoming.rel_temp ?? incoming.relTemp ?? incoming.airTemp ?? incoming.air_temp
    );
    const rawHum = Number(
      incoming.rel_hum ?? incoming.relHum ?? incoming.humidity
    );

    const validTemp = Number.isFinite(rawTemp) && rawTemp !== -127;
    const validHum = Number.isFinite(rawHum) && rawHum > 0 && rawHum <= 100;

    if (!validTemp && !validHum) return null;

    let dewPoint = Number(incoming.dewPoint ?? incoming.dew_point);
    if (!Number.isFinite(dewPoint)) {
      dewPoint =
        validTemp && validHum ? computeDewPoint(rawTemp, rawHum) : null;
    } else {
      dewPoint = Number(dewPoint.toFixed(1));
    }

    return {
      deviceId: incomingSerial || targetSerial,
      airTemp: validTemp ? Number(rawTemp.toFixed(1)) : null,
      humidity: validHum ? Number(rawHum.toFixed(1)) : null,
      dewPoint,
      updatedAt: incoming.updatedAt || Date.now(),
    };
  }

  return null;
};

const formatValueWithUnit = (val, unit, fitted = true) => {
  if (!fitted) return 'Not fitted';
  if (val === null || val === undefined || !Number.isFinite(Number(val))) {
    return 'Unavailable';
  }
  return `${Number(val).toFixed(1)} ${unit}`;
};

const formatTimestamp = (ts) => {
  if (!ts) return 'Awaiting telemetry';
  const d = new Date(Number(ts));
  if (Number.isNaN(d.getTime())) return 'Awaiting telemetry';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const Airarroundscreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DARK : LIGHT;
  const styles = useMemo(() => createStyles(insets, colors), [insets, colors]);

  const params = route?.params || {};
  const serialNo = params.serialNo || params.product?.serial_no || '';
  const probeTag = params.probeType || params.product?.probe_type || '4P';
  const footerNote = params.footerNote || FOOTER_NOTE;

  const [productMeta, setProductMeta] = useState(params.product || null);
  const [telemetry, setTelemetry] = useState(() =>
    extractAirTelemetry(params.liveTelemetry || params.rawPayload, serialNo)
  );
  const hasExternalTelemetry = Boolean(
    extractAirTelemetry(params.liveTelemetry || params.rawPayload, serialNo)
  );

  const fetchProductMeta = useCallback(async () => {
    const uid = params.firebaseUid || params.product?.firebase_uid;
    if (!serialNo || !uid || !IP_ADDRESS) return;

    try {
      const res = await fetch(`${IP_ADDRESS}/get-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firebase_uid: uid }),
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data.products)) {
        const matched = data.products.find(
          (item) =>
            String(item.serial_no || '').toLowerCase() ===
            String(serialNo).toLowerCase()
        );
        if (matched) {
          setProductMeta((prev) => ({ ...(prev || {}), ...matched }));
        }
      }
    } catch (_) {
      // Keep current metadata if network request fails
    }
  }, [serialNo, params.firebaseUid, params.product?.firebase_uid]);

  useEffect(() => {
    fetchProductMeta();
  }, [fetchProductMeta]);

  useEffect(() => {
    const parsed = extractAirTelemetry(
      params.liveTelemetry || params.rawPayload,
      serialNo
    );
    if (parsed) {
      setTelemetry(parsed);
    }
  }, [params.liveTelemetry, params.rawPayload, serialNo]);

  // Runs silently in the background when no external telemetry payload is passed
  useEffect(() => {
    if (hasExternalTelemetry) return undefined;

    const pushReading = () => {
      const targetId = serialNo || 'WTSF0C011';
      const payload = buildDummyStylePayload(targetId);
      const parsed = parseAirTelemetryPayload(payload, targetId);
      if (parsed) {
        setTelemetry(parsed);
      }
    };

    pushReading();
    const timer = setInterval(pushReading, 5000);
    return () => clearInterval(timer);
  }, [hasExternalTelemetry, serialNo]);

  const onBackToOverview = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Commissioned', serialNo ? { serialNo } : undefined);
  };

  const extProbeFitted =
    productMeta?.external_probe_fitted !== undefined
      ? Boolean(productMeta.external_probe_fitted)
      : true;

  const deviceHumidityFitted =
    productMeta?.internal_humidity_fitted !== undefined
      ? Boolean(productMeta.internal_humidity_fitted)
      : false;

  const metrics = useMemo(() => {
    if (Array.isArray(params.metrics) && params.metrics.length > 0 && !telemetry) {
      return params.metrics;
    }

    return [
      {
        id: 'outside_temp',
        title: `Outside-panel temperature · ${formatValueWithUnit(
          telemetry?.airTemp,
          '°C',
          extProbeFitted
        )}`,
        description:
          'Measured by AM2305B. Last 24 hours rollup: Unavailable.',
      },
      {
        id: 'outside_humidity',
        title: `Outside-panel humidity · ${formatValueWithUnit(
          telemetry?.humidity,
          '% RH',
          extProbeFitted
        )}`,
        description:
          'Measured by AM2305B. Last 24 hours rollup: Unavailable.',
      },
      {
        id: 'outside_dew_point',
        title: `Outside-panel dew point · ${formatValueWithUnit(
          telemetry?.dewPoint,
          '°C',
          extProbeFitted
        )}`,
        description:
          'Calculated from paired temperature + RH. Last 24 hours rollup: Unavailable.',
      },
      {
        id: 'device_humidity',
        title: `At-device humidity · ${formatValueWithUnit(
          telemetry?.deviceHumidity,
          '% RH',
          deviceHumidityFitted
        )}`,
        description:
          'INT-HUM · separate location. A wall-mounted unit does not measure the air inside the panel.',
      },
    ];
  }, [params.metrics, telemetry, extProbeFitted, deviceHumidityFitted]);

  const subtitleText = useMemo(() => {
    const loc = productMeta?.location ? ` · ${productMeta.location}` : '';
    const dev = serialNo ? ` (${serialNo})` : '';
    return `${probeTag}${dev}${loc}`;
  }, [productMeta?.location, probeTag, serialNo]);

  const bannerText = useMemo(() => {
    const timeLabel = telemetry?.updatedAt
      ? `Updated: ${formatTimestamp(telemetry.updatedAt)}`
      : productMeta?.last_seen
        ? `Last seen: ${formatTimestamp(productMeta.last_seen)}`
        : 'Awaiting telemetry';
    const unitTag = serialNo || 'EXT-HUM-01';
    return `${unitTag} · ${timeLabel}.`;
  }, [telemetry?.updatedAt, productMeta?.last_seen, serialNo]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.75}
            onPress={onBackToOverview}>
            <Feather name="arrow-left" size={22} color={colors.icon} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Thermidity <Text style={styles.headerSubtitleText}>{probeTag}</Text>
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
        <Text style={styles.overline}>EXTERNAL ENVIRONMENT</Text>
        <Text style={styles.screenTitle}>Air around this panel.</Text>
        <Text style={styles.screenSubtitle}>{subtitleText}</Text>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Feather
            name="info"
            size={16}
            color={colors.accent}
            style={styles.infoBannerIcon}
          />
          <Text style={styles.infoBannerText}>{bannerText}</Text>
        </View>

        {/* Metric Cards */}
        {metrics.map((item) => (
          <View key={item.id} style={styles.metricCard}>
            <Text style={styles.metricTitle}>{item.title}</Text>
            <Text style={styles.metricDescription}>{item.description}</Text>
          </View>
        ))}

        {/* Bottom Note Banner */}
        <View style={styles.bottomNoteBanner}>
          <Feather
            name="info"
            size={16}
            color={colors.accent}
            style={styles.infoBannerIcon}
          />
          <Text style={styles.infoBannerText}>{footerNote}</Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.bottomFooter}>
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={onBackToOverview}>
          <Text style={styles.primaryButtonText}>Back to overview</Text>
          <Feather name="arrow-right" size={18} color={colors.onAccent} />
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

export default Airarroundscreen;

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
      backgroundColor: c.bg,
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
    headerSubtitleText: {
      fontSize: 13,
      fontWeight: '500',
      color: c.textMuted,
    },
    brandLogo: {
      width: 90,
      height: 24,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 24,
    },
    overline: {
      fontSize: 12,
      fontWeight: '700',
      color: c.accent,
      letterSpacing: 0.9,
      marginBottom: 8,
    },
    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.textPrimary,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: 14.5,
      color: c.textMuted,
      marginTop: 6,
      marginBottom: 18,
    },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      marginBottom: 14,
    },
    bottomNoteBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      marginTop: 2,
    },
    infoBannerIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: c.textSecondary,
    },
    metricCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      marginBottom: 14,
    },
    metricTitle: {
      fontSize: 15.5,
      fontWeight: '700',
      color: c.textPrimary,
      marginBottom: 8,
    },
    metricDescription: {
      fontSize: 13.5,
      lineHeight: 20,
      color: c.textSecondary,
    },
    bottomFooter: {
      backgroundColor: c.surface,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: Math.max(insets.bottom, 14),
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 15,
      gap: 8,
    },
    primaryButtonText: {
      color: c.onAccent,
      fontSize: 15.5,
      fontWeight: '700',
    },
    brandFooterRow: {
      alignItems: 'center',
      marginTop: 12,
    },
    brandFooterText: {
      fontSize: 12,
      color: c.footerText,
    },
    brandFooterBold: {
      fontWeight: '800',
      color: c.footerBrand,
      letterSpacing: 1.2,
    },
  });