/**
 * AutoLogin.jsx — "Auto Login" checkbox backed by real server sessions.
 * -----------------------------------------------------------------------
 * Login with the box checked
 *   -> the app sends the Firebase ID token to POST /api/auth/session
 *   -> the backend verifies it and returns a refresh token
 *   -> the token is kept in the phone's secure storage (Keychain/Keystore)
 *
 * Next app launch
 *   -> POST /api/auth/session/refresh with that token
 *   -> backend checks it is valid, not revoked, not expired, and that the
 *      account still exists, then issues a new token (rotation)
 *   -> valid: go straight to Main. Invalid: sign out and show the form.
 *
 * Logout (any existing logout that calls Firebase signOut)
 *   -> POST /api/auth/session/logout and delete the token from the phone
 *
 * LoginScreen, AuthService and the logout code are not modified.
 * -----------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import * as Keychain from 'react-native-keychain';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import IP_ADDRESS from '../services/ipconfig';
import { useAppTheme } from '../services/theme';

// Same brand colors as LoginScreen
const ACCENT = '#5B2C74';
const ACCENT_LIGHT = '#7B4A98';

const SESSION_SERVICE = 'com.intellitemp.session';
const REQUEST_TIMEOUT_MS = 10000;

/* ------------------------------------------------------------------ */
/* Secure token storage                                               */
/* ------------------------------------------------------------------ */

const saveSession = async (uid, refreshToken) => {
  try {
    await Keychain.setGenericPassword(uid, refreshToken, {
      service: SESSION_SERVICE,
      accessible: Keychain.ACCESSIBLE?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    console.warn('[AutoLogin] could not store session', e);
  }
};

const loadSession = async () => {
  try {
    const creds = await Keychain.getGenericPassword({ service: SESSION_SERVICE });
    return creds ? { uid: creds.username, token: creds.password } : null;
  } catch (e) {
    console.warn('[AutoLogin] could not read session', e);
    return null;
  }
};

const clearSession = async () => {
  try {
    await Keychain.resetGenericPassword({ service: SESSION_SERVICE });
  } catch (e) {
    console.warn('[AutoLogin] could not clear session', e);
  }
};

/* ------------------------------------------------------------------ */
/* Backend calls                                                      */
/* ------------------------------------------------------------------ */

class NetworkError extends Error {}

const postJson = async (path, body) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${IP_ADDRESS}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      // non-JSON reply
    }
    return { status: response.status, ok: response.ok, data };
  } catch (e) {
    throw new NetworkError(e?.message || 'Network request failed');
  } finally {
    clearTimeout(timer);
  }
};

const deviceName = () => {
  const model = Platform.constants?.Model || Platform.constants?.model;
  return [model, `${Platform.OS} ${Platform.Version}`].filter(Boolean).join(' · ');
};

// After a real login with the box checked
const createBackendSession = async (user) => {
  try {
    const idToken = await user.getIdToken();
    const res = await postJson('/api/auth/session', {
      id_token: idToken,
      device_name: deviceName(),
    });
    if (res.ok && res.data?.success && res.data.refresh_token) {
      await saveSession(user.uid, res.data.refresh_token);
    } else {
      console.warn('[AutoLogin] server did not create a session', res.status, res.data);
    }
  } catch (e) {
    console.warn('[AutoLogin] session request failed', e);
  }
};

// Removes the token from the phone first, then tells the server
const revokeStoredSession = async () => {
  const stored = await loadSession();
  if (!stored) return;
  await clearSession();
  try {
    await postJson('/api/auth/session/logout', { refresh_token: stored.token });
  } catch (e) {
    // Offline: token is already gone from the phone; the server copy expires on its own
    console.warn('[AutoLogin] logout request failed', e);
  }
};

/* ------------------------------------------------------------------ */
/* Global auth listener (runs once, for the whole app lifetime)       */
/* ------------------------------------------------------------------ */

let armed = false;        // login form is visible and waiting for a sign-in
let userChoice = false;   // current checkbox value
let disarmTimer = null;
let firstEmission = true;
let launchCheckDone = false; // auto login is only attempted once per app start
let resolveInitialAuth;
const initialAuthReady = new Promise((r) => { resolveInitialAuth = r; });

