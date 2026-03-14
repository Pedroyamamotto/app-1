import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { UserProvider } from './context/UserContext';
import AppNavigator from './navigation/AppNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
