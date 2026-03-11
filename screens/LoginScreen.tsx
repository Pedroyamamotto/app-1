import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiUrl } from '../constants/api';
import { useUser } from '../context/UserContext';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('E-mail inválido').required('O e-mail é obrigatório'),
  password: Yup.string().required('A senha é obrigatória'),
});

export default function LoginScreen() {
  const navigation = useNavigation();
  const { setUser } = useUser();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async (values, { setSubmitting }) => {
    try {
      const response = await fetch(apiUrl('/api/users/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const token =
          data?.access ||
          data?.token ||
          data?.accessToken ||
          data?.access_token ||
          data?.jwt ||
          data?.authToken ||
          data?.tokens?.access ||
          data?.tokens?.accessToken ||
          (response.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
          response.headers.get('x-access-token');

        const userData = data?.user || data?.usuario || data?.data?.user || data?.data || data;

        const hasUserIdentity = !!(userData?.email || userData?.name || userData?.nome || data?.userId);
        if (!token && !hasUserIdentity) {
          Alert.alert('Erro no login', 'Resposta da API inválida. Tente novamente.');
          return;
        }

        setUser({
          name: userData?.nome || userData?.name || userData?.username || 'Usuário',
          email: userData?.email || values.email,
          token: token || null,
          userId: data?.userId || userData?.id || null,
          typeUser: data?.typeUser || userData?.typeUser || null,
        });
      } else {
        const errorMessage =
          data?.detail ||
          data?.message ||
          data?.error ||
          (response.status === 403
            ? 'Conta não verificada. Verifique seu e-mail antes de entrar.'
            : 'Credenciais inválidas. Verifique seu e-mail e senha.');
        Alert.alert('Erro no login', errorMessage);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <FontAwesome name="lock" size={50} color="#34d399" />
            </View>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Bem-vindo de volta!</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                keyboardType="email-address"
                value={values.email}
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
              />
              {touched.email && errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Sua senha"
                  secureTextEntry={!isPasswordVisible}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                />
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                  <FontAwesome name={isPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {touched.password && errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.loginButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Entrar</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Não tem uma conta? <Text style={styles.registerLinkHighlight}>Crie agora</Text></Text>
            </TouchableOpacity>
          </View>
        )}
      </Formik>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 35,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#e6f9f1',
    borderRadius: 80,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#34d399',
    fontSize: 14,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#34d399',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  registerLinkHighlight: {
    color: '#34d399',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 5,
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  }
});
