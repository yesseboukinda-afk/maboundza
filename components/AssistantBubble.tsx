import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';

const SIZE = 58;
const EDGE = 16;
const TOP_BOUND = 48;
const BOTTOM_BOUND = 96;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function AssistantBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const position = useRef(
    new Animated.ValueXY({
      x: Math.max(EDGE, width - SIZE - EDGE),
      y: Math.max(TOP_BOUND, height - SIZE - BOTTOM_BOUND),
    })
  ).current;
  const origin = useRef({ x: 0, y: 0 });

  useEffect(() => {
    position.stopAnimation((current) => {
      position.setValue({
        x: clamp(current.x, EDGE, width - SIZE - EDGE),
        y: clamp(current.y, TOP_BOUND, height - SIZE - BOTTOM_BOUND),
      });
    });
  }, [height, position, width]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 3,
      onPanResponderGrant: () => {
        position.stopAnimation((current) => {
          origin.current = current;
        });
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({
          x: clamp(origin.current.x + gesture.dx, EDGE, width - SIZE - EDGE),
          y: clamp(origin.current.y + gesture.dy, TOP_BOUND, height - SIZE - BOTTOM_BOUND),
        });
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) < 8) {
          router.push('/assistant');
        }
      },
    }),
    [height, position, router, width]
  );

  if (pathname.startsWith('/assistant')) {
    return null;
  }

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Ouvrir Maman MABOUNDZA"
      onAccessibilityTap={() => router.push('/assistant')}
      style={[styles.bubble, { transform: position.getTranslateTransform() }]}
    >
      <Ionicons name="chatbubble-ellipses-outline" size={27} color={Colors.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 100,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
});
