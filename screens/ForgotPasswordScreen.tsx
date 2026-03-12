import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Formik } from 'formik';
import React from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiUrl } from '../constants/api';

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string().email('E-mail inválido').required('O e-mail é obrigatório'),
});

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();

  const handleSendCode = async (values, { setSubmitting }) => {
    try {
      const response = await fetch(apiUrl('/api/users/request-password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: values.email }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Um código de redefinição de senha foi enviado para o seu e-mail.');
        navigation.navigate('VerifyCode', { email: values.email });
      } else {
        const errorData = await response.json();
        console.error('Forgot Password API Error:', errorData);
        Alert.alert('Erro', errorData.detail || 'Não foi possível solicitar a redefinição de senha.');
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
        <Formik
          initialValues={{ email: '' }}
          validationSchema={ForgotPasswordSchema}
          onSubmit={handleSendCode}
        >
          {({ handleChange, handleBlur, handleSubmit, values, errors, touched, isSubmitting }) => (
            <View style={styles.modalView}>
              <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                <FontAwesome name="close" size={24} color="black" />
              </TouchableOpacity>
              <View style={styles.iconContainer}>
                <FontAwesome name="envelope-o" size={50} color="#7A1A1A" />
              </View>
              <Text style={styles.title}>Esqueceu a senha?</Text>
              <Text style={styles.subtitle}>Digite seu e-mail cadastrado para receber o código de verificação</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>E-mail cadastrado</Text>
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
              <TouchableOpacity style={[styles.sendButton, isSubmitting && styles.disabledButton]} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Enviar código</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.backLink}>Voltar para o login</Text>
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
        borderColor: '#7A1A1A',
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
    backLink: {
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
