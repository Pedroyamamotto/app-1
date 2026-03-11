import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dados de exemplo para o histórico
const historyAppointments = [
  {
    id: 4,
    description: 'Reparo em sistema de climatização',
    address: 'Rua dos Pinheiros, 789 - São Paulo',
    time: '16:00',
    date: '2026-03-02',
    status: 'Não Realizado',
  },
  {
    id: 3,
    description: 'Limpeza de filtros e dutos',
    address: 'Alameda Santos, 123 - Sala 8',
    time: '09:00',
    date: '2026-03-10',
    status: 'Concluído',
  },
];

const HistoricoScreen = () => {
  const navigation = useNavigation();

  // Calcula as estatísticas do resumo
  const summaryStats = useMemo(() => ({
    novos: historyAppointments.filter(s => s.status === 'Novo').length,
    agendados: historyAppointments.filter(s => ['Agendado', 'Aceito'].includes(s.status)).length,
    concluidos: historyAppointments.filter(s => s.status === 'Concluído').length,
  }), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Card de Resumo */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Histórico</Text>
          <View style={styles.summaryStats}>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#ff4d4f' }]}>{summaryStats.novos}</Text><Text style={styles.statLabel}>Novos</Text></View>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#52c41a' }]}>{summaryStats.agendados}</Text><Text style={styles.statLabel}>Agendados</Text></View>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#1890ff' }]}>{summaryStats.concluidos}</Text><Text style={styles.statLabel}>Concluídos</Text></View>
          </View>
        </View>

        {/* Lista de Serviços do Histórico */}
        {historyAppointments.length > 0 ? (
          historyAppointments.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => navigation.navigate('Pedido', { id: String(item.id) })}>
              <View style={styles.cardContainer}>
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <FontAwesome name="map-marker" size={16} color="#666" />
                    <Text style={styles.appointmentId}>{item.id}</Text>
                  </View>
                  <Text style={styles.appointmentDescription}>{item.description}</Text>
                  <Text style={styles.appointmentAddress}>{item.address}</Text>
                  <View style={styles.appointmentFooter}>
                    <View style={styles.appointmentTimeContainer}>
                      <FontAwesome name="clock-o" size={16} color="#666" />
                      <Text style={styles.appointmentTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.appointmentDate}>Agendado: {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
                  </View>
                </View>
                {item.status === 'Não Realizado' && (
                  <View style={styles.statusButton}>
                    <FontAwesome name="times" size={14} color="#ff4d4f" />
                    <Text style={styles.statusButtonText}>Não Realizado</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" />
            <Text style={styles.noServicesText}>Nenhum serviço no histórico.</Text>
          </View>
        )}
      </ScrollView>

      {/* Cabeçalho posicionado por cima de tudo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fixair</Text>
        <Text style={styles.headerSubtitle}>Bem-vindo João | ID: 2</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5' 
  },
  header: { 
    backgroundColor: '#008000', 
    paddingHorizontal: 15, 
    paddingBottom: 20,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50, 
    borderBottomLeftRadius: 20, 
    borderBottomRightRadius: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, 
    elevation: 5,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff' },
  contentContainer: { 
    padding: 20, 
    paddingTop: 140, // Espaço para o cabeçalho
  },
  summaryCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 20 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  cardContainer: {
    marginBottom: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff', // Adicionado para que o borderRadius funcione no container
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#008000',
  },
  appointmentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  appointmentId: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#333' },
  appointmentDescription: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  appointmentAddress: { fontSize: 14, color: '#666', marginBottom: 10 },
  appointmentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  appointmentTimeContainer: { flexDirection: 'row', alignItems: 'center' },
  appointmentTime: { marginLeft: 8, fontSize: 14, color: '#666' },
  appointmentDate: { fontSize: 14, color: '#666' },
  statusButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff1f0'
  },
  statusButtonText: {
    color: '#ff4d4f',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  noServicesContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 8 },
  noServicesText: { marginTop: 10, fontSize: 16, color: '#999' },
});

export default HistoricoScreen;
