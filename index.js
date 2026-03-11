import React from 'react';
import { AppRegistry } from 'react-native';
import { UserProvider } from './context/UserContext';
import AppNavigator from './navigation/AppNavigator';

// O componente principal agora simplesmente envolve o AppNavigator com o UserProvider.
// Toda a lógica de qual tela mostrar está dentro do AppNavigator.
const App = () => {
  return (
    <UserProvider>
      <AppNavigator />
    </UserProvider>
  );
};

// Registra o componente principal da aplicação.
// O nome 'main' é o padrão para projetos React Native.
AppRegistry.registerComponent('main', () => App);
