import { registerRootComponent } from 'expo';
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

registerRootComponent(App);
