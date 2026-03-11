import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AgendaScreen from '../screens/AgendaScreen';
import DetalhesServicoScreen from '../screens/DetalhesServicoScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import PendentesScreen from '../screens/PendentesScreen';

const Stack = createNativeStackNavigator();

// MainStack contém todas as telas que um usuário autenticado pode ver.
export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Agenda" component={AgendaScreen} />
      <Stack.Screen name="Pendentes" component={PendentesScreen} />
      <Stack.Screen name="Historico" component={HistoricoScreen} />
      <Stack.Screen name="DetalhesServico" component={DetalhesServicoScreen} />
    </Stack.Navigator>
  );
}
