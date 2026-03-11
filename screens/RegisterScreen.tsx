import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiUrl } from '../constants/api';

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

export default function RegisterScreen() {
  const navigation = useNavigation();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const handleRegister = async (values, { setSubmitting }) => {
    try {
      const response = await fetch(apiUrl('/api/users/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: values.name,
          email: values.email,
          telefone: values.phone,
          password: values.password,
          typeUser: 'cliente',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigation.navigate('VerifyEmail', { email: values.email, name: values.name });
      } else {
        console.error('API Error:', data);

        const errorMessage =
          (data?.error && data.error[0]) ||
          data?.message ||
          data?.detail ||
          'Não foi possível criar a conta.';

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
      <Formik
        initialValues={{ name: '', email: '', confirmEmail: '', phone: '', password: '', confirmPassword: '' }}
        validationSchema={RegisterSchema}
        onSubmit={handleRegister}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <FontAwesome name="close" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <FontAwesome name="user-plus" size={40} color="#34d399" />
            </View>
            <Text style={styles.title}>Criar conta</Text>
            <Text style={styles.subtitle}>Preencha seus dados para se cadastrar</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome completo *</Text>
              <TextInput style={styles.input} placeholder="Digite seu nome completo" value={values.name} onChangeText={handleChange('name')} onBlur={handleBlur('name')} />
              {touched.name && errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail *</Text>
              <TextInput style={styles.input} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" value={values.email} onChangeText={handleChange('email')} onBlur={handleBlur('email')} />
              {touched.email && errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar e-mail *</Text>
              <TextInput style={styles.input} placeholder="Digite novamente seu e-mail" keyboardType="email-address" autoCapitalize="none" value={values.confirmEmail} onChangeText={handleChange('confirmEmail')} onBlur={handleBlur('confirmEmail')} />
              {touched.confirmEmail && errors.confirmEmail && <Text style={styles.errorText}>{errors.confirmEmail}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Telefone *</Text>
              <TextInput style={styles.input} placeholder="(00) 00000-0000" keyboardType="phone-pad" value={values.phone} onChangeText={handleChange('phone')} onBlur={handleBlur('phone')} />
              {touched.phone && errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha *</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} placeholder="Mínimo 6 caracteres" secureTextEntry={!isPasswordVisible} value={values.password} onChangeText={handleChange('password')} onBlur={handleBlur('password')} />
                <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                  <FontAwesome name={isPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {touched.password && errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar senha *</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} placeholder="Digite novamente sua senha" secureTextEntry={!isConfirmPasswordVisible} value={values.confirmPassword} onChangeText={handleChange('confirmPassword')} onBlur={handleBlur('confirmPassword')} />
                <TouchableOpacity onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}>
                  <FontAwesome name={isConfirmPasswordVisible ? 'eye-slash' : 'eye'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {touched.confirmPassword && errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <TouchableOpacity style={[styles.actionButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 35,
        alignItems: 'center',
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
        backgroundColor: '#e6f9f1',
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
        backgroundColor: '#34d399',
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
