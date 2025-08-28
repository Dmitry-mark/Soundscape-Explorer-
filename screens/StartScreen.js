// StartScreen.jsx
import React from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";

const bg = require("../assets/fon.png");
const logo = require("../assets/logo.png");
const btnQuiz = require("../assets/btn1.png");
const btnOther = require("../assets/btn2.png");

export default function StartScreen({ navigation }) {
  const goQuiz = () => navigation.navigate("Quiz");
  const goEngineer = () => navigation.navigate("SoundEngineerScreen");

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        {/* ЛОГО */}
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        {/* БЛОК КНОПОК */}
        <View style={styles.centerBlock}>
          <MenuButton
            image={btnQuiz}
            onPress={goQuiz}
            testID="btn-quiz"
          />
          <MenuButton
            image={btnOther}
            onPress={goEngineer}
            testID="btn-engineer"
          />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function MenuButton({ image, label, onPress, testID }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.btnTouch}
      testID={testID}
    >
      <ImageBackground
        source={image}
        style={styles.btn}
        imageStyle={styles.btnImg}
        resizeMode="contain"
      >
        <Text style={styles.btnText}>{label}</Text>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#1a0f06",
  },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 24 : 0,
    alignItems: "center",
  },
  logoWrap: {
    marginTop: 24,
    marginBottom: 40,
    alignItems: "center",
  },
  logo: {
    width: "70%",
    aspectRatio: 3,
  },
   centerBlock: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 50,
    gap: 30, // больше расстояние между кнопками
  },
  btnTouch: {
    width: "72%", // шире
    maxWidth: 420, // лимит на планшетах
  },
  btn: {
    width: "100%",
    aspectRatio: 3.2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnImg: {
    borderRadius: 8,
  },
});
