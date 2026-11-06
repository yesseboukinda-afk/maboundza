import React, { ComponentProps } from 'react';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';

const TAB_ITEMS = {
  index: { label: 'Accueil', icon: 'home-outline' },
  scanner: { label: 'Scanner', icon: 'camera-outline' },
  encyclopedia: { label: 'Encyclopédie', icon: 'book-outline' },
  herbarium: { label: 'Herbier', icon: 'leaf-outline' },
  profile: { label: 'Profil', icon: 'person-outline' },
} as const;
const TAB_ORDER = ['index', 'scanner', 'encyclopedia', 'herbarium', 'profile'] as const;

type FloatingTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

function FloatingTabBar({ state, descriptors, insets, navigateToTab }: FloatingTabBarProps) {
  return (
    <View style={[styles.tabBarOuter, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const normalizedRouteName = route.name
            .replace(/\([^)]*\)\/?/g, '')
            .replace(/\/index$/, '') || 'index';
          const tabKey = normalizedRouteName in TAB_ITEMS
            ? normalizedRouteName as keyof typeof TAB_ITEMS
            : TAB_ORDER[index];
          const item = TAB_ITEMS[tabKey];
          const { options } = descriptors[route.key];
          const focused = state.index === index;

          const onPress = () => {
            if (focused) {
              return;
            }
            navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || item.label}
              onPress={onPress}
              style={styles.tabItem}
            >
              <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
                <Ionicons
                  name={item.icon}
                  size={focused ? 23 : 21}
                  color={focused ? Colors.white : Colors.textSecondary}
                />
              </View>
              <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.forestGreen,
        },
        headerTintColor: Colors.white,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerTitle: 'MABOUNDZA',
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          headerTitle: 'Scanner botanique',
        }}
      />
      <Tabs.Screen
        name="encyclopedia/index"
        options={{
          title: 'Encyclopédie',
          headerTitle: 'Flore du Gabon',
        }}
      />
      <Tabs.Screen
        name="herbarium/index"
        options={{
          title: 'Mon Herbier',
          headerTitle: 'Herbier Numérique',
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Profil',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    paddingHorizontal: 16,
    paddingTop: 25,
    backgroundColor: 'transparent',
  },
  tabBar: {
    height: 62,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 7,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
  },
  tabIcon: {
    position: 'absolute',
    top: 5,
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconActive: {
    top: -25,
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: Colors.primaryGreen,
    borderWidth: 5,
    borderColor: Colors.naturalBeige,
    shadowColor: Colors.forestGreen,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 8,
  },
  tabLabel: {
    maxWidth: '100%',
    paddingHorizontal: 2,
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.forestGreen,
    fontWeight: '700',
  },
});
