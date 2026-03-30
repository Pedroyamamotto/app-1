import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegistrationSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { name } = (route.params as any) || {};

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    }, 10000); // Redireciona após 10 segundos

    return () => clearTimeout(timer); // Limpa o timer se o componente for desmontado
  }, [navigation]);

  const handleLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f2f5" />
      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/serviyama-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <FontAwesome name="check-circle" size={100} color="#7A1A1A" />
          </View>
          <Text style={styles.title}>Conta criada com sucesso!</Text>
          <Text style={styles.subtitle}>
            Bem-vindo, {name || 'novo usuário'}! Sua conta foi configurada com sucesso.
          </Text>
          <Text style={styles.info}>
            Você será redirecionado para o login em breve...
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Fazer Login Agora</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    marginBottom: 40,
  },
  logo: {
    width: 220,
    height: 100,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 40,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  info: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  loginButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 15,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
