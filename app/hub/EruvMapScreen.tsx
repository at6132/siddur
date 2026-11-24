/**
 * Eruv Map – cream/grey USA map, pink community borders only.
 * Full-bleed; floating back + locate; beta disclaimer as plain bottom text.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Linking,
  StyleSheet,
  TextInput,
  FlatList,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import MapView, { Polygon, type Region } from 'react-native-maps';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  BackButton,
  GlassButton,
  LoadingSpinner,
  ErrorView,
  EmptyState,
} from '../../components/ui';
import { EruvStatusChip } from '../../components/hub/EruvStatusChip';
import { useTheme } from '../../src/design/theme';
import { colorWithAlpha } from '../../src/design/colorAlpha';
import { fonts, typography } from '../../src/design/typography';
import { requestLocationFromUser } from '../../src/services/LocationAccess';
import { fetchUsEruvs, type EruvListing } from '../../src/api/eruvApi';
import {
  suggestAddresses,
  type AddressSuggestion,
} from '../../src/api/addressSuggest';

/** Matches LiquidGlassTabBar: floating pill sits above home indicator. */
const TAB_BAR_HEIGHT = 78;
const TAB_BAR_MARGIN_BOTTOM = 12;

const SEARCH_SPRING = { damping: 22, stiffness: 260, mass: 0.85 } as const;

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const USA_REGION: Region = {
  latitude: 39.8,
  longitude: -98.6,
  latitudeDelta: 52,
  longitudeDelta: 58,
};

const NEAR_DELTA = 0.08;

const BETA_DISCLAIMER =
  'This is still in beta. Do not rely on it for halachah.';

function hasCoords(eruv: EruvListing): eruv is EruvListing & {
  latitude: number;
  longitude: number;
} {
  return typeof eruv.latitude === 'number' && typeof eruv.longitude === 'number';
}

type MapLatLng = { latitude: number; longitude: number };
type MapPolygonShape = { coordinates: MapLatLng[]; holes?: MapLatLng[][] };

/** GeoJSON Polygon/MultiPolygon → react-native-maps shapes (outer + exclusion holes). */
function geometryToMapPolygons(eruv: EruvListing): MapPolygonShape[] {
  const g = eruv.geometry;
  if (!g) return [];

  const toLatLng = (ring: number[][]): MapLatLng[] =>
    ring
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

  const polyToShape = (poly: number[][][]): MapPolygonShape | null => {
    if (!poly?.[0]) return null;
    const coordinates = toLatLng(poly[0]);
    if (coordinates.length < 3) return null;
    const holeRings = poly.slice(1).map(toLatLng).filter((h) => h.length >= 3);
    return holeRings.length
      ? { coordinates, holes: holeRings }
      : { coordinates };
  };

  if (g.type === 'Polygon') {
    const shape = polyToShape(g.coordinates);
    return shape ? [shape] : [];
  }
  if (g.type === 'MultiPolygon') {
    return g.coordinates
      .map(polyToShape)
      .filter((s): s is MapPolygonShape => Boolean(s));
  }
  return [];
}

/** Exclusion rings as standalone shapes (cream plugs) — Apple Maps often ignores Polygon holes. */
function geometryToExclusionOverlays(eruv: EruvListing): MapLatLng[][] {
  const g = eruv.geometry;
  if (!g) return [];
  const toLatLng = (ring: number[][]): MapLatLng[] =>
    ring
      .filter((c) => Array.isArray(c) && c.length >= 2)
      .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  const out: MapLatLng[][] = [];
  const polys =
    g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) {
    for (let i = 1; i < poly.length; i++) {
      const ring = toLatLng(poly[i]);
      if (ring.length >= 3) out.push(ring);
    }
  }
  return out;
}

