import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import AgendaScreen from '../screens/AgendaScreen';
import DetalhesServicoScreen from '../screens/DetalhesServicoScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import PedidoScreen from '../screens/PedidoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#8FF2B2',
        tabBarStyle: {
          backgroundColor: '#008000',
          borderTopWidth: 0,
          height: 74,
          paddingTop: 8,
          paddingBottom: 10,
          borderRadius: 24,
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 10,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Home: 'home-outline',
            Agenda: 'calendar-month-outline',
            Historico: 'history',
          } as const;

          const iconName = icons[route.name as keyof typeof icons] || 'circle-outline';
          const iconSize = 24;

          if (focused) {
            return (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={iconSize}
                  color={color}
                />
              </View>
            );
          }

          return <MaterialCommunityIcons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Historico" component={HistoricoScreen} />
    </Tab.Navigator>
  );
}

// MainStack contém todas as telas que um usuário autenticado pode ver.
export default function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="DetalhesServico" component={DetalhesServicoScreen} />
      <Stack.Screen name="Pedido" component={PedidoScreen} />
    </Stack.Navigator>
  );
}
