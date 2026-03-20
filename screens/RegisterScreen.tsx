import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiFetch } from '../constants/api';

// Schema de validação com Yup
const RegisterSchema = Yup.object().shape({
  name: Yup.string().required('O nome é obrigatório'),
  email: Yup.string().email('E-mail inválido').required('O e-mail é obrigatório'),
  confirmEmail: Yup.string()
    .oneOf([Yup.ref('email'), null], 'Os e-mails devem ser iguais')
    .required('A confirmação do e-mail é obrigatória'),
  phone: Yup.string().required('O telefone é obrigatório'),
  password: Yup.string()
    .min(6, 'A senha deve ter no mínimo 6 caracteres')
    .required('A senha é obrigatória'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'As senhas devem ser iguais')
    .required('A confirmação da senha é obrigatória'),
});

const pickApiErrorMessage = (data: any, rawText: string) => {
  const candidates: unknown[] = [
    data?.message,
    data?.detail,
    data?.error,
    data?.errors,
    data?.msg,
    data?.descricao,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string' && item.trim()) return item.trim();
        if (item && typeof item === 'object') {
          const nested = (item as any)?.message || (item as any)?.detail || (item as any)?.msg;
          if (typeof nested === 'string' && nested.trim()) return nested.trim();
        }
      }
      continue;
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }

    if (candidate && typeof candidate === 'object') {
      const nested = (candidate as any)?.message || (candidate as any)?.detail || (candidate as any)?.msg;
      if (typeof nested === 'string' && nested.trim()) return nested.trim();
    }
  }

  const raw = String(rawText || '').trim();
  if (raw && !raw.startsWith('<')) return raw;

  return '';
};

const buildRegisterErrorMessage = (status: number, apiMessage: string) => {
  const normalized = String(apiMessage || '').toLowerCase();
  const duplicatedHint = /(já existe|ja existe|already exists|duplicate|duplicado|e-?mail.*(cadastrado|exist)|usu[aá]rio.*exist)/i;

  if (status === 409 || duplicatedHint.test(normalized)) {
    return [
      'Este e-mail já está cadastrado.',
      '',
      'Como resolver:',
      '- Use outro e-mail para criar uma nova conta.',
      '- Ou toque em "Já tem uma conta? Faça login".',
      '- Se esqueceu a senha, use "Esqueceu a senha?" na tela de login.',
    ].join('\n');
  }

  if (status === 400 || status === 422) {
    return [
      apiMessage || 'Os dados informados são inválidos.',
      '',
      'Verifique e tente novamente:',
      '- E-mail em formato válido (ex.: nome@dominio.com).',
      '- Confirmações de e-mail e senha iguais aos campos principais.',
      '- Senha com pelo menos 6 caracteres.',
      '- Telefone preenchido corretamente.',
    ].join('\n');
  }

  if (status === 403) {
    return [
      apiMessage || 'Cadastro não permitido no momento.',
      '',
      'Tente novamente em alguns minutos. Se persistir, contate o suporte.',
    ].join('\n');
  }

  if (status >= 500) {
    return [
      'O servidor está indisponível no momento.',
      '',
      'Tente novamente em instantes. Se continuar, contate o suporte.',
    ].join('\n');
  }

  return apiMessage || 'Não foi possível criar a conta. Verifique os dados e tente novamente.';
};

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const handleRegister = async (values, { setSubmitting }) => {
    try {
      const response = await apiFetch('/api/users', {
        method: 'POST',
        allowFallback: true,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: values.name,
          email: values.email,
          telefone: values.phone,
          password: values.password,
          typeUser: 'tecnico',
        }),
      });

      let data: any = null;
      let rawText = '';

      try {
        data = await response.json();
      } catch {
        rawText = await response.text();
      }

      if (response.ok) {
        navigation.navigate('VerifyEmail', { email: values.email, name: values.name });
      } else {
        console.warn('API Error:', data || rawText || response.status);

        const apiMessage = pickApiErrorMessage(data, rawText);
        const errorMessage = buildRegisterErrorMessage(response.status, apiMessage);

        Alert.alert('Erro no cadastro', errorMessage);
      }
    } catch (error) {
      console.error('Registration Error:', error);
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
        <Formik
          initialValues={{ name: '', email: '', confirmEmail: '', phone: '', password: '', confirmPassword: '' }}
          validationSchema={RegisterSchema}
          onSubmit={handleRegister}
          validateOnBlur={false}
          validateOnChange={false}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, isSubmitting, submitCount }) => (
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <FontAwesome name="close" size={24} color="black" />
              </TouchableOpacity>
              <View style={styles.iconContainer}>
                <FontAwesome name="user-plus" size={40} color="#7A1A1A" />
              </View>
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>Preencha seus dados para se cadastrar</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nome completo *</Text>
                <TextInput style={styles.input} placeholder="Digite seu nome completo" value={values.name} onChangeText={handleChange('name')} onBlur={handleBlur('name')} />
                {submitCount > 0 && typeof errors.name === 'string' ? <Text style={styles.errorText}>{errors.name}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>E-mail *</Text>
                <TextInput style={styles.input} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" value={values.email} onChangeText={handleChange('email')} onBlur={handleBlur('email')} />
                {submitCount > 0 && typeof errors.email === 'string' ? <Text style={styles.errorText}>{errors.email}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmar e-mail *</Text>
                <TextInput style={styles.input} placeholder="Digite novamente seu e-mail" keyboardType="email-address" autoCapitalize="none" value={values.confirmEmail} onChangeText={handleChange('confirmEmail')} onBlur={handleBlur('confirmEmail')} />
                {submitCount > 0 && typeof errors.confirmEmail === 'string' ? <Text style={styles.errorText}>{errors.confirmEmail}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Telefone *</Text>
                <TextInput style={styles.input} placeholder="(00) 00000-0000" keyboardType="phone-pad" value={values.phone} onChangeText={handleChange('phone')} onBlur={handleBlur('phone')} />
                {submitCount > 0 && typeof errors.phone === 'string' ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Senha *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput style={styles.passwordInput} placeholder="Mínimo 6 caracteres" secureTextEntry={!isPasswordVisible} value={values.password} onChangeText={handleChange('password')} onBlur={handleBlur('password')} />
                  <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    <FontAwesome name={isPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                {submitCount > 0 && typeof errors.password === 'string' ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmar senha *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput style={styles.passwordInput} placeholder="Digite novamente sua senha" secureTextEntry={!isConfirmPasswordVisible} value={values.confirmPassword} onChangeText={handleChange('confirmPassword')} onBlur={handleBlur('confirmPassword')} />
                  <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                    <FontAwesome name={isConfirmPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                {submitCount > 0 && typeof errors.confirmPassword === 'string' ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
              </View>

              <TouchableOpacity style={[styles.actionButton, isSubmitting && styles.disabledButton]} onPress={() => handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>Criar conta</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.loginLink}>Já tem uma conta? Faça login</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Formik>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
  keyboardContainer: {
    flex: 1,
  },
    scrollContent: {
    flexGrow: 1,
        padding: 35,
        alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    },
    closeButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1,
    },
    iconContainer: {
        marginBottom: 15,
        backgroundColor: '#F5E4E4',
        borderRadius: 50,
        padding: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
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
        padding: 12,
        fontSize: 16,
        width: '100%',
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 12,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
    },
    actionButton: {
        backgroundColor: '#7A1A1A',
        borderRadius: 10,
        paddingVertical: 15,
        width: '100%',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    loginLink: {
        fontSize: 16,
        color: '#666',
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
