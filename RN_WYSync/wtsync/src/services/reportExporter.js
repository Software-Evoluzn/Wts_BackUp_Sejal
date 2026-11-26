import { Platform, PermissionsAndroid } from 'react-native';
import RNFS from 'react-native-fs';
import * as XLSX from 'xlsx';

const pickValue = (val, fallback = '') => {
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    return val;
  }
  return fallback;
};

// Keep numbers as real numbers so Excel can sort / chart them; everything else stays text
const toCell = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const n = Number(val);
  return Number.isFinite(n) && String(val).trim() !== '' ? n : String(val);
};

const formatLimitsSummary = (threshold, lowLimit) => {
  const parts = [];
  if (String(threshold ?? '').trim() !== '') parts.push(`High ${threshold}°C`);
  if (String(lowLimit ?? '').trim() !== '') parts.push(`Low ${lowLimit}°C`);
  return parts.length ? parts.join(' / ') : 'Not set';
};

// panelValue: 'all' | 'panel_1' | 'panel_2' ... (4 probes per panel)
const filterProbesByPanel = (probes, panelValue) => {
  if (!Array.isArray(probes)) return [];
  const match = String(panelValue || '').match(/^panel_(\d+)$/);
  if (!match) return probes;
  const start = (Number(match[1]) - 1) * 4;
  return probes.slice(start, start + 4);
};

const buildRows = ({
  deviceId,
  panelLabel,
  panelValue,
  probeType,
  isDeviceOffline = false,
  liveReadings,
}) => {
  const queryCutoff = new Date().toISOString();
  const base = liveReadings || {};
  const deviceThreshold = pickValue(base.threshold, '');
  const deviceLow = pickValue(base.lowLimit, '');
  const timestamp = pickValue(base.timestamp, new Date().toLocaleString('en-IN'));

  const quality = liveReadings
    ? isDeviceOffline
      ? 'CACHED_OFFLINE'
      : 'LIVE'
    : 'NO_LIVE_DATA';

  const scopedProbes = filterProbesByPanel(base.probes, panelValue);

  return scopedProbes.map((p, idx) => {
    const probeThreshold = pickValue(p.threshold, deviceThreshold);
    const probeLow = pickValue(p.lowLimit, deviceLow);
    const hasValue = String(p.value ?? '').trim() !== '';
    return {
      Point: pickValue(p.probe, `T${idx + 1}`),
      Label: pickValue(p.label),
      'Value (°C)': toCell(p.value),
      'High limit (°C)': toCell(probeThreshold),
      'Low limit (°C)': toCell(probeLow),
      Timestamp: timestamp,
      device_id: deviceId,
      panel: panelLabel,
      probe_type: probeType || '4P',
      unit: '°C',
      port: pickValue(p.probe, `CH${idx + 1}`),
      mapping_version: 'v1.0',
      limits: formatLimitsSummary(probeThreshold, probeLow),
      quality: hasValue ? quality : 'NO_VALID_SAMPLE',
      query_cutoff: queryCutoff,
    };
  });
};

const toXlsxBase64 = (rows) => {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths based on the longest cell in each column
  const headers = Object.keys(rows[0]);
  ws['!cols'] = headers.map((h) => ({
    wch: Math.min(
      40,
      Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)) + 2
    ),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
};

const ensureAndroidDownloadPermission = async () => {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 29) return true;

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    {
      title: 'Storage Permission Required',
      message: 'Allow Thermidity to save report files to your Downloads folder.',
      buttonPositive: 'Allow',
      buttonNegative: 'Cancel',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const exportReport = async ({
  deviceId = 'Not available',
  panelLabel = 'All panels in scope',
  panelValue = 'all',
  probeType = '4P',
  isDeviceOffline = false,
  liveReadings = null,
}) => {
  const queryCutoff = new Date().toISOString();
  const rows = buildRows({
    deviceId,
    panelLabel,
    panelValue,
    probeType,
    isDeviceOffline,
    liveReadings,
  });

  if (!rows.length) {
    throw new Error('No readings available to export for this panel.');
  }

  const safeDevice = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePanel = String(panelLabel).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Thermidity_${safeDevice}_${safePanel}_${Date.now()}.xlsx`;

  const targetDir =
    Platform.OS === 'android'
      ? RNFS.DownloadDirectoryPath
      : RNFS.DocumentDirectoryPath;

  if (!targetDir) {
    throw new Error('Target download directory is unavailable');
  }

  const filePath = `${targetDir}/${fileName}`;

  const hasPermission = await ensureAndroidDownloadPermission();
  if (!hasPermission) {
    throw new Error('Storage permission denied');
  }

  await RNFS.writeFile(filePath, toXlsxBase64(rows), 'base64');

  const exists = await RNFS.exists(filePath);
  if (!exists) {
    throw new Error(`File missing after write: ${filePath}`);
  }

  return { filePath, fileName, queryCutoff };
};