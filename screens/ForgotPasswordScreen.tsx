import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('E-mail inválido').required('O e-mail é obrigatório'),
});

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();

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

  const handleSendCode = async (values, { setSubmitting }) => {
    const normalizedEmail = String(values.email || '').trim().toLowerCase();

    try {
      const response = await apiFetch('/api/users/request-password-reset', {
        method: 'POST',
        allowFallback: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Um código de redefinição de senha foi enviado para o seu e-mail.');
        navigation.navigate('VerifyCode', { email: normalizedEmail });
      } else {
        const parsed = await readErrorPayload(response);
        const errorData = parsed.data;
        const rawText = parsed.rawText;
        const apiMessage = errorData?.error || errorData?.message || errorData?.detail;
        const isUserNotFound = String(apiMessage || '').toLowerCase().includes('usuário não encontrado') || String(apiMessage || '').toLowerCase().includes('usuario nao encontrado');

        console.warn('Forgot Password API Error:', errorData || rawText || response.status);
        Alert.alert(
          'Erro',
          isUserNotFound
            ? 'Usuário não encontrado. Verifique o e-mail cadastrado (exato) e tente novamente.'
            : apiMessage ||
              (rawText && !rawText.trim().startsWith('<') ? rawText : null) ||
              `Falha no servidor (${response.status}).`
        );
      }
    } catch (error) {
      console.error('Forgot Password Error:', error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setSubmitting(false);
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
            initialValues={{ email: '' }}
            validationSchema={ForgotPasswordSchema}
            onSubmit={handleSendCode}
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
                <Text style={styles.title}>Esqueceu a senha?</Text>
                <Text style={styles.subtitle}>Digite seu e-mail cadastrado para receber o código de verificação</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>E-mail cadastrado</Text>
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
                <TouchableOpacity style={[styles.sendButton, isSubmitting && styles.disabledButton]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Enviar código</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={styles.backLink}>Voltar para o login</Text>
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
    marginBottom: 30,
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
    borderColor: '#7A1A1A',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#fff',
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
  },
  disabledButton: {
    backgroundColor: '#a9a9a9',
  }
});