auth().onIdTokenChanged((user) => {
  // First event = Firebase restoring its saved state at app start
  if (firstEmission) {
    firstEmission = false;
    resolveInitialAuth();
    return;
  }

  // Any sign-out anywhere in the app ends the backend session too
  if (!user) {
    revokeStoredSession();
    return;
  }

  // A real sign-in (email or Google) from the login form
  if (armed) {
    armed = false;
    if (userChoice) {
      createBackendSession(user);
    } else {
      revokeStoredSession();
    }
  }
});

/* ------------------------------------------------------------------ */
/* Launch check                                                       */
/* ------------------------------------------------------------------ */

// Returns true when the user may go straight to Main
const tryAutoLogin = async () => {
  await initialAuthReady;
  const user = auth().currentUser;
  const stored = await loadSession();

  if (user && stored && stored.uid === user.uid) {
    try {
      const res = await postJson('/api/auth/session/refresh', {
        refresh_token: stored.token,
      });

      if (res.ok && res.data?.success && res.data.user?.firebase_uid === user.uid) {
        await saveSession(user.uid, res.data.refresh_token);
        return true;
      }

      if (res.status >= 500) {
        // Server problem, not a rejected session: keep the token, let the user in
        console.warn('[AutoLogin] server error during refresh', res.status);
        return true;
      }

      console.log('[AutoLogin] session rejected:', res.data?.code || res.status);
    } catch (e) {
      if (e instanceof NetworkError) {
        // Offline launch: keep the token and trust the signed-in Firebase user
        return true;
      }
      console.warn('[AutoLogin] refresh failed', e);
    }
  }

  // No valid session: clean up so the user must enter credentials
  await clearSession();
  if (auth().currentUser) {
    try { await auth().signOut(); } catch {}
  }
  return false;
};

/* ------------------------------------------------------------------ */
/* UI component: checkbox + launch-time auto login                    */
/* ------------------------------------------------------------------ */

const AutoLogin = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors, isDark);

  const [checked, setChecked] = useState(false);
  const [checkingSession, setCheckingSession] = useState(!launchCheckDone);

  useEffect(() => {
    let active = true;
    clearTimeout(disarmTimer);
    armed = false;
    userChoice = false;

    (async () => {
      // Returning to Login later (e.g. after logout) never auto-logs in again
      if (!launchCheckDone) {
        launchCheckDone = true;
        const allowed = await tryAutoLogin();
        if (allowed) {
          if (active) navigation.replace('Main');
          return;
        }
      }

      if (!active) return;
      armed = true;
      setCheckingSession(false);
    })();

    return () => {
      active = false;
      // Keep listening briefly in case the sign-in event arrives just after navigation
      disarmTimer = setTimeout(() => { armed = false; }, 5000);
    };
  }, [navigation]);

  const toggle = () => {
    const next = !checked;
    userChoice = next;
    setChecked(next);
  };

  return (
    <>
      {/* Covers the login form while the saved session is being checked */}
      <Modal
        visible={checkingSession}
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={isDark ? ACCENT_LIGHT : ACCENT} />
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.row}
        onPress={toggle}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Auto Login">
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked && <Feather name="check" size={13} color="#fff" />}
        </View>
        <Text style={styles.label}>Auto Login</Text>
      </TouchableOpacity>
    </>
  );
};

export default AutoLogin;

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    loader: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    // Fixed height + matching negative margin puts the checkbox on the
    // same line as "Forgot Password?" without editing LoginScreen styles.
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      height: 22,
      marginTop: 2,
      marginBottom: -24,
      zIndex: 1,
    },
    box: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : '#CFC6D6',
      backgroundColor: isDark ? colors.background : '#F1EEF3',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    boxChecked: {
      backgroundColor: isDark ? ACCENT_LIGHT : ACCENT,
      borderColor: isDark ? ACCENT_LIGHT : ACCENT,
    },
    label: { color: colors.text, fontSize: 13, fontWeight: '600' },
  });