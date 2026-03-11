import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function RegistrationSuccessScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams(); // Recebe o nome do usuário

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 10000); // Redireciona após 10 segundos

    return () => clearTimeout(timer); // Limpa o timer se o componente for desmontado
  }, [router]);

  const handleLogin = () => {
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.modalView}>
        <TouchableOpacity style={styles.closeButton} onPress={handleLogin}>
          <FontAwesome name="close" size={24} color="black" />
        </TouchableOpacity>
        <View style={styles.iconContainer}>
          <FontAwesome name="check-circle-o" size={50} color="#34d399" />
        </View>
        <Text style={styles.title}>Conta criada com sucesso!</Text>
        <Text style={styles.subtitle}>
          {/* Exibe o nome do usuário dinamicamente */}
          Bem-vindo, {name || 'novo usuário'}! Você já pode fazer login com suas credenciais.
        </Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Fazer Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '90%',
    },
    closeButton: {
        position: 'absolute',
        top: 15,
        right: 15,
    },
    iconContainer: {
        marginBottom: 20,
        backgroundColor: '#e6f9f1',
        borderRadius: 50,
        padding: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    loginButton: {
        backgroundColor: '#34d399',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 30,
        width: '100%',
        alignItems: 'center',
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
