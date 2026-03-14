import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import { UserProvider } from './context/UserContext';
import AppNavigator from './navigation/AppNavigator';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

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
