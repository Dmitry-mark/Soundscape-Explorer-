// QuizScreen.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Platform,
  Pressable,
  Image,
  Animated,
  Easing,
} from "react-native";
import { Audio } from "expo-av";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Графика
const bg = require("../assets/fon.png");
const optionFrame = require("../assets/btn.png");
const audioFrame = require("../assets/Group 8.png");
const backImg = require("../assets/backward.png");

// ====== ДАННЫЕ КВИЗА ======
const SOUNDS = {
  blacksmith_hammer: {
    file: require("../assets/sounds/blacksmith_hammer.mp3"),
    label: "Blacksmith's hammer",
    group: "history",
  },
  sail_creak: {
    file: require("../assets/sounds/sail_creak.mp3"),
    label: "The creak of the sail",
    group: "history",
  },
  goose_feather: {
    file: require("../assets/sounds/goose_feather.mp3"),
    label: "Goose feather",
    group: "history",
  },
  caramel_sizzle: {
    file: require("../assets/sounds/caramel_sizzle.mp3"),
    label: "Caramel sizzle",
    group: "sweets",
  },
  nut_click: {
    file: require("../assets/sounds/nut_click.mp3"),
    label: "Nut click",
    group: "sweets",
  },
  waffle_crunch: {
    file: require("../assets/sounds/waffle_crunch.mp3"),
    label: "Waffle crunch",
    group: "sweets",
  },
};

const ALL_KEYS = Object.keys(SOUNDS);

// helpers
const pick = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);

// ====== ВОЛНА ======
const WAVE_COUNT = 28;

function seededWave(key, count = WAVE_COUNT) {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const raw = Array.from({ length: count }, () => 0.35 + rand() * 0.65);
  return raw.map((_, i) => {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[i];
    const c = raw[Math.min(raw.length - 1, i + 1)];
    return Math.min(1, Math.max(0.2, (a + 2 * b + c) / 4));
  });
}

