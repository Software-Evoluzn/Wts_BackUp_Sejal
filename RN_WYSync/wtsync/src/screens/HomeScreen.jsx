import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';

import { getUserDetails } from '../services/AuthService';

import { getProducts } from '../services/ProductApi';
import { useAppTheme } from '../services/theme';


const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([])
  const intervalRef = useRef(null);

  // Pulse used only by the product ONLINE/OFFLINE status dots
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.4,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true
        }),
      ])
    ).start();
  }, []);


  useFocusEffect(
    useCallback(() => {
      loadHomeData();

      intervalRef.current = setInterval(() => {
        loadHomeData();
      }, 5000);//every 5 sec

      return () => {
        clearInterval(intervalRef.current);
      }

    }, [])
  );



  // "Register Another Product" is the only button that needs to flip to
  // a light surface in dark mode (it otherwise inherits the shared black
  // `styles.button` look, which disappears against a dark background).
  // The base button style (size/padding/radius/shadow/typography) is left
  // completely untouched — only background + text/icon color are
  // overridden here, and only for this button.
  //
  // Note: the theme's `card`/`text` tokens are inverted for this purpose
  // in dark mode (card is a dark surface, text is light-on-dark), so
  // there's no existing token for "light surface + dark text". This
  // stays theme-aware via the `isDark` flag from useAppTheme(); light
  // theme is untouched and keeps the original hardcoded black/white.
  const secondaryButtonSurfaceStyle = isDark ? { backgroundColor: '#F5EAF8' } : null;
  const secondaryButtonTextColor = isDark ? '#0B0D12' : '#fff';


  const loadHomeData = async () => {
    try {

      setLoading(true);
      const userResult = await getUserDetails();

      //User Details
      if (userResult.success) {
        setUser(userResult.user);
      }

      //products
      const productResult = await getProducts();
      if (productResult.success) {
        setProducts(productResult.products);
      }

    } catch (e) {
      console.log("Home Screen Error", e);
    } finally {
      setLoading(false);
    }

  }

  const firstName = user?.name ? user.name.split(' ')[0] : '';
  const initial = firstName ? firstName.charAt(0).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />

      <View style={styles.container}>
        {/* Header: app identity + profile shortcut */}
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View style={styles.brandRow} accessibilityRole="header">
              <View style={styles.brandTile}>
                <Feather name="thermometer" size={17} color="#fff" />
              </View>
              <Text style={styles.brand} numberOfLines={1}>
                Intelli Temp
              </Text>
            </View>

            <TouchableOpacity
              style={styles.avatar}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Settings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Open profile and settings"
            >
              {firstName ? (
                <Text style={styles.avatarText}>{initial}</Text>
              ) : (
                <Feather name="user" size={16} color="#9C3AB3" />
              )}
            </TouchableOpacity>
          </View>

        </View>

        {products.length === 0 ? (
          <View style={styles.emptyWrap}>

            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <Feather name="package" size={30} color="#A44ABB" />
              </View>

              <Text style={styles.title}>No Product Registered</Text>

              <Text style={styles.subtitle}>
                Register your first device to activate its warranty and start
                syncing temperature data.
              </Text>

              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.statusText}>Warranty inactive</Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Register')}>
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.buttonText}>Register Product</Text>
              </TouchableOpacity>
            </View>

          </View>
        ) : (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Products</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{products.length}</Text>
              </View>
            </View>

            <FlatList

              data={products}
              keyExtractor={(item) => item.id.toString()}
              showVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.productCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    if (item.online) {
                      navigation.navigate("WtsDashboard", {
                        product: item,
                      });
                    } else {
                      navigation.navigate("DeviceConfig", {
                        product: item,
                      });
                    }
                  }}
                >

                  <View style={styles.productHeader}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.device_name}
                    </Text>

                    <View



                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: item.online
                            ? "#EDFBF3"
                            : "#FDF0F0"
                        }
                      ]}>


                      <Animated.View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.online
                              ? "#22C55E"
                              : "#EF4444",
                            transform: [{ scale: pulseAnim }],
                            opacity: pulseAnim,
                          }
                        ]}
                      />


                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: item.online
                              ? "#15803D"
                              : "#B91C1C"
                          }
                        ]}
                      >

                        {item.online ? "ONLINE" : "OFFLINE"}

                      </Text>



                    </View>

                  </View>

                  <Text style={styles.model}>
                    {item.model_no}
                  </Text>

                  <View style={styles.divider} />

                  <View style={styles.metaRow}>
                    <View>
                      <Text style={styles.metaLabel}>Serial Number</Text>
                      <Text style={styles.metaValue}>{item.serial_no}</Text>
                    </View>
                    <View style={styles.metaRight}>
                      <Text style={styles.metaLabel}>Warranty</Text>
                      <Text style={styles.metaValue}>{item.warranty_expiry}</Text>
                    </View>
                  </View>


                </TouchableOpacity>
              )}
            />


            <TouchableOpacity
              style={[styles.button, secondaryButtonSurfaceStyle]}
              onPress={() => navigation.navigate("Register")}>
              <Feather name="plus" size={16} color={secondaryButtonTextColor} />
              <Text style={[styles.buttonText, { color: secondaryButtonTextColor }]}>
                Register Another Product
              </Text>

            </TouchableOpacity>

          </>

        )

        }

        {/* Small footer hint */}
        {/* <Text style={styles.footerHint}>
          Have a QR code? Head to the Register tab to scan it.
        </Text> */}
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

const createStyles = (colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 24,
  },

  // Header: app identity + profile shortcut
  header: {
    paddingTop: 12,
    marginBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  brandTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: '#9C3AB3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  brand: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(156, 58, 179, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9C3AB3',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subText,
  },

  // Empty state card
  card: {
    backgroundColor: colors.card,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0B0D12',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F5EAF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    color: colors.subText,
    maxWidth: 260,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },

  // Product cards
  productCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0B0D12',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  model: {
    marginTop: 6,
    color: colors.subText,
    fontSize: 13,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaRight: {
    alignItems: 'flex-end',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.subText,
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  button: {
    backgroundColor: '#9C3AB3',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0B0D12',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  footerHint: {
    textAlign: 'center',
    color: colors.subText,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 20,
  },
});