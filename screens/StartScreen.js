// StartScreen.jsx
import React, { useEffect, useRef } from "react";
import {
  View,
  ImageBackground,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Pressable,
  Animated,
  Easing,
} from "react-native";

const bg = require("../assets/fon.png");
const logo = require("../assets/logo.png");
const btnQuiz = require("../assets/btn1.png");
const btnOther = require("../assets/btn2.png");

// вспомогательная функция для синус-интерполяции через ключевые точки
function sinPoints(amplitude = 1, offset = 0) {
  // t ∈ [0..1], sin(2π(t + offset))
  const ts = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const ys = ts.map(
    (t) => Math.sin(2 * Math.PI * (t + offset)) * amplitude
  );
  return { inputRange: ts, outputRange: ys };
}

export default function StartScreen({ navigation }) {
  const goQuiz = () => navigation.navigate("Quiz");
  const goEngineer = () => navigation.navigate("SoundEngineerScreen");

  // === ЕДИНЫЙ линейный драйвер, который крутится по кругу без стыков ===
  const loopT = useRef(new Animated.Value(0)).current;   // 0..1 линейно
  const logoOpacity = useRef(new Animated.Value(0)).current; // fade-in при входе

  useEffect(() => {
    // Плавное появление
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Бесконечный цикл 0 -> 1 -> 0 (по факту 1 оборачивается обратно в 0)
    Animated.loop(
      Animated.timing(loopT, {
        toValue: 1,
        duration: 6000,          // общий период
        easing: Easing.linear,   // линейно — интерполяции задают синус
        useNativeDriver: true,
      })
    ).start();
  }, [loopT, logoOpacity]);

  // Параметры анимации логотипа
  const FLOAT_AMPL = 8;   // px вверх/вниз
  const SCALE_AMPL = 0.04; // ±4%
  const TILT_AMPL  = 1.2;  // ±1.2 градусов

  // Интерполяции на основе loopT — в начале и в конце цикла значения одинаковые
  const { inputRange: IR1, outputRange: Y1 } = sinPoints(FLOAT_AMPL);        // sin(2πt)
  const { outputRange: S1 }                = sinPoints(SCALE_AMPL, 0.25);    // sin(2π(t+0.25)) для фазового сдвига
  const { outputRange: R1 }                = sinPoints(TILT_AMPL,  0.5);     // sin(2π(t+0.5)) ещё один сдвиг

  const logoTranslateY = loopT.interpolate({ inputRange: IR1, outputRange: Y1 });
  const logoScale      = loopT.interpolate({
    inputRange: IR1,
    outputRange: S1.map((v) => 1 + v),
  });
  const logoRotate     = loopT.interpolate({
    inputRange: IR1,
    outputRange: R1.map((deg) => `${deg}deg`),
  });

  // === Появление кнопок (stagger) ===
  const btn1Anim = useRef(new Animated.Value(0)).current;
  const btn2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(btn1Anim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(btn2Anim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [btn1Anim, btn2Anim]);

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* ЛОГО с бесшовной петлёй */}
        <View style={styles.logoWrap}>
          <Animated.Image
            source={logo}
            resizeMode="contain"
            style={[
              styles.logo,
              {
                opacity: logoOpacity,
                transform: [
                  { translateY: logoTranslateY },
                  { scale: logoScale },
                  { rotate: logoRotate },
                ],
              },
            ]}
          />
        </View>

        {/* БЛОК КНОПОК */}
        <View style={styles.centerBlock}>
          <AnimatedMenuButton
            image={btnQuiz}
            onPress={goQuiz}
            appearAnim={btn1Anim}
            testID="btn-quiz"
          />
          <AnimatedMenuButton
            image={btnOther}
            onPress={goEngineer}
            appearAnim={btn2Anim}
            testID="btn-engineer"
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

/**
 * Кнопка меню:
 * - плавное появление (fade + подлёт)
 * - пружина при нажатии (scale) + лёгкий tilt
 */
function AnimatedMenuButton({ image, onPress, appearAnim, testID }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressTilt  = useRef(new Animated.Value(0)).current; // -1..1 -> rotate

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.96,
        friction: 6,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(pressTilt, {
        toValue: -1,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        friction: 5,
        tension: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pressTilt, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const appearTranslate = appearAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const rotate = pressTilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-1.2deg", "1.2deg"],
  });

  return (
    <Animated.View
      style={[
        styles.btnTouch,
        {
          opacity: appearAnim,
          transform: [{ translateY: appearTranslate }, { scale: pressScale }, { rotate }],
        },
      ]}
    >
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
        testID={testID}
        style={{ borderRadius: 8, overflow: "hidden" }}
      >
        <ImageBackground
          source={image}
          style={styles.btn}
          imageStyle={styles.btnImg}
          resizeMode="contain"
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#1a0f06" },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 24 : 0,
    alignItems: "center",
  },

  // ЛОГО
  logoWrap: { marginTop: 24, marginBottom: 40, alignItems: "center" },
  logo: { width: "70%", aspectRatio: 3 },

  // Центр/кнопки
  centerBlock: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 50,
    gap: 30,
  },
  btnTouch: {
    width: "72%",
    maxWidth: 420,
  },
  btn: {
    width: "100%",
    aspectRatio: 3.2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnImg: { borderRadius: 8 },
});
