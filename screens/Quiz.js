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
} from "react-native";
import { Audio } from "expo-av";
import { CommonActions } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

// Графика
const bg = require("../assets/fon.png");
const optionFrame = require("../assets/btn.png");       // рамка вариантов/кнопок
const audioFrame = require("../assets/Group 8.png");    // рамка плеера
const backImg   = require("../assets/backward.png");        // <-- фото кнопки "назад"

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

const ALL_KEYS = Object.keys(SOUNDS); // ровно 6

// helpers
const pick = (arr, n) => arr.slice().sort(() => Math.random() - 0.5).slice(0, n);

export default function QuizScreen({ navigation }) {
  // последовательность из 6 уникальных звуков
  const [order, setOrder] = useState(ALL_KEYS.slice().sort(() => Math.random() - 0.5));
  const [index, setIndex] = useState(0); // 0..5
  const [question, setQuestion] = useState(null);
  const [options, setOptions] = useState([]);
  const [picked, setPicked] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [feedback, setFeedback] = useState(""); // Correct! / Wrong!
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const soundRef = useRef(null);

  // создать текущий вопрос из order[index]
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
    },
    [order]
  );

  // старт
  useEffect(() => {
    makeQuestion(0);
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, [makeQuestion]);

  // загрузка звука на каждый вопрос
  useEffect(() => {
    (async () => {
      if (!question) return;
      if (soundRef.current) {
        try { await soundRef.current.stopAsync(); } catch {}
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(question.file, { shouldPlay: false });
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) setIsPlaying(status.isPlaying);
      });
    })();
  }, [question]);

  // play/pause
  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, []);

  // выбор ответа
  const onPick = async (opt) => {
    if (picked || finished) return;
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
   const ROOT_ROUTE = "StartScreen"; // ← если у тебя 'StartScreen' — замени здесь
   const action = CommonActions.reset({
     index: 0,
     routes: [{ name: ROOT_ROUTE }],
   });
   // пробуем сбросить родительский (корневой) навигатор, если есть
   const parent = navigation.getParent?.();
   if (parent) parent.dispatch(action);
   else navigation.dispatch(action);

   // fallback: если имя всё-таки не совпало — просто вверх стека и перейти по имени
   try { navigation.popToTop(); } catch {}
   navigation.navigate(ROOT_ROUTE);
 };

  // заглушка заголовка (по ТЗ — пусто)
  const headerTitle = useMemo(() => "", []);

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

          <Text style={styles.title} numberOfLines={1}>
            {headerTitle}
          </Text>

          <View style={{ width: 36 }} />
        </View>

        {/* Если квиз завершён — показываем меню результата */}
        {finished ? (
          <View style={styles.resultWrap}>
            <Text style={styles.resultTitle}>Your score</Text>
            <Text style={styles.resultScore}>
              {score} / 6
            </Text>

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
            {/* Плеер — внутри рамки Group 8 */}
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
                    {/* Иконку не трогаем — она внутри кнопки */}
                    <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
                  </Pressable>

                  <View style={styles.waveFill}>
                    {[0.5, 0.7, 0.9, 0.4, 0.8, 0.6].map((h, i) => (
                      <View key={i} style={[styles.waveBar, { height: `${h * 100}%` }]} />
                    ))}
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

            {/* Варианты — по центру экрана */}
            <View style={styles.options}>
              {options.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => onPick(opt)}
                  disabled={!!picked}
                  style={({ pressed }) => [styles.optionTouch, pressed && { opacity: 0.9 }]}
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
                </Pressable>
              ))}
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
  backImg: { width: 35, height: 35 }, // картинка стрелки
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
  waveFill: {
    flex: 1,
    height: "45%",
    flexDirection: "row",
    paddingLeft: 15,
    alignItems: "center",
    gap: 6,
  },
  waveBar: {
    flex: 1,
    maxWidth: 25,
    backgroundColor: "rgba(255, 214, 130, 0.95)",
    borderRadius: 3,
  },

  // Результат
  feedback: { textAlign: "center", marginTop: 10, fontSize: 16, fontWeight: "800" },
  ok: { color: "#B7FF7A" },
  bad: { color: "#FFB5A1" },

  // Центрированные варианты
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
  resultBtn: {
    width: "100%",
    aspectRatio: 3.7,
    alignItems: "center",
    justifyContent: "center",
  },
  resultBtnText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#f7e3b0",
    textAlign: "center",
    letterSpacing: 1,
  },
});
