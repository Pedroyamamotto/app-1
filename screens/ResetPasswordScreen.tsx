import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';

const ResetPasswordSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .required('A nova senha é obrigatória'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], 'As senhas não coincidem')
    .required('A confirmação da senha é obrigatória'),
});

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email, code } = route.params;

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

  const handleResetPassword = async (values, { setSubmitting }) => {
    try {
      const response = await apiFetch('/api/users/reset-password', {
        method: 'POST',
        allowFallback: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code,
          newPassword: values.newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Sua senha foi redefinida com sucesso! Faça o login com sua nova senha.');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } else {
        const parsed = await readErrorPayload(response);
        const errorData = parsed.data;
        const rawText = parsed.rawText;

        console.warn('Reset Password API Error:', errorData || rawText || response.status);
        Alert.alert(
          'Erro',
          errorData?.error ||
            errorData?.message ||
            errorData?.detail ||
            (rawText && !rawText.trim().startsWith('<') ? rawText : null) ||
            'Não foi possível redefinir a senha. O código pode ser inválido ou ter expirado.'
        );
      }
    } catch (error) {
      console.error('Reset Password Error:', error);
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
            initialValues={{ newPassword: '', confirmPassword: '' }}
            validationSchema={ResetPasswordSchema}
            onSubmit={handleResetPassword}
            validateOnBlur={false}
            validateOnChange={false}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting, submitCount }) => (
              <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <FontAwesome name="close" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <FontAwesome name="lock" size={50} color="#7A1A1A" />
            </View>
            <Text style={styles.title}>Nova senha</Text>
            <Text style={styles.subtitle}>Digite sua nova senha</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nova senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite sua nova senha"
                secureTextEntry
                value={values.newPassword}
                onChangeText={handleChange('newPassword')}
                onBlur={handleBlur('newPassword')}
              />
              {submitCount > 0 && typeof errors.newPassword === 'string' ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite novamente sua senha"
                secureTextEntry
                value={values.confirmPassword}
                onChangeText={handleChange('confirmPassword')}
                onBlur={handleBlur('confirmPassword')}
              />
              {submitCount > 0 && typeof errors.confirmPassword === 'string' ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>
            <TouchableOpacity style={[styles.sendButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#fff"/> : <Text style={styles.sendButtonText}>Redefinir senha</Text>}
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
    },
    sendButton: {
        backgroundColor: '#7A1A1A',
        borderRadius: 10,
        paddingVertical: 15,
        paddingHorizontal: 20,
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 18,
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
