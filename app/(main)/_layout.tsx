import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.forestGreen,
        },
        headerTintColor: Colors.white,
        tabBarActiveTintColor: Colors.primaryGreen,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.borderLight,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          headerTitle: 'MABOUNDZA',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={22} color={typeof color === 'string' ? color : Colors.primaryGreen} />
          ),
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scanner',
          headerTitle: 'Scanner botanique',
          tabBarIcon: ({ color }) => (
            <View style={styles.scannerBadge}>
              <Ionicons name="camera-outline" size={22} color={typeof color === 'string' ? color : Colors.primaryGreen} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="encyclopedia/index"
        options={{
          title: 'Encyclopédie',
          headerTitle: 'Flore du Gabon',
          tabBarIcon: ({ color }) => (
            <Ionicons name="book-outline" size={22} color={typeof color === 'string' ? color : Colors.primaryGreen} />
          ),
        }}
      />
      <Tabs.Screen
        name="herbarium/index"
        options={{
          title: 'Mon Herbier',
          headerTitle: 'Herbier Numérique',
          tabBarIcon: ({ color }) => (
            <Ionicons name="leaf-outline" size={22} color={typeof color === 'string' ? color : Colors.primaryGreen} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          headerTitle: 'Mon Profil',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={typeof color === 'string' ? color : Colors.primaryGreen} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scannerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    borderWidth: 2,
    borderColor: Colors.primaryGreen,
  },
});
