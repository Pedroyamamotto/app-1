import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';

// Este componente é o cérebro da navegação.
// Ele decide qual conjunto de telas mostrar com base no estado de autenticação.
export default function AppNavigator() {
  const { user } = useUser();

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
