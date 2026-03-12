import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Calendar, CalendarProps, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/shared/AppHeader';
import ServiceListCard from '../components/shared/ServiceListCard';
import SummaryCard from '../components/shared/SummaryCard';
import { apiUrl } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';
import { useUser } from '../context/UserContext';

// Configuração de localização do calendário
(LocaleConfig.locales as any)['pt-br'] = {
  monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: "Hoje"
};
LocaleConfig.defaultLocale = 'pt-br';

const AgendaScreen = () => {
  const { user } = useUser();
  const navigation = useNavigation<any>();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [allAppointments, setAllAppointments] = useState([]);
  const [clientsById, setClientsById] = useState<Record<string, any>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const tecnicoId = user?.userId;

  const normalizeServices = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.services)) return payload.services;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const normalizeStatus = (status) => String(status || '').toLowerCase();

  const getStatusStyle = (status) => {
    const normalized = normalizeStatus(status);

    if (['nao_realizado', 'não_realizado', 'cancelado'].includes(normalized)) {
      return { label: 'Não Concluída', backgroundColor: '#ef4444' };
    }

    if (['concluido', 'concluida'].includes(normalized)) {
      return { label: 'Concluído', backgroundColor: '#3b82f6' };
    }

    return { label: 'Em Espera', backgroundColor: '#7A1A1A' };
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

  const formatScheduledDate = (value) => {
    if (!value) return null;
    const raw = String(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const isSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const loadAgenda = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const query = tecnicoId ? `?limit=200&tecnicoId=${tecnicoId}` : '?limit=200';
      const servicesRes = await fetch(apiUrl(`/api/services${query}`));
      const servicesPayload = await servicesRes.json().catch(() => ({}));
      const services = normalizeServices(servicesPayload);

      const activeServices = services.filter((service) => {
        const status = normalizeStatus(service?.status);
        return ['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(status);
      });

      // Mantem todos os servicos para o resumo ficar consistente com Home/Historico.
      setAllAppointments((prev) => (isSame(prev, services) ? prev : services));

      const uniqueClientIds = [...new Set(activeServices.map((s) => s?.cliente_id).filter(Boolean))];

      if (uniqueClientIds.length) {
        const clientResults = await Promise.allSettled(
          uniqueClientIds.map(async (clientId) => {
            const clientRes = await fetch(apiUrl(`/api/clientes/${clientId}`));
            const clientPayload = await clientRes.json().catch(() => ({}));
            return { clientId, clientPayload };
          })
        );

        const mappedClients: Record<string, any> = {};
        clientResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const id = String(result.value.clientId);
            const payload = result.value.clientPayload;
            mappedClients[id] = payload?.cliente || payload?.data || payload;
          }
        });

        setClientsById((prev) => (isSame(prev, mappedClients) ? prev : mappedClients));
      } else {
        setClientsById((prev) => (Object.keys(prev).length ? {} : prev));
      }
    } catch (error) {
      console.error('Erro ao carregar agenda:', error);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, tecnicoId]);

  useFocusEffect(
    useCallback(() => {
      loadAgenda();
      const intervalId = setInterval(() => {
        loadAgenda();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadAgenda])
  );

  const summaryStats = useMemo(() => ({
    concluido: allAppointments.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length,
    naoConcluida: allAppointments.filter((s) => ['nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length,
    emEspera: allAppointments.filter((s) => ['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(normalizeStatus(s?.status))).length,
  }), [allAppointments]);

  const { filteredServices, markedDates } = useMemo(() => {
    const openAppointments = allAppointments.filter((service) => ['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(normalizeStatus(service?.status)));
    const servicesForDay = openAppointments.filter((service) => getDateKey(service?.data_agendada || service?.dataAgendada || service?.date) === selectedDate);
    const marks = {};
    openAppointments.forEach((service) => {
      const dateKey = getDateKey(service?.data_agendada || service?.dataAgendada || service?.date);
      if (!dateKey) return;
      marks[dateKey] = { ...marks[dateKey], marked: true, dotColor: '#1890ff' };
    });
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#7A1A1A' };
    return { filteredServices: servicesForDay, markedDates: marks };
  }, [allAppointments, selectedDate]);

  const handleDayPress: CalendarProps['onDayPress'] = (day) => {
    setSelectedDate(day.dateString);
  };

  const formattedSelectedDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AppHeader title="Agenda" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SummaryCard
          title="Visão Geral"
          items={[
            { label: 'Concluído', value: summaryStats.concluido, color: '#1890ff' },
            { label: 'Não Concluída', value: summaryStats.naoConcluida, color: '#ff4d4f' },
            { label: 'Em Espera', value: summaryStats.emEspera, color: '#7A1A1A' },
          ]}
        />

        <View style={styles.calendarCard}>
          <Calendar current={selectedDate} onDayPress={handleDayPress} markedDates={markedDates} monthFormat={'MMMM yyyy'} theme={{ arrowColor: '#7A1A1A', todayTextColor: '#7A1A1A' }} />
        </View>

        <Text style={styles.servicesTitle}>Serviços para {formattedSelectedDate}</Text>

        {isLoading ? (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>Carregando agenda...</Text>
          </View>
        ) : filteredServices.length > 0 ? (
          filteredServices.map((item, index) => {
            const serviceId = item?._id || item?.id || index;
            const numeroPedido = item?.numero_pedido || item?.pedido_id || serviceId;
            const descricao = formatLockDisplayName(item?.descricao_servico || item?.descricao || item?.description || 'Serviço');
            const clientId = item?.cliente_id;
            const clientData = clientsById?.[clientId];
            const endereco = buildClientAddress(clientData);
            const hora = item?.hora_agendada || item?.horaInicio || item?.time || '--:--';
            const data = item?.data_agendada || item?.dataAgendada || item?.date;
            const statusStyle = getStatusStyle(item?.status);
            const dataTexto = formatScheduledDate(data) ? `Agendado: ${formatScheduledDate(data)}` : 'Data não informada';

            return (
              <ServiceListCard
                key={String(serviceId)}
                numeroPedido={numeroPedido}
                descricao={descricao}
                endereco={endereco}
                hora={hora}
                dataTexto={dataTexto}
                statusLabel={statusStyle.label}
                statusColor={statusStyle.backgroundColor}
                borderLeftColor="#7A1A1A"
                headerIconName="map-marker"
                onPress={() => navigation.navigate('Pedido', { id: String(serviceId) })}
              />
            );
          })
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" /><Text style={styles.noServicesText}>Nenhum serviço para esta data.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5' 
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 160,
  },
  calendarCard: { backgroundColor: '#fff', borderRadius: 8, padding: 5, marginBottom: 20 },
  servicesTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  noServicesContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 8 },
  noServicesText: { marginTop: 10, fontSize: 16, color: '#999' },
});

export default AgendaScreen;
