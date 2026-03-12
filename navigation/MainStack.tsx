import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import { useUser } from '../context/UserContext';
import AdmHomeScreen from '../screens/adm/AdmHomeScreen';
import AdmRelatoriosScreen from '../screens/adm/AdmRelatoriosScreen';
import AdmTecnicosScreen from '../screens/adm/AdmTecnicosScreen';
import AgendaScreen from '../screens/AgendaScreen';
import DetalhesServicoScreen from '../screens/DetalhesServicoScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HomeScreen from '../screens/HomeScreen';
import PedidoScreen from '../screens/PedidoScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useUser() as unknown as { user?: { typeUser?: string } | null };
  const isAdmin = String(user?.typeUser || '').toLowerCase() === 'admin';

  if (isAdmin) {
    return <AdminTabs />;
  }

  return <UserTabs />;
}

function UserTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#E7B3B3',
        tabBarStyle: {
          backgroundColor: '#7A1A1A',
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

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#D69A9A',
        tabBarStyle: {
          backgroundColor: '#6B1111',
          borderTopWidth: 0,
          height: 78,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 0,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
        },
        tabBarItemStyle: {
          paddingVertical: 1,
        },
        tabBarLabelStyle: {
          fontSize: 22 / 1.5,
          fontWeight: '600',
          marginBottom: 0,
        },
        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Pedidos: 'home-outline',
            Tecnicos: 'account-check-outline',
            Relatorios: 'chart-bar',
          } as const;

          const iconName = icons[route.name as keyof typeof icons] || 'circle-outline';
          const iconSize = 23;

          if (focused) {
            return (
              <View style={{ borderColor: 'rgba(255,255,255,0.75)', borderWidth: 1.5, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
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
      <Tab.Screen name="Pedidos" component={AdmHomeScreen} />
      <Tab.Screen name="Tecnicos" component={AdmTecnicosScreen} />
      <Tab.Screen name="Relatorios" component={AdmRelatoriosScreen} />
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
