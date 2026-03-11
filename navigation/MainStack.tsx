import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

// MainStack contém todas as telas que um usuário autenticado pode ver.
export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      {/* Adicione outras telas principais aqui no futuro, como Perfil, etc. */}
    </Stack.Navigator>
  );
}
