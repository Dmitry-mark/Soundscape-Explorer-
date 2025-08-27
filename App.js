// App.js
import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

// экраны
import StartScreen from "./screens/StartScreen";
import BalloonGame from "./screens/Game";

const Stack = createStackNavigator();

export default function App() {
  return (
    <GameStoreProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="StartScreen" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="StartScreen" component={StartScreen} />
          <Stack.Screen name="Game" component={Game} />
        </Stack.Navigator>
      </NavigationContainer>
    </GameStoreProvider>
  );
}
