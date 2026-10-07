import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';

import HomeScreen from '../screens/HomeScreen';
import ProductRegistrationScreen from '../screens/ProductRegistrationScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAppTheme } from '../services/theme';

const Tab = createBottomTabNavigator();
const ACCENT = '#8E338A';

/* Custom Tab Bar Component matching design */
function CustomTabBar({ state, descriptors, navigation }) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();

  // 1. Extract focused route and active tab options
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key].options;

  // 2. Hide tab bar if screen requests tabBarStyle: { display: 'none' }
  if (focusedOptions?.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderTopColor: isDark ? colors.border : '#EFECEF',
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}>
      {/* Tab Icons & Labels */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          let iconName = 'circle';
          let label = route.name;

          if (route.name === 'Home') {
            iconName = 'home';
            label = 'Devices';
          } else if (route.name === 'Register') {
            iconName = 'plus-circle';
            label = 'Add device';
          } else if (route.name === 'Settings') {
            iconName = 'sliders';
            label = 'Settings';
          }

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const activeColor = ACCENT;
          const inactiveColor = isDark ? colors.subText : '#8B8796';

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.8}>
              <Feather
                name={iconName}
                size={20}
                color={isFocused ? activeColor : inactiveColor}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? activeColor : inactiveColor },
                  isFocused && styles.activeTabLabel,
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Integrated Brand Footer */}
      <View style={styles.poweredByContainer}>
        <Text style={[styles.poweredByText, { color: isDark ? colors.subText : '#8B8796' }]}>
          Powered By <Text style={styles.brandName}>EVOLUZN</Text>
        </Text>
      </View>
    </View>
  );
}

export default function BottomNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Register" component={ProductRegistrationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 6,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  activeTabLabel: {
    fontWeight: '700',
  },
  poweredByContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  poweredByText: {
    fontSize: 11.5,
  },
  brandName: {
    fontWeight: '800',
    color: ACCENT,
  },
});