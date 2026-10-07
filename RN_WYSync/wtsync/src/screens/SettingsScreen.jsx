import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import React, { useEffect, useState } from 'react';
import Feather from 'react-native-vector-icons/Feather';

import { getUserDetails, logoutUser } from '../services/AuthService';
import { useAppTheme } from '../services/theme';

const SettingsScreen = ({ navigation }) => {
  const { colors, isDark, themeMode, setThemeMode } = useAppTheme();
  const styles = createStyles(colors, isDark);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Master & Notification Toggles
  const [masterEnabled, setMasterEnabled] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    loadSettingData();
  }, []);

  const loadSettingData = async () => {
    try {
      setLoading(true);
      const userResult = await getUserDetails();
      if (userResult.success) {
        setUser(userResult.user);
      }
    } catch (error) {
      console.log('Setting screen error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = (value) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  const userName = user?.name || 'Demo facility manager';
  const email = user?.email || 'operator@demo.example';

  // Get initials for avatar badge
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.card}
        translucent={true}
      />

      {/* Top Header Row with Logo placed in the upper right */}
      <View style={styles.topHeaderContainer}>
        <View style={styles.brandRow}>
          <Feather name="thermometer" size={22} color="#8A2586" />
          <Text style={styles.brandTitle}>IntelliTemp</Text>
        </View>
        <Image
          source={require('../assests/images/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Screen Title Header */}
        <View style={styles.header}>
          <Text style={styles.categoryLabel}>SETTINGS</Text>
          <Text style={styles.screenTitle}>Account & preferences.</Text>
          <Text style={styles.screenSubTitle}>
            One clear master setting. Device-specific rules remain visible.
          </Text>
        </View>

        {/* User Card */}
        <View style={styles.card}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editContactRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editContactText}>Edit contact details</Text>
            <Feather name="chevron-right" size={16} color="#8A2586" />
          </TouchableOpacity>
        </View>

        {/* Theme, Master & Email Notification Toggles Card */}
        <View style={styles.card}>
          {/* Dark Theme Switch */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrapper}>
              <Text style={styles.switchTitle}>Dark Mode</Text>
              <Text style={styles.switchSubTitle}>
                {isDark ? 'Dark theme enabled.' : 'Light theme enabled.'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeToggle}
              trackColor={{ false: '#DCDFE4', true: '#8A2586' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#DCDFE4"
            />
          </View>

          <View style={styles.divider} />

          {/* Master notifications */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrapper}>
              <Text style={styles.switchTitle}>Master notifications</Text>
              <Text style={styles.switchSubTitle}>
                {masterEnabled
                  ? 'Device email/SMS notifications allowed.'
                  : 'Device email/SMS notifications blocked.'}
              </Text>
            </View>
            <Switch
              value={masterEnabled}
              onValueChange={setMasterEnabled}
              trackColor={{ false: '#DCDFE4', true: '#8A2586' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#DCDFE4"
            />
          </View>

          <View style={styles.divider} />

          {/* Email notifications */}
          <View style={styles.switchRow}>
            <View style={styles.switchTextWrapper}>
              <Text style={styles.switchTitle}>Email notifications</Text>
              <Text style={styles.switchSubTitle}>Device recipients still apply.</Text>
            </View>
            <Switch
              value={emailEnabled}
              onValueChange={setEmailEnabled}
              trackColor={{ false: '#DCDFE4', true: '#8A2586' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#DCDFE4"
            />
          </View>
        </View>

        {/* Warning Banner */}
        {!masterEnabled && (
          <View style={styles.warningBanner}>
            <Feather name="bell-off" size={18} color="#B4690E" style={styles.warningIcon} />
            <Text style={styles.warningText}>
              Your saved device recipients will not receive email/SMS while the master is off.
            </Text>
          </View>
        )}

        {/* Navigation List Card */}
        <View style={styles.card}>
          {/* Device alert recipients */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('DeviceRecipients')}
          >
            <View style={styles.navLeft}>
              <Feather name="bell" size={18} color={colors.subText} />
              <Text style={styles.navText}>Device alert recipients</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.subText} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Device & service records */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ServiceRecords')}
          >
            <View style={styles.navLeft}>
              <Feather name="file-text" size={18} color={colors.subText} />
              <Text style={styles.navText}>Device & service records</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.subText} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Sign out */}
          <TouchableOpacity
            style={styles.navRow}
            activeOpacity={0.7}
            onPress={() => {
              logoutUser();
              navigation.replace('Login');
            }}
          >
            <View style={styles.navLeft}>
              <Feather name="log-out" size={18} color={colors.subText} />
              <Text style={styles.navText}>Sign out</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.subText} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;

const createStyles = (colors, isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 24) + 12,
      paddingBottom: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    brandTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    logoImage: {
      width: 90,
      height: 28,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 32,
    },

    // Header Labels
    header: {
      marginBottom: 20,
    },
    categoryLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: '#8A2586',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    screenTitle: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
      marginBottom: 6,
    },
    screenSubTitle: {
      fontSize: 14,
      color: colors.subText,
      lineHeight: 20,
    },

    // White/Dark Card Wrapper
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.02,
      shadowRadius: 8,
      elevation: 1,
    },

    // Profile Card Inner UI
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? '#381C37' : '#F4E8F5',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 14,
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#8A2586',
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 2,
    },
    userEmail: {
      fontSize: 13,
      color: colors.subText,
    },
    editContactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    editContactText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#8A2586',
    },

    // Switches
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    switchTextWrapper: {
      flex: 1,
      marginRight: 12,
    },
    switchTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 3,
    },
    switchSubTitle: {
      fontSize: 12,
      color: colors.subText,
    },

    // Warning Banner
    warningBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: isDark ? 'rgba(234, 179, 8, 0.12)' : '#FFF6E5',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      gap: 10,
    },
    warningIcon: {
      marginTop: 2,
    },
    warningText: {
      flex: 1,
      fontSize: 13,
      color: isDark ? '#FACC15' : '#A06014',
      lineHeight: 18,
    },

    // Navigation Items
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
    },
    navLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    navText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },

    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
  });