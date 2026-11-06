
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

const { width, height } = Dimensions.get("window");

const COLORS = {
  background: "#061C16",
  backgroundLight: "#0B3023",
  green: "#45C982",
  lightGreen: "#A6F0B9",
  gold: "#D6B56D",
  white: "#F5FFF7",
  muted: "#A7C5B2",
};

const PARTICLES = [
  { x: 12, y: 17, size: 3, delay: 0 },
  { x: 83, y: 13, size: 4, delay: 500 },
  { x: 24, y: 35, size: 2, delay: 900 },
  { x: 91, y: 42, size: 3, delay: 300 },
  { x: 9, y: 65, size: 4, delay: 1200 },
  { x: 78, y: 72, size: 2, delay: 700 },
  { x: 43, y: 83, size: 3, delay: 1500 },
  { x: 65, y: 25, size: 2, delay: 400 },
  { x: 18, y: 89, size: 2, delay: 1000 },
  { x: 95, y: 87, size: 3, delay: 200 },
];

function Particle({
  x,
  y,
  size,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;
  const movement = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.15,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(movement, {
            toValue: -18,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(movement, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [delay, movement, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: `${x}%`,
          top: `${y}%`,
          width: size,
          height: size,
          borderRadius: size,
          opacity,
          transform: [{ translateY: movement }],
        },
      ]}
    />
  );
}

function BotanicalIllustration() {
  const leafScale = useRef(new Animated.Value(0.45)).current;
  const leafOpacity = useRef(new Animated.Value(0)).current;
  const scanner = useRef(new Animated.Value(-125)).current;
  const halo = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(leafScale, {
        toValue: 1,
        friction: 5,
        tension: 45,
        useNativeDriver: true,
      }),
      Animated.timing(leafOpacity, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    ]).start();

    const scanAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(scanner, {
          toValue: 125,
          duration: 1900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(300),
        Animated.timing(scanner, {
          toValue: -125,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    const haloAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(halo, {
          toValue: 0.6,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );

    scanAnimation.start();
    haloAnimation.start();

    return () => {
      scanAnimation.stop();
      haloAnimation.stop();
    };
  }, [halo, leafOpacity, leafScale, scanner]);

  return (
    <View style={styles.illustrationContainer}>
      <Animated.View
        style={[
          styles.halo,
          {
            opacity: halo,
            transform: [
              {
                scale: halo.interpolate({
                  inputRange: [0.6, 1],
                  outputRange: [0.94, 1.08],
                }),
              },
            ],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.leafArtwork,
          {
            opacity: leafOpacity,
            transform: [{ scale: leafScale }],
          },
        ]}
      >
        <Svg width={220} height={250} viewBox="0 0 220 250">
          <Defs>
            <LinearGradient
              id="leafGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <Stop offset="0" stopColor="#C2FFD0" />
              <Stop offset="0.45" stopColor="#45C982" />
              <Stop offset="1" stopColor="#126B43" />
            </LinearGradient>

            <LinearGradient
              id="stemGradient"
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <Stop offset="0" stopColor="#A6F0B9" />
              <Stop offset="1" stopColor="#258A59" />
            </LinearGradient>
          </Defs>

          {/* Feuille principale */}
          <Path
            d="M110 220 C-5 170 15 35 180 12 C205 120 165 190 110 220Z"
            fill="url(#leafGradient)"
            stroke="#A6F0B9"
            strokeWidth={1.5}
          />

          {/* Nervure centrale */}
          <Path
            d="M110 220 Q115 120 180 12"
            stroke="url(#stemGradient)"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* Nervures secondaires */}
          <Path
            d="M108 188 Q65 145 39 105 M115 165 Q75 120 58 75 M125 139 Q100 100 85 55 M133 116 Q130 75 117 39"
            stroke="#C2FFD0"
            strokeWidth={1.8}
            fill="none"
            opacity={0.75}
          />

          <Path
            d="M115 185 Q155 150 171 105 M125 155 Q165 125 184 77 M138 125 Q170 100 190 54"
            stroke="#C2FFD0"
            strokeWidth={1.8}
            fill="none"
            opacity={0.75}
          />

          {/* Petite feuille décorative */}
          <Path
            d="M90 220 Q42 210 34 170 Q78 172 90 220Z"
            fill="#238B56"
            stroke="#A6F0B9"
            strokeWidth={1}
          />

          <Path
            d="M90 220 Q68 192 34 170"
            stroke="#A6F0B9"
            strokeWidth={1.5}
            fill="none"
          />

          <Circle cx={180} cy={12} r={3} fill="#D6B56D" />
        </Svg>

        {/* Faisceau du scanner */}
        <Animated.View
          style={[
            styles.scanner,
            {
              transform: [{ translateY: scanner }],
            },
          ]}
        >
          <View style={styles.scannerLine} />
          <View style={styles.scannerGlow} />
        </Animated.View>
      </Animated.View>

      <View style={styles.orbitDot} />
      <View style={styles.orbitDotTwo} />
    </View>
  );
}

type Props = {
  onFinish?: () => void;
  duration?: number;
};

export default function MaboundzaSplash({
  onFinish,
  duration = 4500,
}: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslate = useRef(new Animated.Value(25)).current;
  const sloganOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.delay(650),
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.spring(logoTranslate, {
          toValue: 0,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(sloganOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(footerOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    const timeout = setTimeout(() => {
      onFinish?.();
    }, duration);

    return () => {
      clearTimeout(timeout);
      entrance.stop();
    };
  }, [
    duration,
    footerOpacity,
    logoOpacity,
    logoTranslate,
    onFinish,
    sloganOpacity,
  ]);

  return (
    <View style={styles.container}>
      <StatusBar
        hidden
      />

    
      <View style={styles.backgroundGlow} />

      {/* Particules */}
      {PARTICLES.map((particle, index) => (
        <Particle key={index} {...particle} />
      ))}

      <View style={styles.content}>
        <View style={styles.topLabel}>
          <View style={styles.topLine} />
          <Text style={styles.topLabelText}>
            BIODIVERSITÉ DU GABON
          </Text>
          <View style={styles.topLine} />
        </View>

        <BotanicalIllustration />

        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: logoOpacity,
              transform: [{ translateY: logoTranslate }],
            },
          ]}
        >
          <Text style={styles.brandName}>
            MABOUNDZA
          </Text>

          <View style={styles.brandUnderline}>
            <View style={styles.brandUnderlineLine} />
            <View style={styles.brandUnderlineDot} />
            <View style={styles.brandUnderlineLine} />
          </View>
        </Animated.View>

        <Animated.Text
          style={[
            styles.slogan,
            { opacity: sloganOpacity },
          ]}
        >
          Découvre<Text style={styles.separator}> • </Text>
          Apprends<Text style={styles.separator}> • </Text>
          Protège
        </Animated.Text>

        <Animated.View
          style={[
            styles.footer,
            { opacity: footerOpacity },
          ]}
        >
          <Text style={styles.footerText}>
            NOS PLANTES, NOTRE RICHESSE
          </Text>
          <View style={styles.footerIcon}>
            <Text style={styles.footerLeaf}>✦</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: "hidden",
  },

  backgroundGlow: {
    position: "absolute",
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width,
    backgroundColor: COLORS.backgroundLight,
    opacity: 0.65,
    top: height * 0.18,
    alignSelf: "center",
  },

  particle: {
    position: "absolute",
    backgroundColor: COLORS.lightGreen,
    shadowColor: COLORS.green,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  topLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  topLine: {
    width: 25,
    height: 1,
    backgroundColor: COLORS.gold,
    opacity: 0.65,
  },

  topLabelText: {
    fontSize: 10,
    letterSpacing: 3,
    color: COLORS.gold,
    fontWeight: "600",
  },

  illustrationContainer: {
    width: 270,
    height: 290,
    alignItems: "center",
    justifyContent: "center",
  },

  halo: {
    position: "absolute",
    width: 205,
    height: 205,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: "rgba(166,240,185,0.18)",
    backgroundColor: "rgba(69,201,130,0.06)",
  },

  leafArtwork: {
    width: 220,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  scanner: {
    position: "absolute",
    width: 220,
    height: 250,
    left: 0,
    top: 0,
  },

  scannerLine: {
    position: "absolute",
    top: 124,
    width: "100%",
    height: 2,
    backgroundColor: "#C2FFD0",
    shadowColor: "#45C982",
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },

  scannerGlow: {
    position: "absolute",
    top: 110,
    width: "100%",
    height: 30,
    backgroundColor: "rgba(69,201,130,0.12)",
  },

  orbitDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: COLORS.gold,
    top: 47,
    right: 55,
  },

  orbitDotTwo: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.lightGreen,
    bottom: 48,
    left: 58,
  },

  brandContainer: {
    alignItems: "center",
    marginTop: 8,
  },

  brandName: {
    color: COLORS.white,
    fontSize: 35,
    fontWeight: "800",
    letterSpacing: 5,
  },

  brandUnderline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },

  brandUnderlineLine: {
    width: 35,
    height: 1,
    backgroundColor: COLORS.gold,
  },

  brandUnderlineDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },

  slogan: {
    color: COLORS.muted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 24,
    fontWeight: "500",
  },

  separator: {
    color: COLORS.gold,
  },

  footer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
  },

  footerText: {
    fontSize: 9,
    color: COLORS.muted,
    letterSpacing: 2.5,
    fontWeight: "600",
  },

  footerIcon: {
    marginTop: 14,
  },

  footerLeaf: {
    color: COLORS.green,
    fontSize: 16,
  },
});
