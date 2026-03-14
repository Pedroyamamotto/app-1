import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';

const VerifyEmailSchema = Yup.object().shape({
  code: Yup.string()
    .required('O código é obrigatório')
    .length(6, 'O código deve ter 6 dígitos'),
});

export default function VerifyEmailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, name } = route.params || {};
  const [isResending, setIsResending] = useState(false);

  const handleVerifyCode = async (values, { setSubmitting }) => {
    try {
      const response = await apiFetch('/api/users/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: values.code,
        }),
      });

      if (response.ok) {
        navigation.replace('RegistrationSuccess', { name: name });
      } else {
        const errorData = await response.json();
        console.error("Verify Email API Error:", errorData);

        if (errorData.error === 'Usuário já verificado.') {
            Alert.alert('E-mail já verificado', 'Sua conta já foi verificada. Você pode fazer o login.');
            navigation.replace('Login');
        } else {
            Alert.alert('Erro na verificação', errorData.detail || 'Código inválido ou expirado.');
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
    setIsResending(true);
    try {
      const response = await apiFetch('/api/users/resend-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Um novo código de verificação foi enviado para o seu e-mail.');
      } else {
        const errorData = await response.json();
        console.error("Resend Code API Error:", errorData);
        Alert.alert('Erro', errorData.detail || 'Não foi possível reenviar o código.');
      }
    } catch (error) {
      console.error("Resend Code Error:", error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
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
            initialValues={{ code: '' }}
            validationSchema={VerifyEmailSchema}
            onSubmit={handleVerifyCode}
            validateOnBlur={false}
            validateOnChange={false}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting, submitCount }) => (
              <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={handleGoBack}>
              <FontAwesome name="close" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <FontAwesome name="envelope-o" size={50} color="#7A1A1A" />
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
            <TouchableOpacity style={[styles.sendButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    keyboardContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
        backgroundColor: '#F5E4E4',
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
        marginBottom: 5,
        textAlign: 'center',
    },
    emailText: {
        fontSize: 16,
        color: '#333',
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
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
        fontSize: 16,
        width: '100%',
        textAlign: 'center',
    },
    sendButton: {
        backgroundColor: '#7A1A1A',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
        minHeight: 50,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    backLink: {
        fontSize: 16,
        color: '#666',
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
