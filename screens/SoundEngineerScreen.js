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
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

// Графика
const selectBg = require("../assets/fon.png");   // фон экрана выбора темы
const bgMarket = require("../assets/fon2.png");
const bgShip   = require("../assets/fon3.png");
const bgKitchen= require("../assets/fon4.png");

const optionFrame = require("../assets/btn.png");
const audioFrame  = require("../assets/Group 8.png");
const backImg     = require("../assets/backward.png");

// Конфиг тем
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

export default function SoundEngineerScreen({ navigation }) {
  // null -> экран выбора темы; иначе — одна из 'market' | 'ship' | 'kitchen'
  const [theme, setTheme] = useState(null);

  // состояние экрана звукорежиссёра
  const [selected, setSelected] = useState(new Set());
  const [saved, setSaved] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const cfg = theme ? THEMES[theme] : null;
  const soundsMap = cfg?.sounds || {};
  const KEYS = useMemo(() => Object.keys(soundsMap), [cfg]);

  // для микса: ключ -> Audio.Sound
  const soundsRef = useRef(new Map());

  // очистка при размонтировании
  useEffect(() => {
    return () => {
      for (const s of soundsRef.current.values()) s.unloadAsync?.();
      soundsRef.current.clear();
    };
  }, []);

  // при смене темы — сброс выбора/сохранения/плеера
  useEffect(() => {
    setSelected(new Set());
    setSaved(false);
    setIsPlaying(false);
    for (const s of soundsRef.current.values()) s.unloadAsync?.();
    soundsRef.current.clear();
  }, [theme]);

  // служебные
  const ensureLoaded = useCallback(async (key) => {
    if (soundsRef.current.has(key)) return;
    const { sound } = await Audio.Sound.createAsync(soundsMap[key].file, { shouldPlay: false });
    soundsRef.current.set(key, sound);
  }, [soundsMap]);

  const unload = useCallback(async (key) => {
    const s = soundsRef.current.get(key);
    if (s) { try { await s.stopAsync(); } catch {} await s.unloadAsync(); }
    soundsRef.current.delete(key);
  }, []);

  // выбор плитки
  const toggleTrack = async (key) => {
    if (saved) return;
    const next = new Set(selected);
    if (next.has(key)) { next.delete(key); await unload(key); }
    else { next.add(key); await ensureLoaded(key); }
    setSelected(next);
  };

  // плеер: play/pause все выбранные
  const togglePlay = useCallback(async () => {
    const keys = Array.from(selected);
    if (keys.length === 0) return;
    for (const k of keys) {
      if (!soundsRef.current.has(k)) {
        const { sound } = await Audio.Sound.createAsync(soundsMap[k].file, { shouldPlay: false });
        soundsRef.current.set(k, sound);
      }
    }
    if (isPlaying) {
      await Promise.all(keys.map(async (k) => {
        const s = soundsRef.current.get(k);
        try { const st = await s.getStatusAsync(); if (st.isLoaded && st.isPlaying) await s.pauseAsync(); } catch {}
      }));
      setIsPlaying(false);
    } else {
      await Promise.all(keys.map(async (k) => {
        const s = soundsRef.current.get(k);
        try { const st = await s.getStatusAsync(); if (st.isLoaded) { await s.setPositionAsync(0); await s.playAsync(); } } catch {}
      }));
      setIsPlaying(true);
    }
  }, [isPlaying, selected, soundsMap]);

  const onSave = () => setSaved(true);

  // плитка в сетке
  const TrackTile = ({ item }) => {
    const isSel = selected.has(item);
    return (
      <Pressable onPress={() => toggleTrack(item)} style={({ pressed }) => [styles.tileTouch, pressed && { opacity: 0.9 }]}>
        <ImageBackground source={optionFrame} style={styles.tileFrame} imageStyle={styles.tileImg} resizeMode="stretch">
          {isSel && <View style={styles.whiteInset} />}
          <Text numberOfLines={2} style={[styles.tileText, isSel && styles.tileTextSelected]}>
            {soundsMap[item].label}
          </Text>
        </ImageBackground>
      </Pressable>
    );
  };

  // ЭКРАН ВЫБОРА ТЕМЫ
  if (!theme) {
    return (
      <ImageBackground source={selectBg} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={styles.safe}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

          <View style={styles.themeWrap}>
            <Text style={styles.themeTitle}>Choose a scene</Text>

            <Pressable onPress={() => setTheme("market")} style={styles.themeBtnTouch}>
              <ImageBackground source={optionFrame} style={styles.themeBtn} imageStyle={styles.tileImg} resizeMode="stretch">
                <Text style={styles.themeBtnText}>Marketplace</Text>
              </ImageBackground>
            </Pressable>

            <Pressable onPress={() => setTheme("ship")} style={styles.themeBtnTouch}>
              <ImageBackground source={optionFrame} style={styles.themeBtn} imageStyle={styles.tileImg} resizeMode="stretch">
                <Text style={styles.themeBtnText}>Ship</Text>
              </ImageBackground>
            </Pressable>

            <Pressable onPress={() => setTheme("kitchen")} style={styles.themeBtnTouch}>
              <ImageBackground source={optionFrame} style={styles.themeBtn} imageStyle={styles.tileImg} resizeMode="stretch">
                <Text style={styles.themeBtnText}>Kitchen</Text>
              </ImageBackground>
            </Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ЭКРАН ЗВУКОРЕЖИССЁРА ДЛЯ ВЫБРАННОЙ ТЕМЫ
  return (
    <ImageBackground source={cfg.bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack?.()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.85 }]}>
            <Image source={backImg} style={styles.backImg} resizeMode="contain" />
          </Pressable>
          <Text style={styles.title}>{cfg.title}</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Плеер */}
        <View style={[styles.playerWrap, saved && styles.playerWrapCentered]}>
          <ImageBackground source={audioFrame} style={styles.audioFrame} imageStyle={styles.audioFrameImg} resizeMode="stretch">
            <View style={styles.playerContent}>
              <Pressable onPress={togglePlay} style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.9 }]} accessibilityRole="button" accessibilityLabel="Play / Pause">
                <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
              </Pressable>

              {/* Дорожка: тёмная полоса + белые столбики (как на квизе) */}
              <View style={styles.waveFill}>
                {[0.5, 0.7, 0.9, 0.4, 0.8, 0.6].map((h, i) => (
                  <View key={i} style={[styles.waveBar, { height: `${h * 100}%` }]} />
                ))}
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* Панель выбора дорожек + SAVE */}
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

            <Pressable onPress={onSave} style={({ pressed }) => [styles.saveTouch, pressed && { opacity: 0.9 }]}>
              <ImageBackground source={optionFrame} style={styles.saveBtn} imageStyle={styles.tileImg} resizeMode="stretch">
                <Text style={styles.saveText}>SAVE</Text>
              </ImageBackground>
            </Pressable>
          </>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#160d06" },
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? 24 : 0 },

  // Экран выбора сцены
  themeWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: "10%",
  },
  themeTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#f6e4bd",
    marginBottom: 6,
  },
  themeBtnTouch: { width: "100%", maxWidth: 420 },
  themeBtn: { width: "100%", aspectRatio: 3.7, alignItems: "center", justifyContent: "center" },
  themeBtnText: { fontSize: 18, fontWeight: "900", color: "#f7e3b0", textAlign: "center", letterSpacing: 1 },

  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 6, paddingBottom: 8, gap: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  backImg: { width: 35, height: 35 },
  title: { flex: 1, textAlign: "center", fontSize: 22, fontWeight: "800", color: "#f6e4bd", letterSpacing: 0.3 },

  // Плеер
  playerWrap: { paddingHorizontal: "5%", marginTop: 10 },
  playerWrapCentered: { flex: 1, justifyContent: "center", paddingHorizontal: "5%", marginTop: 0 },
  audioFrame: { width: "100%", aspectRatio: 2.0, alignItems: "center", justifyContent: "center" },
  audioFrameImg: { borderRadius: 10 },
  playerContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "90%", height: "100%" },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center", marginLeft: 10 },

  // «волна» (как раньше)
  waveFill: { flex: 1, height: "45%", flexDirection: "row", paddingLeft: 15, alignItems: "center", gap: 6 },
  waveBar: { flex: 1, maxWidth: 25, backgroundColor: "rgba(255, 214, 130, 0.95)", borderRadius: 3 },

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
  tileTouch: { flex: 1 },
  tileFrame: { width: "100%", aspectRatio: 2.3, alignItems: "center", justifyContent: "center" },
  tileImg: { borderRadius: 10 },
  whiteInset: { position: "absolute", left: "8%", right: "8%", top: "22%", bottom: "22%", backgroundColor: "#ffffff", borderRadius: 6 },
  tileText: { fontSize: 14, fontWeight: "800", color: "#f7e3b0", textAlign: "center" },
  tileTextSelected: { color: "#5b250d" },

  // SAVE
  saveTouch: { alignSelf: "center", width: "60%", maxWidth: 320, marginTop: 14, marginBottom: 10 },
  saveBtn: { width: "100%", aspectRatio: 3.7, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 16, fontWeight: "900", color: "#f7e3b0", letterSpacing: 1, textAlign: "center" },
});
