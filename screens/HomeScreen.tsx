import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUser } from '../context/UserContext';

const upcomingServices = [
  {
    id: 5,
    description: 'Instalação de ar condicionado',
    address: 'Rua das Flores, 123 - Apto 101',
    time: '09:00',
    date: '2026-03-20',
    status: 'Novo',
  },
];

const HomeScreen = () => {
  const router = useRouter();
  const { user, logout } = useUser();

  // Abordagem final, simples e direta para garantir o redirecionamento.
  const handleLogout = () => {
    // 1. Dê a ordem de navegação primeiro e acima de tudo.
    router.replace('/');

    // 2. Agende a limpeza dos dados para ocorrer logo depois.
    // Isso quebra a "condição de corrida" entre a navegação e a atualização do estado.
    setTimeout(() => {
      logout();
    }, 50); // Um pequeno atraso para garantir que a navegação seja iniciada.
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fixair</Text>
          <Text style={styles.headerSubtitle}>Bem-vindo {user?.name || 'Usuário'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <FontAwesome name="sign-out" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Visão Geral</Text>
          <View style={styles.summaryStats}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#ff4d4f' }]}>2</Text>
              <Text style={styles.statLabel}>Pendente</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#52c41a' }]}>3</Text>
              <Text style={styles.statLabel}>Agendadas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#1890ff' }]}>5</Text>
              <Text style={styles.statLabel}>Concluídas</Text>
            </View>
          </View>
        </View>

        <Text style={styles.servicesTitle}>Próximos Serviços</Text>

        {upcomingServices.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => router.push(`/detalhes/${item.id}`)}>
            <View style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentIdContainer}>
                  <FontAwesome name="map-marker" size={16} color="#666" />
                  <Text style={styles.appointmentId}>{item.id}</Text>
                </View>
                <Text style={styles.appointmentStatus}>{item.status}</Text>
              </View>
              <Text style={styles.appointmentDescription}>{item.description}</Text>
              <Text style={styles.appointmentAddress}>{item.address}</Text>
              <View style={styles.appointmentFooter}>
                <View style={styles.appointmentTimeContainer}>
                  <FontAwesome name="clock-o" size={16} color="#666" />
                  <Text style={styles.appointmentTime}>{item.time}</Text>
                </View>
                <Text style={styles.appointmentDate}>
                  Agendado: {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#008000',
    paddingHorizontal: 15,
    paddingVertical: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  logoutButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -30,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#ff4d4f', // Vermelho para status 'Novo'
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  appointmentIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentId: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  appointmentStatus: {
    backgroundColor: '#ff4d4f', // Vermelho para status 'Novo'
    color: '#fff',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  appointmentDescription: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  appointmentAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  appointmentTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentTime: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  appointmentDate: {
    fontSize: 14,
    color: '#666',
  },
});

export default HomeScreen;