export default function QuizScreen({ navigation }) {
  const [order, setOrder] = useState(ALL_KEYS.slice().sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [wave, setWave] = useState(Array(WAVE_COUNT).fill(0.5));

  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const soundRef = useRef(null);

  // --- Анимации вариантов ---
  // на каждый вариант: enter (0..1), pressScale (1), shakeX (0)
  const animsRef = useRef([]);

  const makeQuestion = useCallback(
    (i) => {
      const key = order[i];
      const value = SOUNDS[key];
      const distractors = pick(
        ALL_KEYS.filter((k) => k !== key).map((k) => ({ key: k, label: SOUNDS[k].label })),
        2
      );
      const rawOptions = [
        { key, label: value.label, correct: true },
        ...distractors.map((d) => ({ ...d, correct: false })),
      ].sort(() => Math.random() - 0.5);

      setQuestion({ key, label: value.label, file: value.file, group: value.group });
      setOptions(rawOptions);
      setPicked(null);
      setFeedback("");
      setWave(seededWave(key));
      setProgress(0);

      // заново поднимем анимации для входа
      animsRef.current = rawOptions.map(() => ({
        enter: new Animated.Value(0),
        press: new Animated.Value(1),
        shake: new Animated.Value(0),
      }));
      // ступенчатое появление
      Animated.stagger(
        80,
        animsRef.current.map((a) =>
          Animated.spring(a.enter, {
            toValue: 1,
            useNativeDriver: true,
            stiffness: 140,
            damping: 14,
          })
        )
      ).start();
    },
    [order]
  );

  useEffect(() => {
    makeQuestion(0);
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, [makeQuestion]);

  useEffect(() => {
    (async () => {
      if (!question) return;
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
        } catch {}
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(question.file, { shouldPlay: false });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          const d = status.durationMillis || 0;
          const p = status.positionMillis || 0;
          setProgress(d > 0 ? Math.min(p / d, 1) : 0);
        } else {
          setProgress(0);
        }
      });
    })();
  }, [question]);

  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    const st = await soundRef.current.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) await soundRef.current.pauseAsync();
    else await soundRef.current.playAsync();
  }, []);

  // анимированный обработчик нажатия варианта
  const handlePick = async (opt, idx) => {
    if (picked || finished) return;

    const anim = animsRef.current[idx];
    if (anim) {
      // «тап» (пружина)
      Animated.sequence([
        Animated.spring(anim.press, { toValue: 0.94, useNativeDriver: true, stiffness: 250, damping: 18 }),
        Animated.spring(anim.press, { toValue: 1, useNativeDriver: true, stiffness: 250, damping: 18 }),
      ]).start();

      // доп. эффект правильный/неправильный
      if (opt.correct) {
        // лёгкая пульсация
        Animated.sequence([
          Animated.timing(anim.press, { toValue: 1.06, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim.press, { toValue: 1, duration: 120, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start();
      } else {
        // «шейк»
        Animated.sequence([
          Animated.timing(anim.shake, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(anim.shake, { toValue: -1, duration: 60, useNativeDriver: true }),
          Animated.timing(anim.shake, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(anim.shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
      }
    }

    // логика ответа
    setPicked(opt.key);
    const correct = !!opt.correct;
    setFeedback(correct ? "Correct!" : "Wrong!");
    if (correct) setScore((s) => s + 1);

    setTimeout(async () => {
      try {
        if (soundRef.current) {
          const st = await soundRef.current.getStatusAsync();
          if (st.isLoaded && st.isPlaying) await soundRef.current.stopAsync();
        }
      } catch {}
      if (index >= 5) {
        setFinished(true);
      } else {
        const ni = index + 1;
        setIndex(ni);
        makeQuestion(ni);
      }
    }, 900);
  };

  // РЕЗУЛЬТАТЫ
  const restart = () => {
    const newOrder = ALL_KEYS.slice().sort(() => Math.random() - 0.5);
    setOrder(newOrder);
    setIndex(0);
    setScore(0);
    setFinished(false);
    makeQuestion(0);
  };
  const goMenu = () => {
    const ROOT_ROUTE = "StartScreen";
    const action = CommonActions.reset({ index: 0, routes: [{ name: ROOT_ROUTE }] });
    const parent = navigation.getParent?.();
    if (parent) parent.dispatch(action);
    else navigation.dispatch(action);
    try {
      navigation.popToTop();
    } catch {}
    navigation.navigate(ROOT_ROUTE);
  };

  const headerTitle = useMemo(() => "", []);
  const filledBars = Math.floor(progress * WAVE_COUNT);

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Верхняя панель */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack?.()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Image source={backImg} style={styles.backImg} resizeMode="contain" />
          </Pressable>

          <Text style={styles.title} numberOfLines={1}>{headerTitle}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Если квиз завершён */}
        {finished ? (
          <View style={styles.resultWrap}>
            <Text style={styles.resultTitle}>Your score</Text>
            <Text style={styles.resultScore}>{score} / 6</Text>

            <Pressable onPress={restart} style={({ pressed }) => [styles.resultBtnTouch, pressed && { opacity: 0.9 }]}>
              <ImageBackground source={optionFrame} style={styles.resultBtn} imageStyle={styles.optionImg} resizeMode="stretch">
                <Text style={styles.resultBtnText}>RESTART</Text>
              </ImageBackground>
            </Pressable>

            <Pressable onPress={goMenu} style={({ pressed }) => [styles.resultBtnTouch, pressed && { opacity: 0.9 }]}>
              <ImageBackground source={optionFrame} style={styles.resultBtn} imageStyle={styles.optionImg} resizeMode="stretch">
                <Text style={styles.resultBtnText}>GO MENU</Text>
              </ImageBackground>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Плеер */}
            <View style={styles.playerWrap}>
              <ImageBackground
                source={audioFrame}
                style={styles.audioFrame}
                imageStyle={styles.audioFrameImg}
                resizeMode="stretch"
              >
                <View style={styles.playerContent}>
                  <Pressable
                    onPress={togglePlay}
                    style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.9 }]}
                    accessibilityRole="button"
                    accessibilityLabel="Play / Pause"
                  >
                    <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
                  </Pressable>

                  {/* Ряд палочек: белые = уже проиграно, золотые = ещё впереди */}
                  <View style={styles.waveRow}>
                    {wave.map((h, i) => {
                      const color = i < filledBars ? "#ffffff" : "#d9a64c";
                      return (
                        <View
                          key={i}
                          style={[
                            styles.waveBar,
                            { height: `${h * 100}%`, backgroundColor: color },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              </ImageBackground>
            </View>

            {/* Сообщение о результате */}
            {!!feedback && (
              <Text style={[styles.feedback, feedback === "Correct!" ? styles.ok : styles.bad]}>
                {feedback}
              </Text>
            )}

            {/* Варианты с анимациями */}
            <View style={styles.options}>
              {options.map((opt, idx) => {
                const a = animsRef.current[idx];
                const translateY = a?.enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }) || 0;
                const translateX = a?.shake.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-8, 8],
                }) || 0;
                const scale = a?.press || 1;

                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => handlePick(opt, idx)}
                    disabled={!!picked}
                    style={({ pressed }) => [styles.optionTouch, pressed && { opacity: 0.95 }]}
                  >
                    <Animated.View
                      style={{
                        transform: [{ translateY }, { translateX }, { scale }],
                        width: "100%",
                      }}
                    >
                      <ImageBackground
                        source={optionFrame}
                        style={styles.optionFrame}
                        imageStyle={styles.optionImg}
                        resizeMode="stretch"
                      >
                        <Text numberOfLines={2} style={styles.optionText}>
                          {opt.label}
                        </Text>
                      </ImageBackground>
                    </Animated.View>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#160d06" },
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? 24 : 0 },

  // Верхняя панель
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  backImg: { width: 35, height: 35 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: "#f6e4bd",
    letterSpacing: 0.3,
  },

  // Плеер
  playerWrap: { paddingHorizontal: "5%", marginTop: 10 },
  audioFrame: {
    width: "100%",
    aspectRatio: 2.0,
    alignItems: "center",
    justifyContent: "center",
  },
  audioFrameImg: { borderRadius: 10 },
  playerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "90%",
    height: "100%",
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  // Волна
  waveRow: {
    flex: 1,
    height: 28,
    marginLeft: 10,
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
    opacity: 0.98,
  },

  // Результат
  feedback: { textAlign: "center", marginTop: 10, fontSize: 16, fontWeight: "800" },
  ok: { color: "#B7FF7A" },
  bad: { color: "#FFB5A1" },

  // Варианты
  options: {
    flex: 1,
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 70,
  },
  optionTouch: { width: "85%", maxWidth: 420, alignSelf: "center" },
  optionFrame: {
    width: "100%",
    aspectRatio: 3.7,
    alignItems: "center",
    justifyContent: "center",
  },
  optionImg: { borderRadius: 10 },
  optionText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f7e3b0",
    textAlign: "center",
  },

  // Экран результатов
  resultWrap: {
    flex: 1,
    paddingHorizontal: "6%",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f6e4bd",
    marginBottom: 6,
  },
  resultScore: {
    fontSize: 28,
    fontWeight: "900",
    color: "#ffe6ad",
    marginBottom: 18,
  },
  resultBtnTouch: { width: "85%", maxWidth: 420 },
  resultBtn: { width: "100%", aspectRatio: 3.7, alignItems: "center", justifyContent: "center" },
  resultBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#f7e3b0",
    textAlign: "center",
    letterSpacing: 1,
  },
});
