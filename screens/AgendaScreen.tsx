import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, CalendarProps, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiUrl } from '../constants/api';
import { useUser } from '../context/UserContext';

// Configuração de localização do calendário
LocaleConfig.locales['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt-br';

const AgendaScreen = () => {
  const { user } = useUser();
  const navigation = useNavigation();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]);
  const [clientsById, setClientsById] = useState({});

  const tecnicoId = user?.userId;

  const normalizeServices = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.services)) return payload.services;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const normalizeStatus = (status) => String(status || '').toLowerCase();

  const getStatusLabel = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized === 'em_andamento') return 'Em andamento';
    if (normalized === 'aceito') return 'Aceito';
    if (normalized === 'agendado') return 'Agendado';
    if (normalized === 'novo') return 'Novo';
    if (normalized === 'pendente') return 'Pendente';
    return 'Agendado';
  };

  const getDateKey = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split('T')[0];
  };

  const buildClientAddress = (cliente) => {
    if (!cliente) return 'Endereço não informado';

    const rua = cliente?.rua || cliente?.logradouro || cliente?.endereco || '';
    const numero = cliente?.numero || '';
    const bairro = cliente?.bairro || '';
    const cidade = cliente?.cidade || '';
    const estado = cliente?.estado || cliente?.uf || '';

    const line1 = [rua, numero].filter(Boolean).join(', ');
    const line2 = [bairro, cidade, estado].filter(Boolean).join(' - ');

    if (!line1 && !line2) return 'Endereço não informado';
    if (!line2) return line1;
    if (!line1) return line2;
    return `${line1} - ${line2}`;
  };

  useEffect(() => {
    const loadAgenda = async () => {
      setIsLoading(true);

      try {
        const query = tecnicoId ? `?limit=200&tecnicoId=${tecnicoId}` : '?limit=200';
        const servicesRes = await fetch(apiUrl(`/api/services${query}`));
        const servicesPayload = await servicesRes.json().catch(() => ({}));
        const services = normalizeServices(servicesPayload);

        const activeServices = services.filter((service) => {
          const status = normalizeStatus(service?.status);
          return ['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(status);
        });

        setAllAppointments(activeServices);

        const uniqueClientIds = [...new Set(activeServices.map((s) => s?.cliente_id).filter(Boolean))];

        if (uniqueClientIds.length) {
          const clientResults = await Promise.allSettled(
            uniqueClientIds.map(async (clientId) => {
              const clientRes = await fetch(apiUrl(`/api/clientes/${clientId}`));
              const clientPayload = await clientRes.json().catch(() => ({}));
              return { clientId, clientPayload };
            })
          );

          const mappedClients = {};
          clientResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              const id = result.value.clientId;
              const payload = result.value.clientPayload;
              mappedClients[id] = payload?.cliente || payload?.data || payload;
            }
          });

          setClientsById(mappedClients);
        } else {
          setClientsById({});
        }
      } catch (error) {
        console.error('Erro ao carregar agenda:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgenda();
  }, [tecnicoId]);

  const summaryStats = useMemo(() => ({
    novos: allAppointments.filter((s) => ['novo', 'pendente'].includes(normalizeStatus(s?.status))).length,
    agendados: allAppointments.filter((s) => ['agendado', 'aceito', 'em_andamento'].includes(normalizeStatus(s?.status))).length,
    concluidos: allAppointments.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length,
  }), [allAppointments]);

  const { filteredServices, markedDates } = useMemo(() => {
    const servicesForDay = allAppointments.filter((service) => getDateKey(service?.data_agendada || service?.dataAgendada || service?.date) === selectedDate);
    const marks = {};
    allAppointments.forEach((service) => {
      const dateKey = getDateKey(service?.data_agendada || service?.dataAgendada || service?.date);
      if (!dateKey) return;
      marks[dateKey] = { ...marks[dateKey], marked: true, dotColor: '#1890ff' };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#008000' };
    return { filteredServices: servicesForDay, markedDates: marks };
  }, [allAppointments, selectedDate]);

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

        {isLoading ? (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>Carregando agenda...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          filteredServices.map((item, index) => {
            const serviceId = item?.id || item?._id || index;
            const numeroPedido = item?.numero_pedido || item?.pedido_id || serviceId;
            const descricao = item?.descricao_servico || item?.descricao || item?.description || 'Serviço';
            const clientId = item?.cliente_id;
            const clientData = clientsById?.[clientId];
            const endereco = buildClientAddress(clientData);
            const hora = item?.hora_agendada || item?.horaInicio || item?.time || '--:--';
            const data = item?.data_agendada || item?.dataAgendada || item?.date;

            return (
            <TouchableOpacity key={String(serviceId)} onPress={() => navigation.navigate('Pedido', { id: String(serviceId) })}>
              <View style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentIdContainer}><FontAwesome name="map-marker" size={16} color="#666" /><Text style={styles.appointmentId}>Pedido {String(numeroPedido)}</Text></View>
                  <Text style={styles.appointmentStatus}>{getStatusLabel(item?.status)}</Text>
                </View>
                <Text style={styles.appointmentDescription}>{descricao}</Text>
                <Text style={styles.appointmentAddress}>{endereco}</Text>
                <View style={styles.appointmentFooter}>
                  <View style={styles.appointmentTimeContainer}><FontAwesome name="clock-o" size={16} color="#666" /><Text style={styles.appointmentTime}>{hora}</Text></View>
                  <Text style={styles.appointmentDate}>{data ? `Agendado: ${new Date(data).toLocaleDateString('pt-BR')}` : 'Data não informada'}</Text>
                </View>
              </View>
            </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" /><Text style={styles.noServicesText}>Nenhum serviço para esta data.</Text>
          </View>
        )}
      </ScrollView>

      {/* O cabeçalho é renderizado por último e posicionado de forma absoluta para ficar por cima */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda</Text>
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
    paddingTop: 140,
    paddingBottom: 120,
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
