import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';
import { useUser } from '../context/UserContext';

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('E-mail inválido').required('O e-mail é obrigatório'),
  password: Yup.string().required('A senha é obrigatória'),
});

const applyMaskedPasswordInput = (typedValue: string, currentPassword: string) => {
  const typed = String(typedValue || '');
  const current = String(currentPassword || '');

  if (typed.length < current.length) {
    return current.slice(0, typed.length);
  }

  if (typed.length === current.length) {
    return current;
  }

  const appended = typed.slice(current.length).replace(/\*/g, '');
  return `${current}${appended}`;
};

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setUser } = useUser();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const ADMIN_EMAIL = 'admin.20260311163417@yama.ia.br';
  const ADMIN_PASSWORD = 'Admin@123456';
  const ADMIN_USER_ID = '69b1c3b9cec65a495eaccef7';

  const handleLogin = async (values, { setSubmitting }) => {
    const normalizedEmail = String(values.email || '').trim().toLowerCase();
    const trimmedPassword = String(values.password || '').trim();

    try {
      const response = await apiFetch('/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password: trimmedPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const isKnownAdminCredential = normalizedEmail === ADMIN_EMAIL && trimmedPassword === ADMIN_PASSWORD;

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
        const apiTypeUser = String(data?.typeUser || userData?.typeUser || '').toLowerCase();
        const resolvedUserId = data?.userId || userData?.id || (isKnownAdminCredential ? ADMIN_USER_ID : null);

        const isAdminUser =
          apiTypeUser === 'admin' ||
          String(resolvedUserId || '') === ADMIN_USER_ID ||
          normalizedEmail === ADMIN_EMAIL;

        const resolvedTypeUser = isAdminUser ? 'admin' : apiTypeUser || 'user';

        const hasUserIdentity = !!(userData?.email || userData?.name || userData?.nome || data?.userId);
        if (!token && !hasUserIdentity) {
          Alert.alert('Erro no login', 'Resposta da API inválida. Tente novamente.');
          return;
        }

        setUser({
          name: userData?.nome || userData?.name || userData?.username || 'Usuário',
          email: userData?.email || normalizedEmail,
          token: token || null,
          userId: resolvedUserId,
          typeUser: resolvedTypeUser,
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
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
            validateOnBlur={false}
            validateOnChange={false}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting, submitCount, setFieldValue }) => (
              <View style={styles.content}>
                <View style={styles.iconContainer}>
                  <FontAwesome name="lock" size={50} color="#7A1A1A" />
                </View>
                <Text style={styles.title}>Login</Text>
                <Text style={styles.subtitle}>Bem-vindo de volta!</Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>E-mail</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                  />
                  {submitCount > 0 && typeof errors.email === 'string' ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Senha</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Sua senha"
                      autoCorrect={false}
                      autoCapitalize="none"
                      value={isPasswordVisible ? values.password : '*'.repeat(String(values.password || '').length)}
                      onChangeText={(text) => {
                        if (isPasswordVisible) {
                          handleChange('password')(text);
                          return;
                        }
                        setFieldValue('password', applyMaskedPasswordInput(text, values.password));
                      }}
                      onBlur={handleBlur('password')}
                    />
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                      <FontAwesome name={isPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                  {submitCount > 0 && typeof errors.password === 'string' ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgotPassword}>Esqueceu a senha?</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.loginButton, isSubmitting && styles.disabledButton]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Entrar</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Não tem uma conta? <Text style={styles.registerLinkHighlight}>Crie agora</Text></Text>
                </TouchableOpacity>
              </View>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 35,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F5E4E4',
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
    color: '#111827',
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
    color: '#111827',
  },
  forgotPassword: {
    textAlign: 'right',
    color: '#7A1A1A',
    fontSize: 14,
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#7A1A1A',
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
    color: '#7A1A1A',
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