export const EruvMapScreen: React.FC = () => {
  const { theme } = useTheme();
  const { spacing, radii, type } = theme.tokens;
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const reduceMotion = useReducedMotion();
  const searchProgress = useSharedValue(0);

  const [items, setItems] = useState<EruvListing[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [selected, setSelected] = useState<EruvListing | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [addressHits, setAddressHits] = useState<AddressSuggestion[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [mapMode, setMapMode] = useState<'standard' | 'satellite'>('standard');
  const searchInputRef = useRef<TextInput>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const searchBarFullWidth = windowWidth - spacing.gutter * 2;

  const borderPink = theme.colors.primary.main;
  const fillIdle = colorWithAlpha(theme.colors.primary.light, 0.45);
  const fillSelected = colorWithAlpha(theme.colors.primary.main, 0.28);
  const cream = theme.colors.background.secondary;
  const white = theme.colors.background.primary;
  const hairline = theme.colors.neutral[300];

  /** Muted cream / grey Google Maps style (Android; Apple Maps stays light standard). */
  const creamMapStyle = useMemo(
    () => [
      { elementType: 'geometry', stylers: [{ color: cream }] },
      { elementType: 'labels.text.fill', stylers: [{ color: theme.colors.text.secondary }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: white }] },
      {
        featureType: 'administrative',
        elementType: 'geometry.stroke',
        stylers: [{ color: theme.colors.neutral[300] }],
      },
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: white }] },
      {
        featureType: 'road',
        elementType: 'geometry.stroke',
        stylers: [{ color: theme.colors.neutral[200] }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: theme.colors.background.tertiary }],
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry.stroke',
        stylers: [{ color: theme.colors.neutral[300] }],
      },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: theme.colors.neutral[200] }],
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: theme.colors.text.tertiary }],
      },
      {
        featureType: 'landscape.man_made',
        elementType: 'geometry',
        stylers: [{ color: theme.colors.background.tertiary }],
      },
      {
        featureType: 'landscape.natural',
        elementType: 'geometry',
        stylers: [{ color: cream }],
      },
    ],
    [cream, theme.colors, white],
  );

  const load = useCallback(async (opts?: { force?: boolean }) => {
    setLoadState((prev) => (prev === 'ready' ? 'ready' : 'loading'));
    try {
      const next = await fetchUsEruvs({ force: opts?.force === true });
      setItems(next);
      setErrorMessage(undefined);
      setLoadState(next.length === 0 ? 'empty' : 'ready');
    } catch (e) {
      console.warn('Eruv map load error:', e);
      setErrorMessage('Could not load eruv areas. Try again.');
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void (async () => {
        const current = await Location.getForegroundPermissionsAsync();
        setShowsUserLocation(current.status === 'granted');
      })();
    }, [load]),
  );

  /** Exact borders only — no centroid circles or dots. */
  const mapped = useMemo(
    () => items.filter((eruv) => geometryToMapPolygons(eruv).length > 0),
    [items],
  );

  const selectEruv = useCallback((eruv: EruvListing) => {
    void Haptics.selectionAsync();
    setSelected(eruv);
    if (hasCoords(eruv)) {
      mapRef.current?.animateToRegion(
        {
          latitude: eruv.latitude,
          longitude: eruv.longitude,
          latitudeDelta: 0.35,
          longitudeDelta: 0.35,
        },
        350,
      );
    }
  }, []);

  const closeSheet = useCallback(() => {
    void Haptics.selectionAsync();
    setSelected(null);
  }, []);

  const flyTo = useCallback((latitude: number, longitude: number, delta = NEAR_DELTA) => {
    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      400,
    );
  }, []);

  const recenterOnUser = useCallback(async () => {
    if (locating) return;
    setLocating(true);
    void Haptics.selectionAsync();
    try {
      const granted = await requestLocationFromUser();
      if (!granted) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      setShowsUserLocation(true);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      flyTo(pos.coords.latitude, pos.coords.longitude);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLocating(false);
    }
  }, [locating, flyTo]);

  const resetSearchFields = useCallback(() => {
    searchAbortRef.current?.abort();
    setSearchOpen(false);
    setSearchQuery('');
    setAddressHits([]);
    setSearchBusy(false);
  }, []);

  const closeSearch = useCallback(() => {
    Keyboard.dismiss();
    searchAbortRef.current?.abort();
    setAddressHits([]);
    if (reduceMotion) {
      searchProgress.value = 0;
      resetSearchFields();
      return;
    }
    searchProgress.value = withSpring(0, SEARCH_SPRING, (finished) => {
      if (finished) runOnJS(resetSearchFields)();
    });
  }, [reduceMotion, searchProgress, resetSearchFields]);

  const openSearch = useCallback(() => {
    void Haptics.selectionAsync();
    setSearchOpen(true);
    setSelected(null);
    if (reduceMotion) {
      searchProgress.value = 1;
    } else {
      searchProgress.value = withSpring(1, SEARCH_SPRING);
    }
    requestAnimationFrame(() => {
      setTimeout(() => searchInputRef.current?.focus(), reduceMotion ? 0 : 180);
    });
  }, [reduceMotion, searchProgress]);

  const chromeAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0, 0.4], [1, 0]),
    transform: [
      { translateY: interpolate(searchProgress.value, [0, 1], [0, -6]) },
      { scale: interpolate(searchProgress.value, [0, 1], [1, 0.96]) },
    ],
  }));

  const searchBarAnimStyle = useAnimatedStyle(() => ({
    width: interpolate(searchProgress.value, [0, 1], [44, searchBarFullWidth]),
    opacity: interpolate(searchProgress.value, [0, 0.12, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(searchProgress.value, [0, 1], [-2, 0]) }],
  }));

  const searchFieldsAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0.5, 0.85], [0, 1]),
  }));

  const suggestAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(searchProgress.value, [0.7, 1], [0, 1]),
    transform: [{ translateY: interpolate(searchProgress.value, [0.7, 1], [-6, 0]) }],
  }));

  const eruvHits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return items
      .filter((e) => {
        const hay = `${e.name} ${e.city} ${e.state} ${e.areaLabel}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 4);
  }, [items, searchQuery]);

  useEffect(() => {
    if (!searchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setAddressHits([]);
      setSearchBusy(false);
      return;
    }

    const timer = setTimeout(() => {
      searchAbortRef.current?.abort();
      const ac = new AbortController();
      searchAbortRef.current = ac;
      setSearchBusy(true);
      void suggestAddresses(q, { signal: ac.signal, limit: 6 })
        .then((hits) => {
          if (!ac.signal.aborted) setAddressHits(hits);
        })
        .catch((err) => {
          if (err?.name === 'AbortError') return;
          setAddressHits([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setSearchBusy(false);
        });
    }, 280);

    return () => {
      clearTimeout(timer);
      searchAbortRef.current?.abort();
    };
  }, [searchQuery, searchOpen]);

  const pickAddress = useCallback(
    (hit: AddressSuggestion) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      flyTo(hit.latitude, hit.longitude);
      closeSearch();
    },
    [flyTo, closeSearch],
  );

  const pickEruvFromSearch = useCallback(
    (eruv: EruvListing) => {
      closeSearch();
      selectEruv(eruv);
    },
    [closeSearch, selectEruv],
  );

  const submitSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 2) return;
    void Haptics.selectionAsync();

    if (addressHits[0]) {
      pickAddress(addressHits[0]);
      return;
    }
    if (eruvHits[0] && hasCoords(eruvHits[0])) {
      pickEruvFromSearch(eruvHits[0]);
      return;
    }

    try {
      setSearchBusy(true);
      const granted = await requestLocationFromUser();
      if (!granted) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      const results = await Location.geocodeAsync(q);
      const first = results[0];
      if (!first) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      flyTo(first.latitude, first.longitude);
      closeSearch();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSearchBusy(false);
    }
  }, [
    searchQuery,
    addressHits,
    eruvHits,
    pickAddress,
    pickEruvFromSearch,
    flyTo,
    closeSearch,
  ]);

  const showSuggestions =
    searchOpen &&
    searchQuery.trim().length >= 2 &&
    (searchBusy || addressHits.length > 0 || eruvHits.length > 0);

  const openWebsite = useCallback(async (url: string | null) => {
    if (!url) return;
    try {
      const ok = await Linking.canOpenURL(url);
      if (!ok) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Linking.openURL(url);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  const openFullDetail = useCallback(() => {
    if (!selected) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    (navigation as any).navigate('EruvDetail', { eruvId: selected.id });
  }, [navigation, selected]);

  const toggleMapMode = useCallback(() => {
    void Haptics.selectionAsync();
    setMapMode((prev) => (prev === 'standard' ? 'satellite' : 'standard'));
  }, []);

  const chromeBtn = useMemo(
    () => ({
      backgroundColor: colorWithAlpha(white, 0.94),
      borderColor: hairline,
      borderRadius: radii.lg,
      minWidth: 44,
      minHeight: 44,
    }),
    [white, hairline, radii.lg],
  );

  return (
    <View style={[styles.root, { backgroundColor: cream }]}>
      {loadState === 'loading' && items.length === 0 ? (
        <LoadingSpinner />
      ) : loadState === 'error' && items.length === 0 ? (
        <ErrorView message={errorMessage} onRetry={() => void load({ force: true })} />
      ) : loadState === 'empty' ? (
        <EmptyState
          title="No eruv borders yet"
          message="Exact community boundaries will appear here as they are added."
        />
      ) : (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            mapType={mapMode}
            customMapStyle={mapMode === 'standard' ? creamMapStyle : undefined}
            userInterfaceStyle="light"
            initialRegion={USA_REGION}
            showsUserLocation={showsUserLocation}
            showsMyLocationButton={false}
            showsCompass={false}
            showsPointsOfInterest={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
            onPress={() => {
              if (searchOpen) {
                void Haptics.selectionAsync();
                closeSearch();
                return;
              }
              if (selected) closeSheet();
            }}
          >
            {mapped.map((eruv) => {
              const shapes = geometryToMapPolygons(eruv);
              const exclusions = geometryToExclusionOverlays(eruv);
              const isSelected = selected?.id === eruv.id;
              return (
                <React.Fragment key={eruv.id}>
                  {shapes.map((shape, idx) => (
                    <Polygon
                      key={`${eruv.id}-poly-${idx}`}
                      coordinates={shape.coordinates}
                      holes={shape.holes}
                      fillColor={isSelected ? fillSelected : fillIdle}
                      strokeColor={borderPink}
                      strokeWidth={isSelected ? 3 : 2}
                      tappable
                      onPress={() => {
                        if (searchOpen) {
                          void Haptics.selectionAsync();
                          closeSearch();
                          return;
                        }
                        selectEruv(eruv);
                      }}
                    />
                  ))}
                  {exclusions.map((ring, idx) => (
                    <Polygon
                      key={`${eruv.id}-excl-${idx}`}
                      coordinates={ring}
                      fillColor={cream}
                      strokeColor={borderPink}
                      strokeWidth={1.5}
                      tappable
                      onPress={() => {
                        if (searchOpen) {
                          void Haptics.selectionAsync();
                          closeSearch();
                          return;
                        }
                        selectEruv(eruv);
                      }}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </MapView>

          {searchOpen ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss search"
              onPress={() => {
                void Haptics.selectionAsync();
                closeSearch();
              }}
              style={styles.searchDismiss}
            />
          ) : null}

          <View
            pointerEvents="box-none"
            style={[
              styles.overlayTop,
              {
                paddingTop: insets.top + spacing.sm,
                paddingHorizontal: spacing.gutter,
              },
            ]}
          >
            <Animated.View
              pointerEvents={searchOpen ? 'none' : 'box-none'}
              style={[
                styles.topRow,
                styles.chromeAbsolute,
                {
                  top: insets.top + spacing.sm,
                  left: spacing.gutter,
                  right: spacing.gutter,
                },
                chromeAnimStyle,
              ]}
            >
              <View
                style={[
                  styles.chromePill,
                  {
                    backgroundColor: colorWithAlpha(white, 0.94),
                    borderColor: hairline,
                    borderRadius: radii.lg,
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing['2xs'],
                  },
                ]}
              >
                <BackButton
                  label="Hub"
                  onPress={() => {
                    void Haptics.selectionAsync();
                    navigation.goBack();
                  }}
                />
              </View>

              {!selected ? (
                <View style={[styles.sideStack, { gap: spacing.sm }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search address"
                    hitSlop={12}
                    onPress={openSearch}
                    style={[styles.iconBtn, chromeBtn]}
                  >
                    <Ionicons name="search" size={20} color={theme.colors.text.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Center map on your location"
                    hitSlop={12}
                    disabled={locating}
                    onPress={() => void recenterOnUser()}
                    style={[styles.iconBtn, chromeBtn, { opacity: locating ? 0.6 : 1 }]}
                  >
                    <Ionicons name="locate" size={22} color={theme.colors.text.primary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      mapMode === 'standard'
                        ? 'Switch to satellite map'
                        : 'Switch to standard map'
                    }
                    hitSlop={12}
                    onPress={toggleMapMode}
                    style={[styles.iconBtn, chromeBtn]}
                  >
                    <Ionicons
                      name={mapMode === 'standard' ? 'globe-outline' : 'map-outline'}
                      size={20}
                      color={theme.colors.text.primary}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Refresh eruv status"
                    hitSlop={12}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      void load({ force: true });
                    }}
                    style={[styles.iconBtn, chromeBtn]}
                  >
                    <Ionicons name="refresh" size={20} color={theme.colors.text.secondary} />
                  </Pressable>
                </View>
              ) : null}
            </Animated.View>

            <Animated.View
              pointerEvents={searchOpen ? 'auto' : 'none'}
              style={[
                styles.searchBar,
                styles.searchBarAbsolute,
                {
                  top: insets.top + spacing.sm,
                  right: spacing.gutter,
                  backgroundColor: colorWithAlpha(white, 0.96),
                  borderColor: hairline,
                  borderRadius: radii.lg,
                  minHeight: 44,
                  paddingLeft: spacing.sm,
                  overflow: 'hidden',
                },
                searchBarAnimStyle,
              ]}
            >
              <Ionicons name="search" size={18} color={theme.colors.text.tertiary} />
              <Animated.View style={[styles.searchFields, searchFieldsAnimStyle]}>
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => void submitSearch()}
                  placeholder="Search address"
                  placeholderTextColor={theme.colors.text.tertiary}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="words"
                  editable={searchOpen}
                  style={[
                    styles.searchInput,
                    {
                      color: theme.colors.text.primary,
                      fontFamily: fonts.body.regular,
                      fontSize: typography.fontSize.base,
                    },
                  ]}
                />
                {searchBusy ? (
                  <ActivityIndicator size="small" color={theme.colors.primary.main} />
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close search"
                  hitSlop={10}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    closeSearch();
                  }}
                  style={styles.searchClose}
                >
                  <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
                </Pressable>
              </Animated.View>
            </Animated.View>

            {showSuggestions ? (
              <Animated.View
                style={[
                  styles.suggestPanel,
                  {
                    marginTop: 44 + spacing.sm,
                    backgroundColor: colorWithAlpha(white, 0.97),
                    borderColor: hairline,
                    borderRadius: radii.lg,
                    maxHeight: 280,
                  },
                  suggestAnimStyle,
                ]}
              >
                <FlatList
                  keyboardShouldPersistTaps="handled"
                  data={[
                    ...eruvHits.map((e) => ({ kind: 'eruv' as const, eruv: e })),
                    ...addressHits.map((a) => ({ kind: 'address' as const, address: a })),
                  ]}
                  keyExtractor={(row) =>
                    row.kind === 'eruv' ? `eruv-${row.eruv.id}` : row.address.id
                  }
                  ItemSeparatorComponent={() => (
                    <View
                      style={{
                        height: StyleSheet.hairlineWidth,
                        backgroundColor: hairline,
                      }}
                    />
                  )}
                  renderItem={({ item: row }) => {
                    if (row.kind === 'eruv') {
                      const e = row.eruv;
                      return (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => pickEruvFromSearch(e)}
                          style={({ pressed }) => [
                            styles.suggestRow,
                            {
                              paddingHorizontal: spacing.md,
                              paddingVertical: spacing.sm,
                              minHeight: 44,
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <Ionicons
                            name="map-outline"
                            size={18}
                            color={theme.colors.primary.main}
                          />
                          <View style={styles.suggestTextCol}>
                            <Text
                              numberOfLines={1}
                              style={[
                                type.textStyles.body,
                                {
                                  color: theme.colors.text.primary,
                                  fontFamily: fonts.body.semiBold,
                                },
                              ]}
                            >
                              {e.name}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={[
                                type.textStyles.caption,
                                { color: theme.colors.text.secondary },
                              ]}
                            >
                              {e.areaLabel || `${e.city}, ${e.state}`}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    }
                    const a = row.address;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => pickAddress(a)}
                        style={({ pressed }) => [
                          styles.suggestRow,
                          {
                            paddingHorizontal: spacing.md,
                            paddingVertical: spacing.sm,
                            minHeight: 44,
                            opacity: pressed ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={18}
                          color={theme.colors.text.secondary}
                        />
                        <View style={styles.suggestTextCol}>
                          <Text
                            numberOfLines={1}
                            style={[
                              type.textStyles.body,
                              { color: theme.colors.text.primary },
                            ]}
                          >
                            {a.label}
                          </Text>
                          {a.secondary ? (
                            <Text
                              numberOfLines={1}
                              style={[
                                type.textStyles.caption,
                                { color: theme.colors.text.secondary },
                              ]}
                            >
                              {a.secondary}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  }}
                />
              </Animated.View>
            ) : null}
          </View>

          <View
            pointerEvents="box-none"
            style={[
              styles.overlayBottom,
              {
                paddingBottom:
                  Math.max(insets.bottom, 8) + TAB_BAR_MARGIN_BOTTOM + TAB_BAR_HEIGHT + spacing['2xs'],
                paddingHorizontal: spacing.gutter,
              },
            ]}
          >
            <View
              style={[
                styles.betaBox,
                {
                  backgroundColor: colorWithAlpha(theme.colors.primary.light, 0.96),
                  borderColor: theme.colors.primary.main,
                  borderRadius: radii.lg,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.betaText,
                  {
                    color: theme.colors.text.primary,
                    fontFamily: fonts.body.bold,
                    fontSize: typography.fontSize.sm,
                    lineHeight: typography.fontSize.sm * typography.lineHeight.snug,
                  },
                ]}
              >
                {BETA_DISCLAIMER}
              </Text>
            </View>
          </View>

          {selected ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.sheet,
                {
                  top: insets.top + spacing.sm + 52,
                  paddingHorizontal: spacing.gutter,
                  zIndex: 5,
                },
              ]}
            >
              <View
                style={[
                  styles.sheetInner,
                  {
                    borderRadius: radii.xl,
                    borderColor: hairline,
                    backgroundColor: colorWithAlpha(white, 0.96),
                    padding: spacing.md,
                    gap: spacing.sm,
                  },
                ]}
              >
                <View style={styles.sheetTop}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text
                      style={[type.textStyles.h3, { color: theme.colors.text.primary }]}
                      numberOfLines={2}
                    >
                      {selected.name}
                    </Text>
                    <Text
                      style={[
                        type.textStyles.caption,
                        { color: theme.colors.text.secondary, marginTop: spacing['2xs'] },
                      ]}
                      numberOfLines={2}
                    >
                      {selected.areaLabel || `${selected.city}, ${selected.state}`}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    onPress={closeSheet}
                    hitSlop={10}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
                  </Pressable>
                </View>

                <EruvStatusChip status={selected.status} />

                {selected.statusSourceUrl ? (
                  <GlassButton
                    title="Open official website"
                    variant="secondary"
                    onPress={() => void openWebsite(selected.statusSourceUrl)}
                  />
                ) : (
                  <Text style={[type.textStyles.caption, { color: theme.colors.text.secondary }]}>
                    No official website listed yet.
                  </Text>
                )}

                <GlassButton
                  title="More details"
                  variant="primary"
                  onPress={openFullDetail}
                />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  searchDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 4,
  },
  overlayBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'stretch',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  chromeAbsolute: {
    position: 'absolute',
    zIndex: 1,
  },
  sideStack: {
    alignItems: 'center',
  },
  chromePill: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  searchBarAbsolute: {
    position: 'absolute',
    zIndex: 2,
  },
  searchFields: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 8,
    minWidth: 0,
  },
  searchClose: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestPanel: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suggestTextCol: {
    flex: 1,
  },
  betaBox: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
  },
  betaText: {
    textAlign: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  sheetInner: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
