import { FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Formik } from 'formik';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Yup from 'yup';
import { apiUrl } from '../constants/api';

const VerifyCodeSchema = Yup.object().shape({
  code: Yup.string()
    .required('O código é obrigatório')
    .length(6, 'O código deve ter 6 dígitos'),
});

export default function VerifyCodeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params;
  const [isResending, setIsResending] = useState(false);

  const handleVerifyCode = (values) => {
    navigation.navigate('ResetPassword', { email, code: values.code });
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      const response = await fetch(apiUrl('/api/users/request-password-reset'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email }),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Um novo código de redefinição foi enviado para o seu e-mail.');
      } else {
        const errorData = await response.json();
        console.error('Resend Code API Error:', errorData);
        Alert.alert('Erro', errorData.detail || 'Não foi possível reenviar o código.');
      }
    } catch (error) {
      console.error('Resend Code Error:', error);
      Alert.alert('Erro de conexão', 'Não foi possível se conectar ao servidor.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Formik
        initialValues={{ code: '' }}
        validationSchema={VerifyCodeSchema}
        onSubmit={handleVerifyCode}
      >
        {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
          <View style={styles.modalView}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <FontAwesome name="close" size={24} color="black" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <FontAwesome name="envelope-o" size={50} color="#34d399" />
            </View>
            <Text style={styles.title}>Código de verificação</Text>
            <Text style={styles.subtitle}>Enviamos um código de 6 dígitos para</Text>
            <Text style={styles.emailText}>{email}</Text>
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
              {touched.code && errors.code && <Text style={styles.errorText}>{errors.code}</Text>}
            </View>
            <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
              <Text style={styles.sendButtonText}>Verificar código</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleResendCode} disabled={isResending}>
              {isResending ? <ActivityIndicator color="#34d399" /> : <Text style={styles.backLink}>Reenviar código</Text>}
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
        backgroundColor: '#34d399',
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
      textAlign: 'center'
    }
});
