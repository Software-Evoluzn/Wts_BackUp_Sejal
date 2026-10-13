import * as IP_CONFIG from './ipconfig';
import { getUserDetails } from './AuthService';
import { getDraft, buildAlertConfig } from './installationDraft';

// Finds the server address however './ipconfig' exports it:
//   export default { BASE_URL: 'https://xxxx.ngrok-free.app' }
//   export const BASE_URL = 'https://xxxx.ngrok-free.app'
//   export default 'https://xxxx.ngrok-free.app'
//   module.exports = { BASE_URL: '...' }
const findUrl = (value, depth = 0) => {
  if (depth > 3 || value === null || value === undefined) return null;
  if (typeof value === 'string') return /^https?:\/\//i.test(value) ? value : null;
  if (typeof value === 'object') {
    // Prefer an entry that is literally called BASE_URL / baseUrl
    const named = value.BASE_URL ?? value.baseUrl ?? value.BASE_URL_NGROK;
    const direct = findUrl(named, depth + 1);
    if (direct) return direct;
    for (const key of Object.keys(value)) {
      const found = findUrl(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
};

const BASE_URL = (findUrl(IP_CONFIG) || '').replace(/\/+$/, '');
console.log('[API] BASE_URL =', BASE_URL || '(not found)');

const post = async (path, body) => {
  if (!BASE_URL) {
    return {
      success: false,
      message: "Server address not found in './ipconfig'. Open that file and make sure it contains your ngrok URL (https://...).",
    };
  }

  const url = `${BASE_URL}${path}`;
  console.log('[API] POST', url);

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Stops ngrok from answering with its HTML warning page instead of JSON
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    // fetch itself failed: the server could not be reached at all
    console.log('[API] network error:', e?.message);
    return {
      success: false,
      message: `Cannot reach the server at ${url}\n(${e?.message || 'network error'})`,
    };
  }

  const text = await response.text();
  console.log('[API] status', response.status, text.slice(0, 300));

  let json = {};
  try {
    json = JSON.parse(text);
  } catch (e) {
    return {
      success: false,
      message: `Server answered ${response.status}, but not with JSON:\n${text.slice(0, 120)}`,
    };
  }

  return { ...json, success: json.success ?? response.ok };
};

// "IntelliTemp 4P" -> "4P"
const getProbeType = (product) => {
  const source = `${product?.['Device Name'] || ''} ${product?.['Model No'] || ''}`;
  const match = source.match(/(\d{1,2})\s*-?\s*P(?![a-z])/i);
  return match ? `${parseInt(match[1], 10)}P` : null;
};

/**
 * Saves the whole installation wizard (everything stored in the draft).
 * Returns { success, message, serial_no, firebase_uid }
 */
export const submitInstallation = async () => {
  const draft = getDraft();
  const product = draft.product;

  if (!product?.['Serial No']) {
    return { success: false, message: 'Device details are missing. Please start again.' };
  }
  if (!draft.location || !draft.location.trim()) {
    return { success: false, message: 'Please enter an installation location.' };
  }

  let userResult;
  try {
    userResult = await getUserDetails();
  } catch (e) {
    console.log('[API] getUserDetails failed:', e?.message);
    return { success: false, message: `Could not load your account: ${e?.message || e}` };
  }
  if (!userResult?.success || !userResult.user) {
    return { success: false, message: 'Unable to load your account. Please log in again.' };
  }
  const user = userResult.user;

  const alert = buildAlertConfig(draft);

  if (Number.isNaN(alert.high.all)) {
    return { success: false, message: 'Please enter a valid high limit.' };
  }
  if (alert.low.enabled) {
    if (Number.isNaN(alert.low.limit)) {
      return { success: false, message: 'Please enter a valid low limit.' };
    }
    if (alert.low.limit >= alert.high.all) {
      return { success: false, message: 'The low limit must be below the high limit.' };
    }
  }

  // T1 -> probe_1 ... T4 -> probe_4 (only probes that have an override)
  const individualThresholds = {};
  Object.entries(alert.high.overrides).forEach(([probe, value]) => {
    const index = parseInt(String(probe).replace('T', ''), 10);
    if (index >= 1 && index <= 24) individualThresholds[`probe_${index}`] = value;
  });

  const payload = {
    // account
    firebase_uid: user.firebase_uid,
    user_name: user.name,
    email: user.email,
    contact: user.contact,

    // device (step 1)
    device_name: product['Device Name'],
    model_no: product['Model No'],
    serial_no: product['Serial No'],
    mac_id: product['MAC ID'] || 'N/A',
    probe_type: getProbeType(product),

    // installation (step 3)
    location: draft.location.trim(),
    application: draft.application || null,
    site_timezone: draft.siteTimezone || null,
    probe_labels: (draft.probeLabels || []).map((label) => (label || '').trim()),

    // alert rule (step 4)
    threshold_value: alert.high.all,
    individual_thresholds: Object.keys(individualThresholds).length ? individualThresholds : null,
    low_enabled: alert.low.enabled,
    low_limit: alert.low.enabled ? alert.low.limit : null,
    persistence_readings: alert.behaviour.persistence,
    reset_margin: alert.behaviour.resetMargin,
    repeat_every_minutes: alert.behaviour.repeatEveryMinutes,

    // recipients (step 4)
    email_enabled: draft.emailEnabled ?? true,
    alert_email: draft.alertEmail || user.email,
    sms_enabled: draft.smsEnabled ?? false,
    sms_phone: draft.smsPhone || user.contact,
  };

  const result = await post('/register-product', payload);
  return { ...result, serial_no: payload.serial_no, firebase_uid: payload.firebase_uid };
};

// Changes whenever an installation is saved, so the Home list knows it must reload.
let installVersion = 0;
export const getInstallVersion = () => installVersion;

// Marks the installation as "applied" (Installed on the Home screen)
export const confirmInstallation = async (serial_no, firebase_uid) => {
  const result = await post('/confirm-installation', { serial_no, firebase_uid });
  installVersion += 1;
  return result;
};

// All devices of the logged-in user (for the Home screen).
// Pass the firebase_uid if you already have it, to skip loading the account again.
export const fetchInstalledProducts = async (firebaseUid) => {
  let uid = firebaseUid;

  if (!uid) {
    const userResult = await getUserDetails();
    if (!userResult?.success || !userResult.user) {
      return { success: false, products: [], message: 'Unable to load your account.' };
    }
    uid = userResult.user.firebase_uid;
  }

  const result = await post('/get-products', { firebase_uid: uid });
  return { products: [], ...result };
};