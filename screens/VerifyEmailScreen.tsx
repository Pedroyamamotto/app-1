import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';

const VerifyEmailSchema = Yup.object().shape({
  code: Yup.string()
    .required('O código é obrigatório')
    .length(6, 'O código deve ter 6 dígitos'),
});

export default function VerifyEmailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { email, name } = (route.params as any) || {};
  const [isResending, setIsResending] = useState(false);

  const readErrorPayload = async (response: Response) => {
    try {
      const data = await response.json();
      return { data, rawText: '' };
    } catch {
      try {
        const rawText = await response.text();
        return { data: null, rawText };
      } catch {
        return { data: null, rawText: '' };
      }
    }
  };

  const handleVerifyCode = async (values, { setSubmitting }) => {
    try {
      const response = await apiFetch('/api/users/verify', {
        method: 'POST',
        allowFallback: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: values.code,
        }),
      });

      let errorData: any = null;
      let rawText = '';

      if (!response.ok) {
        const parsed = await readErrorPayload(response);
        errorData = parsed.data;
        rawText = parsed.rawText;
      }

      if (response.ok) {
        navigation.replace('RegistrationSuccess', { name: name });
      } else {
        console.warn('Verify Email API Error:', errorData || rawText || response.status);

        if (errorData?.error === 'Usuário já verificado.') {
            Alert.alert('E-mail já verificado', 'Sua conta já foi verificada. Você pode fazer o login.');
            navigation.replace('Login');
        } else {
            Alert.alert(
              'Erro na verificação',
              errorData?.error ||
                errorData?.message ||
                errorData?.detail ||
                (rawText && !rawText.trim().startsWith('<') ? rawText : null) ||
                `Falha no servidor (${response.status}).`
            );
        }
      }
    } catch (error) {
      console.error("Verify Email Error:", error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Erro', 'E-mail não informado para reenviar o código.');
      return;
    }

    setIsResending(true);
    try {
      const response = await apiFetch('/api/users/resend-verification-code', {
        method: 'POST',
        allowFallback: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Um novo código de verificação foi enviado para o seu e-mail.');
      } else {
        const parsed = await readErrorPayload(response);
        const errorData = parsed.data;
        const rawText = parsed.rawText;

        console.warn('Resend Code API Error:', errorData || rawText || response.status);
        Alert.alert(
          'Erro',
          errorData?.error ||
            errorData?.message ||
            errorData?.detail ||
            (rawText && !rawText.trim().startsWith('<') ? rawText : null) ||
            `Falha no servidor (${response.status}).`
        );
      }
    } catch (error) {
      console.error("Resend Code Error:", error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f2f5" />
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Formik
            initialValues={{ code: '' }}
            validationSchema={VerifyEmailSchema}
            onSubmit={handleVerifyCode}
            validateOnBlur={false}
            validateOnChange={false}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting, submitCount }) => (
              <View style={styles.content}>
                <View style={styles.logoWrapper}>
                  <Image
                    source={require('../assets/images/serviyama-logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.title}>Verifique seu e-mail</Text>
                <Text style={styles.subtitle}>Enviamos um código de 6 dígitos para</Text>
                <Text style={styles.emailText}>{email || 'seu-email@exemplo.com'}</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Código de verificação</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={values.code}
                    onChangeText={handleChange('code')}
                    onBlur={handleBlur('code')}
                  />
                  {submitCount > 0 && typeof errors.code === 'string' ? <Text style={styles.errorText}>{errors.code}</Text> : null}
                </View>
                <TouchableOpacity style={[styles.sendButton, isSubmitting && styles.disabledButton]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Verificar código</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
                  {isResending ? <ActivityIndicator color="#7A1A1A" /> : <Text style={styles.backLink}>Reenviar código</Text>}
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
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    alignSelf: 'center',
  },
  logo: {
    width: 180,
    height: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
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
    fontSize: 24,
    backgroundColor: '#fff',
    textAlign: 'center',
    letterSpacing: 10,
  },
  sendButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backLink: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 12,
    color: 'red',
    marginTop: 5,
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  },
});
