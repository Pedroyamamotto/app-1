import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, CalendarProps, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// Configuração de localização do calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt-br';

// Dados de exemplo
const allAppointments = [
  { id: 1, description: 'Manutenção preventiva', address: 'Av. Paulista, 1000', time: '14:00', date: '2026-03-05', status: 'Aceito' },
  { id: 2, description: 'Instalação de Split', address: 'Rua Augusta, 500', time: '10:00', date: '2026-03-05', status: 'Agendado' },
  { id: 3, description: 'Limpeza de filtros', address: 'Alameda Santos, 123', time: '09:00', date: '2026-03-10', status: 'Concluído' },
  { id: 4, description: 'Reparo de vazamento', address: 'Rua Oscar Freire, 250', time: '16:00', date: '2026-03-12', status: 'Novo' },
];

const AgendaScreen = () => {
  const navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  const summaryStats = useMemo(() => ({
    novos: allAppointments.filter(s => s.status === 'Novo').length,
    agendados: allAppointments.filter(s => ['Agendado', 'Aceito'].includes(s.status)).length,
    concluidos: allAppointments.filter(s => s.status === 'Concluído').length,
  }), []);

  const { filteredServices, markedDates } = useMemo(() => {
    const servicesForDay = allAppointments.filter(service => service.date === selectedDate);
    const marks = {};
    allAppointments.forEach(service => {
      marks[service.date] = { ...marks[service.date], marked: true, dotColor: '#1890ff' };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#008000' };
    return { filteredServices: servicesForDay, markedDates: marks };
  }, [selectedDate]);

  const handleDayPress: CalendarProps['onDayPress'] = (day) => {
    setSelectedDate(day.dateString);
  };

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        scrollIndicatorInsets={{ top: 100 }} // Ajusta o indicador de rolagem
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Minha Agenda</Text>
          <View style={styles.summaryStats}>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#ff4d4f' }]}>{summaryStats.novos}</Text><Text style={styles.statLabel}>Novos</Text></View>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#52c41a' }]}>{summaryStats.agendados}</Text><Text style={styles.statLabel}>Agendados</Text></View>
            <View style={styles.stat}><Text style={[styles.statNumber, { color: '#1890ff' }]}>{summaryStats.concluidos}</Text><Text style={styles.statLabel}>Concluídos</Text></View>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <Calendar current={selectedDate} onDayPress={handleDayPress} markedDates={markedDates} monthFormat={'MMMM yyyy'} theme={{ arrowColor: '#006400', todayTextColor: '#006400' }} />
        </View>

        <Text style={styles.servicesTitle}>Serviços para {formattedSelectedDate}</Text>

        {filteredServices.length > 0 ? (
          filteredServices.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => navigation.navigate('Pedido', { id: String(item.id) })}>
              <View style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIdContainer}><FontAwesome name="map-marker" size={16} color="#666" /><Text style={styles.appointmentId}>{item.id}</Text></View>
                  <Text style={styles.appointmentStatus}>{item.status}</Text>
                </View>
                <Text style={styles.appointmentDescription}>{item.description}</Text>
                <Text style={styles.appointmentAddress}>{item.address}</Text>
                <View style={styles.appointmentFooter}>
                  <View style={styles.appointmentTimeContainer}><FontAwesome name="clock-o" size={16} color="#666" /><Text style={styles.appointmentTime}>{item.time}</Text></View>
                  <Text style={styles.appointmentDate}>Agendado: {new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" /><Text style={styles.noServicesText}>Nenhum serviço para esta data.</Text>
          </View>
        )}
      </ScrollView>

      {/* O cabeçalho é renderizado por último e posicionado de forma absoluta para ficar por cima */}
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
    elevation: 5, // Adiciona elevação para Android, garantindo a sobreposição
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: '#fff' },
  contentContainer: { 
    padding: 20, 
    paddingTop: 140, // Espaço aumentado para garantir que o primeiro card comece abaixo do cabeçalho
  },
  summaryCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 20 },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 5 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 8, padding: 5, marginBottom: 20 },
  servicesTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, paddingHorizontal: 5 },
  appointmentCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 15, borderLeftWidth: 5, borderLeftColor: '#008000' },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  appointmentIdContainer: { flexDirection: 'row', alignItems: 'center' },
  appointmentId: { marginLeft: 8, fontSize: 14, fontWeight: 'bold', color: '#333' },
  appointmentStatus: { backgroundColor: '#52c41a', color: '#fff', borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, fontSize: 12, fontWeight: 'bold', overflow: 'hidden' },
  appointmentDescription: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  appointmentAddress: { fontSize: 14, color: '#666', marginBottom: 10 },
  appointmentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 },
  appointmentTimeContainer: { flexDirection: 'row', alignItems: 'center' },
  appointmentTime: { marginLeft: 8, fontSize: 14, color: '#666' },
  appointmentDate: { fontSize: 14, color: '#666' },
  noServicesContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 8 },
  noServicesText: { marginTop: 10, fontSize: 16, color: '#999' },
});

export default AgendaScreen;
