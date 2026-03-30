import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useUser } from '../context/UserContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

// Este componente é o cérebro da navegação.
// Ele decide qual conjunto de telas mostrar com base no estado de autenticação.
export default function AppNavigator() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f2f5' }}>
        <ActivityIndicator size="large" color="#7A1A1A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
