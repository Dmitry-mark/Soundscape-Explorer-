// SoundEngineerScreen.jsx
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
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

// Фоны
const selectBg  = require("../assets/fon.png");   // экран выбора темы
const bgMarket  = require("../assets/fon2.png");
const bgShip    = require("../assets/fon3.png");
const bgKitchen = require("../assets/fon4.png");

// Графика UI
const optionFrame   = require("../assets/btn.png");       // обычная рамка
const selectedFrame = require("../assets/Group 5.png");   // рамка выбранной плитки
const audioFrame    = require("../assets/Group 8.png");
const backImg       = require("../assets/backward.png");

// ---- ВОЛНА (как в квизе) ----
const WAVE_COUNT = 28; // число палочек

function seededWave(seedStr, count = WAVE_COUNT) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
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

// ---- Конфиг сцен/тем ----
const THEMES = {
  market: {
    title: "Medieval Marketplace",
    bg: bgMarket,
    sounds: {
      blacksmith_hammer: { file: require("../assets/sounds/blacksmith_hammer.mp3"), label: "Blacksmith's hammer" },
      people_talking:    { file: require("../assets/sounds/people_talking.mp3"),     label: "People talking" },
      goose_feather:     { file: require("../assets/sounds/goose_feather.mp3"),      label: "Goose feather" },
      creaking_cart:     { file: require("../assets/sounds/creaking_cart.mp3"),      label: "Creaking cart" },
      tavern_music:      { file: require("../assets/sounds/tavern_music.mp3"),       label: "Tavern music" },
      waffle_crunch:     { file: require("../assets/sounds/waffle_crunch.mp3"),      label: "Waffle crunch" },
      coin_clinking:     { file: require("../assets/sounds/coin_clinking.mp3"),      label: "Coin clinking" },
      dog_barking:       { file: require("../assets/sounds/dog_barking.mp3"),        label: "Dog barking" },
    },
  },
  ship: {
    title: "Medieval Ship",
    bg: bgShip,
    sounds: {
      sail_flapping:   { file: require("../assets/sounds/sail_flapping.mp3"),   label: "Sail flapping" },
      rope_creak:      { file: require("../assets/sounds/rope_creak.mp3"),      label: "Rope & pulley creak" },
      waves_splash:    { file: require("../assets/sounds/waves_splash.mp3"),    label: "Waves splashing" },
      deck_steps:      { file: require("../assets/sounds/deck_steps.mp3"),      label: "Footsteps on deck" },
      ship_bell:       { file: require("../assets/sounds/ship_bell.mp3"),       label: "Ship bell" },
      gulls:           { file: require("../assets/sounds/gulls.mp3"),           label: "Seagulls" },
    },
  },
  kitchen: {
    title: "Medieval Kitchen",
    bg: bgKitchen,
    sounds: {
      stew_bubbling:   { file: require("../assets/sounds/stew_bubbling.mp3"),   label: "Stew bubbling" },
      fire_crackle:    { file: require("../assets/sounds/fire_crackle.mp3"),    label: "Hearth crackle" },
      knife_chop:      { file: require("../assets/sounds/knife_chop.mp3"),      label: "Knife chopping" },
      mortar_pestle:   { file: require("../assets/sounds/mortar_pestle.mp3"),   label: "Mortar & pestle" },
      dishes_clink:    { file: require("../assets/sounds/dishes_clink.mp3"),    label: "Dishes clinking" },
      spoon_stir:      { file: require("../assets/sounds/spoon_stir.mp3"),      label: "Wooden spoon stir" },
    },
  },
};

// ---------- Анимированные универсальные кнопки ----------
function usePressAnim() {
  const scale = useRef(new Animated.Value(1)).current;
  const tilt  = useRef(new Animated.Value(0)).current; // -1..1

  const onPressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.96, friction: 6, tension: 180, useNativeDriver: true }),
      Animated.timing(tilt,   { toValue: -1,   duration: 90, useNativeDriver: true }),
    ]).start();
  };
  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
      Animated.timing(tilt,   { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };
  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ["-1.2deg", "1.2deg"] });
  return { scale, rotate, onPressIn, onPressOut };
}

