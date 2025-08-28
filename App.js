// App.js
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// экраны
import StartScreen from "./screens/StartScreen";
import Quiz from "./screens/Quiz";
import SoundEngineerScreen from "./screens/SoundEngineerScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="StartScreen" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="StartScreen" component={StartScreen} />
          <Stack.Screen name="Quiz" component={Quiz} />
          <Stack.Screen name="SoundEngineerScreen" component={SoundEngineerScreen} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}
