import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import RegistrationSuccessScreen from '../screens/RegistrationSuccessScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

const Stack = createNativeStackNavigator();

// AuthStack contém todas as telas que um usuário não autenticado pode ver.
export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
      <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="RegistrationSuccess" component={RegistrationSuccessScreen} />
    </Stack.Navigator>
  );
}
