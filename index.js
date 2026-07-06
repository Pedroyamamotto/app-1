
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
}

import { Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { UserProvider } from './context/UserContext';
import { ThemeProvider } from './context/ThemeContext';
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

// O componente principal agora simplesmente envolve o AppNavigator com o UserProvider e ThemeProvider.
// Toda a lógica de qual tela mostrar está dentro do AppNavigator.

const App = () => {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...MaterialIcons.font,
    ...Feather.font,
    ...FontAwesome.font,
  });
  if (!fontsLoaded) return null;
  return (
    <UserProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </UserProvider>
  );
};

registerRootComponent(App);