function ThemeButton({ label, onPress, appearDelay = 0 }) {
  const { scale, rotate, onPressIn, onPressOut } = usePressAnim();
  const appear = useRef(new Animated.Value(0)).current;
  const translateY = appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 500,
      delay: appearDelay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [appear, appearDelay]);

  return (
    <Animated.View style={[styles.themeBtnTouch, { opacity: appear, transform: [{ translateY }, { scale }, { rotate }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
        style={{ borderRadius: 10, overflow: "hidden" }}
      >
        <ImageBackground source={optionFrame} style={styles.themeBtn} imageStyle={styles.tileImg} resizeMode="stretch">
          <Text style={styles.themeBtnText}>{label}</Text>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

function SaveButton({ onPress }) {
  const { scale, rotate, onPressIn, onPressOut } = usePressAnim();
  return (
    <Animated.View style={[styles.saveTouch, { transform: [{ scale }, { rotate }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
        style={{ borderRadius: 10, overflow: "hidden" }}
      >
        <ImageBackground source={optionFrame} style={styles.saveBtn} imageStyle={styles.tileImg} resizeMode="stretch">
          <Text style={styles.saveText}>SAVE</Text>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

// Плитка трека (с анимацией и сменой рамки при выборе)
function TrackTileButton({ label, onPress, selected }) {
  const { scale, rotate, onPressIn, onPressOut } = usePressAnim();
  const frameImage = selected ? selectedFrame : optionFrame;
  return (
    <Animated.View style={[styles.tileTouch, { transform: [{ scale }, { rotate }] }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={onPress}
        android_ripple={{ color: "rgba(255,255,255,0.06)", borderless: false }}
        style={{ borderRadius: 10, overflow: "hidden" }}
      >
        <ImageBackground
          source={frameImage}
          style={styles.tileFrame}
          imageStyle={styles.tileImg}
          resizeMode="stretch"
        >
          <Text numberOfLines={2} style={[styles.tileText, selected && styles.tileTextSelected]}>
            {label}
          </Text>
        </ImageBackground>
      </Pressable>
    </Animated.View>
  );
}

export default function SoundEngineerScreen({ navigation }) {
  // null -> экран выбора темы
  const [theme, setTheme] = useState(null);

  // для выбранной темы
  const cfg = theme ? THEMES[theme] : null;
  const soundsMap = cfg?.sounds || {};
  const KEYS = useMemo(() => Object.keys(soundsMap), [cfg]);

  // состояние выбора дорожек и плеера
  const [selected, setSelected]   = useState(new Set());
  const [saved, setSaved]         = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // волна и прогресс (как в квизе)
  const [wave, setWave] = useState(seededWave("empty"));
  const [progress, setProgress] = useState(0); // 0..1
  const filledBars = Math.floor(progress * WAVE_COUNT);

  // refs на Audio.Sound и последние статусы
  const soundsRef = useRef(new Map());  // key -> Audio.Sound
  const statusRef = useRef(new Map());  // key -> {pos, dur, playing}

  // очистка на размонтировании
  useEffect(() => {
    return () => {
      for (const s of soundsRef.current.values()) s.unloadAsync?.();
      soundsRef.current.clear();
      statusRef.current.clear();
    };
  }, []);

  // при смене темы — полный сброс
  useEffect(() => {
    setSelected(new Set());
    setSaved(false);
    setIsPlaying(false);
    setProgress(0);
    setWave(seededWave("empty"));
    for (const s of soundsRef.current.values()) s.unloadAsync?.();
    soundsRef.current.clear();
    statusRef.current.clear();
  }, [theme]);

  // новая форма волны для текущего набора
  useEffect(() => {
    const key = Array.from(selected).sort().join("|") || "empty";
    setWave(seededWave(key));
  }, [selected]);

  // утилиты загрузки/выгрузки
  const ensureLoaded = useCallback(async (key) => {
    if (soundsRef.current.has(key)) return;
    const { sound } = await Audio.Sound.createAsync(soundsMap[key].file, { shouldPlay: false });
    sound.setOnPlaybackStatusUpdate((st) => {
      if (!st.isLoaded) return;
      statusRef.current.set(key, {
        pos: st.positionMillis || 0,
        dur: st.durationMillis || 0,
        playing: !!st.isPlaying,
      });
      let maxPos = 0, maxDur = 0;
      for (const { pos, dur } of statusRef.current.values()) {
        if (pos > maxPos) maxPos = pos;
        if (dur > maxDur) maxDur = dur;
      }
      setProgress(maxDur > 0 ? Math.min(maxPos / maxDur, 1) : 0);
      let anyPlaying = false;
      for (const v of statusRef.current.values()) { if (v.playing) { anyPlaying = true; break; } }
      setIsPlaying(anyPlaying);
    });
    soundsRef.current.set(key, sound);
  }, [soundsMap]);

  const unload = useCallback(async (key) => {
    const s = soundsRef.current.get(key);
    if (s) {
      try { await s.stopAsync(); } catch {}
      await s.unloadAsync();
    }
    soundsRef.current.delete(key);
    statusRef.current.delete(key);
  }, []);

  // выбор плитки
  const toggleTrack = async (key) => {
    if (saved) return;
    const next = new Set(selected);
    if (next.has(key)) { next.delete(key); await unload(key); }
    else { next.add(key); await ensureLoaded(key); }
    setSelected(next);
    setProgress(0);
  };

  // плеер: play/pause все выбранные
  const togglePlay = useCallback(async () => {
    const keys = Array.from(selected);
    if (keys.length === 0) return;

    // убедимся, что загружены
    for (const k of keys) {
      if (!soundsRef.current.has(k)) {
        const { sound } = await Audio.Sound.createAsync(soundsMap[k].file, { shouldPlay: false });
        sound.setOnPlaybackStatusUpdate((st) => {
          if (!st.isLoaded) return;
          statusRef.current.set(k, {
            pos: st.positionMillis || 0,
            dur: st.durationMillis || 0,
            playing: !!st.isPlaying,
          });
          let maxPos = 0, maxDur = 0;
          for (const { pos, dur } of statusRef.current.values()) {
            if (pos > maxPos) maxPos = pos;
            if (dur > maxDur) maxDur = dur;
          }
          setProgress(maxDur > 0 ? Math.min(maxPos / maxDur, 1) : 0);
          let anyPlaying = false;
          for (const v of statusRef.current.values()) { if (v.playing) { anyPlaying = true; break; } }
          setIsPlaying(anyPlaying);
        });
        soundsRef.current.set(k, sound);
      }
    }

    if (isPlaying) {
      await Promise.all(keys.map(async (k) => {
        const s = soundsRef.current.get(k);
        try {
          const st = await s.getStatusAsync();
          if (st.isLoaded && st.isPlaying) await s.pauseAsync();
        } catch {}
      }));
      setIsPlaying(false);
    } else {
      // синхронный старт
      await Promise.all(keys.map(async (k) => {
        const s = soundsRef.current.get(k);
        try {
          const st = await s.getStatusAsync();
          if (st.isLoaded) {
            await s.setPositionAsync(0);
            await s.playAsync();
          }
        } catch {}
      }));
      setIsPlaying(true);
    }
  }, [isPlaying, selected, soundsMap]);

  const onSave = () => setSaved(true);

  // плитка в сетке (с анимацией + смена картинки)
  const TrackTile = ({ item }) => {
    const isSel = selected.has(item);
    return (
      <TrackTileButton
        label={soundsMap[item].label}
        selected={isSel}
        onPress={() => toggleTrack(item)}
      />
    );
  };

  // ----- Экран выбора темы -----
  if (!theme) {
    return (
      <ImageBackground source={selectBg} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={styles.safe}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

          {/* Верхняя панель с «назад» → главное меню */}
          <View style={[styles.topBar, { marginBottom: 8 }]}>
            <Pressable
              onPress={() => { try { navigation.popToTop(); } catch {} navigation.navigate("StartScreen"); }}
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
            >
              <Image source={backImg} style={styles.backImg} resizeMode="contain" />
            </Pressable>
            <Text style={styles.title}>Choose a scene</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.themeWrap}>
            <ThemeButton label="Marketplace" onPress={() => setTheme("market")}  appearDelay={0} />
            <ThemeButton label="Ship"        onPress={() => setTheme("ship")}    appearDelay={120} />
            <ThemeButton label="Kitchen"     onPress={() => setTheme("kitchen")} appearDelay={240} />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ----- Экран звукорежиссёра для выбранной темы -----
  return (
    <ImageBackground source={cfg.bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => { try { navigation.goBack(); } catch {} }}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}
          >
            <Image source={backImg} style={styles.backImg} resizeMode="contain" />
          </Pressable>
          <Text style={styles.title}>{cfg.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Плеер — как на квизе (палочки белеют по прогрессу) */}
        <View style={[styles.playerWrap, saved && styles.playerWrapCentered]}>
          <ImageBackground source={audioFrame} style={styles.audioFrame} imageStyle={styles.audioFrameImg} resizeMode="stretch">
            <View style={styles.playerContent}>
              <Pressable
  onPress={togglePlay}
  style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.9 }]}
  accessibilityRole="button"
  accessibilityLabel="Play / Pause"
>
  <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
</Pressable>

              <View style={styles.waveRow}>
                {wave.map((h, i) => {
                  const color = i < filledBars ? "#ffffff" : "#d9a64c";
                  return <View key={i} style={[styles.waveBar, { height: `${h * 100}%`, backgroundColor: color }]} />;
                })}
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Панель выбора + SAVE (исчезает после сохранения) */}
        {!saved && (
          <>
            <View style={styles.panel}>
              <FlatList
                data={KEYS}
                keyExtractor={(k) => k}
                renderItem={TrackTile}
                numColumns={2}
                columnWrapperStyle={styles.row}
                contentContainerStyle={{ paddingVertical: 10 }}
              />
            </View>

            <SaveButton onPress={onSave} />
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#160d06" },
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? 24 : 0 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    gap: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  backImg: { width: 35, height: 35 },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#f6e4bd", letterSpacing: 0.3 },

  // Экран выбора сцены
  themeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: "10%",
  },
  themeBtnTouch: { width: "100%", maxWidth: 420 },
  themeBtn: { width: "100%", aspectRatio: 3.7, alignItems: "center", justifyContent: "center" },
  themeBtnText: { fontSize: 18, fontWeight: "900", color: "#f7e3b0", textAlign: "center", letterSpacing: 1 },

  // Плеер
  playerWrap: { paddingHorizontal: "5%", marginTop: 10 },
  playerWrapCentered: { flex: 1, justifyContent: "center", paddingHorizontal: "5%", marginTop: 0 },
  audioFrame: { width: "100%", aspectRatio: 2.0, alignItems: "center", justifyContent: "center" },
  audioFrameImg: { borderRadius: 10 },
  playerContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "90%", height: "100%" },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", marginLeft: 10 },

  // Волна — один ряд палочек (как в квизе)
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
  waveBar: { width: 6, borderRadius: 3, opacity: 0.98 },

  // Панель сетки
  panel: {
    marginTop: 14,
    height: "55%",
    marginHorizontal: "6%",
    padding: 10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,220,150,0.6)",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  row: { justifyContent: "space-between", marginBottom: 35, gap: 8 },

  // Плитки треков
  tileTouch: { flex: 1 },
  tileFrame: { width: "100%", aspectRatio: 2.3, alignItems: "center", justifyContent: "center" },
  tileImg: { borderRadius: 10 },
  tileText: { fontSize: 14, fontWeight: "800", color: "#f7e3b0", textAlign: "center" },
  tileTextSelected: { color: "#5b250d" },

  // SAVE
  saveTouch: { alignSelf: "center", width: "60%", maxWidth: 320, marginTop: 14, marginBottom: 10 },
  saveBtn: { width: "100%", aspectRatio: 3.7, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 16, fontWeight: "900", color: "#f7e3b0", letterSpacing: 1, textAlign: "center" },
});
