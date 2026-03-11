import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiUrl } from '../constants/api';
import { useUser } from '../context/UserContext';

const HistoricoScreen = () => {
  const { user } = useUser();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [historyAppointments, setHistoryAppointments] = useState([]);
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
    if (['nao_realizado', 'não_realizado'].includes(normalized)) return 'Não Realizado';
    if (normalized === 'cancelado') return 'Cancelado';
    if (['concluido', 'concluida'].includes(normalized)) return 'Concluído';
    return 'Finalizado';
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
    const loadHistorico = async () => {
      setIsLoading(true);

      try {
        const query = tecnicoId ? `?limit=200&tecnicoId=${tecnicoId}` : '?limit=200';
        const servicesRes = await fetch(apiUrl(`/api/services${query}`));
        const servicesPayload = await servicesRes.json().catch(() => ({}));
        const services = normalizeServices(servicesPayload);

        const finishedServices = services.filter((service) => {
          const status = normalizeStatus(service?.status);
          return ['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(status);
        });

        setHistoryAppointments(finishedServices);

        const uniqueClientIds = [...new Set(finishedServices.map((s) => s?.cliente_id).filter(Boolean))];

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
        console.error('Erro ao carregar histórico:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistorico();
  }, [tecnicoId]);

  // Calcula as estatísticas do resumo
  const summaryStats = useMemo(() => ({
    novos: historyAppointments.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length,
    agendados: historyAppointments.filter((s) => ['nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length,
    concluidos: historyAppointments.length,
  }), [historyAppointments]);

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
        {isLoading ? (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>Carregando histórico...</Text>
          </View>
        ) : historyAppointments.length > 0 ? (
          historyAppointments.map((item, index) => {
            const serviceId = item?.id || item?._id || index;
            const numeroPedido = item?.numero_pedido || item?.pedido_id || serviceId;
            const descricao = item?.descricao_servico || item?.descricao || item?.description || 'Serviço';
            const clientId = item?.cliente_id;
            const clientData = clientsById?.[clientId];
            const endereco = buildClientAddress(clientData);
            const hora = item?.hora_agendada || item?.horaInicio || item?.time || '--:--';
            const data = item?.data_agendada || item?.dataAgendada || item?.date;
            const status = getStatusLabel(item?.status);
            const isNotCompleted = status === 'Não Realizado' || status === 'Cancelado';

            return (
            <TouchableOpacity key={String(serviceId)} onPress={() => navigation.navigate('Pedido', { id: String(serviceId) })}>
              <View style={styles.cardContainer}>
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <FontAwesome name="map-marker" size={16} color="#666" />
                    <Text style={styles.appointmentId}>Pedido {String(numeroPedido)}</Text>
                  </View>
                  <Text style={styles.appointmentDescription}>{descricao}</Text>
                  <Text style={styles.appointmentAddress}>{endereco}</Text>
                  <View style={styles.appointmentFooter}>
                    <View style={styles.appointmentTimeContainer}>
                      <FontAwesome name="clock-o" size={16} color="#666" />
                      <Text style={styles.appointmentTime}>{hora}</Text>
                    </View>
                    <Text style={styles.appointmentDate}>{data ? `Agendado: ${new Date(data).toLocaleDateString('pt-BR')}` : 'Data não informada'}</Text>
                  </View>
                </View>
                {isNotCompleted && (
                  <View style={styles.statusButton}>
                    <FontAwesome name="times" size={14} color="#ff4d4f" />
                    <Text style={styles.statusButtonText}>{status}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" />
            <Text style={styles.noServicesText}>Nenhum serviço no histórico.</Text>
          </View>
        )}
      </ScrollView>

      {/* Cabeçalho posicionado por cima de tudo */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Histórico</Text>
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
