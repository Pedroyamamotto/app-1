import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiUrl } from '../constants/api';
import { useUser } from '../context/UserContext';

const HomeScreen = () => {
  const { user, logout } = useUser();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({ novos: 0, agendados: 0, concluidas: 0 });
  const [upcomingServices, setUpcomingServices] = useState([]);
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

  const getStatusStyle = (status) => {
    const normalized = normalizeStatus(status);

    if (['agendado', 'aceito'].includes(normalized)) {
      return { label: 'Agendado', backgroundColor: '#10b981' };
    }

    if (normalized === 'em_andamento') {
      return { label: 'Em andamento', backgroundColor: '#f59e0b' };
    }

    if (['concluido', 'concluida'].includes(normalized)) {
      return { label: 'Concluído', backgroundColor: '#3b82f6' };
    }

    return { label: 'Pendente', backgroundColor: '#ef4444' };
  };

  const extractLockName = (descricao) => {
    if (!descricao) return 'Fechadura';

    const firstPart = String(descricao).split('|')[0]?.trim() || String(descricao);
    return firstPart.replace(/^\s*\d+x\s*/i, '').trim();
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
    const loadHome = async () => {
      setIsLoading(true);

      try {
        const query = tecnicoId ? `?limit=20&tecnicoId=${tecnicoId}` : '?limit=20';
        const servicesRes = await fetch(apiUrl(`/api/services${query}`));
        const servicesData = await servicesRes.json().catch(() => ({}));
        const services = normalizeServices(servicesData);

        const novos = services.filter((s) => ['pendente', 'novo'].includes(normalizeStatus(s?.status))).length;
        const agendados = services.filter((s) => ['agendado', 'aceito', 'em_andamento'].includes(normalizeStatus(s?.status))).length;
        const concluidas = services.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length;

        setSummary({ novos, agendados, concluidas });
        setUpcomingServices(services);

        const uniqueClientIds = [...new Set(services.map((s) => s?.cliente_id).filter(Boolean))];
        if (uniqueClientIds.length) {
          const clientResults = await Promise.allSettled(
            uniqueClientIds.map(async (clientId) => {
              const clientRes = await fetch(apiUrl(`/api/clientes/${clientId}`));
              const clientData = await clientRes.json().catch(() => ({}));
              return { clientId, clientData };
            })
          );

          const mappedClients = {};
          clientResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              const id = result.value.clientId;
              const payload = result.value.clientData;
              mappedClients[id] = payload?.cliente || payload?.data || payload;
            }
          });

          setClientsById(mappedClients);
        } else {
          setClientsById({});
        }
      } catch (error) {
        console.error('Erro ao carregar Home:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHome();
  }, [tecnicoId]);

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Home</Text>
          <Text style={styles.headerSubtitle}>Bem-vindo {user?.name || 'João'}</Text>
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
              <Text style={[styles.statNumber, { color: '#ff4d4f' }]}>{summary.novos}</Text>
              <Text style={styles.statLabel}>Novos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#52c41a' }]}>{summary.agendados}</Text>
              <Text style={styles.statLabel}>Agendados</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#1890ff' }]}>{summary.concluidas}</Text>
              <Text style={styles.statLabel}>Concluídas</Text>
            </View>
          </View>
        </View>

        <Text style={styles.servicesTitle}>Próximas Instalações</Text>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Carregando instalações...</Text>
          </View>
        ) : upcomingServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nenhuma instalação futura no momento.</Text>
          </View>
        ) : (
          upcomingServices.slice(0, 5).map((service, index) => {
            const serviceId = service?.id || service?._id || index;
            const numeroPedido = service?.numero_pedido || service?.pedido_id || serviceId;
            const descricao = extractLockName(service?.descricao_servico || service?.descricao || service?.description);
            const clientId = service?.cliente_id;
            const clientData = clientsById?.[clientId];
            const clientName = clientData?.cliente || clientData?.nome || clientData?.name || `Cliente ${clientId || '-'}`;
            const endereco = buildClientAddress(clientData);
            const hora = service?.hora_agendada || service?.horaInicio || service?.time || '--:--';
            const data = service?.data_agendada || service?.dataAgendada || service?.date;
            const status = service?.status || 'agendado';
            const statusStyle = getStatusStyle(status);

            return (
              <TouchableOpacity
                key={String(serviceId)}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Pedido', { id: String(serviceId) })}
              >
                <View style={styles.appointmentCard}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.topAddressRow}>
                      <FontAwesome name="file-text-o" size={16} color="#666" />
                      <Text style={styles.topAddressText}>Pedido {String(numeroPedido)}</Text>
                    </View>
                    <Text style={[styles.appointmentStatus, { backgroundColor: statusStyle.backgroundColor }]}>{statusStyle.label}</Text>
                  </View>
                  <Text style={styles.appointmentDescription}>{descricao}</Text>
                  <Text style={styles.appointmentClient}>{clientName}</Text>
                  <View style={styles.addressRow}>
                    <FontAwesome name="map-marker" size={16} color="#666" />
                    <Text style={styles.appointmentAddress}>{endereco}</Text>
                  </View>
                  <View style={styles.appointmentFooter}>
                    <View style={styles.appointmentTimeContainer}>
                      <FontAwesome name="clock-o" size={16} color="#666" />
                      <Text style={styles.appointmentTime}>{hora}</Text>
                    </View>
                    <Text style={styles.appointmentDate}>
                      {data ? `Agendado: ${new Date(data).toLocaleDateString('pt-BR')}` : 'Data não informada'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
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
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 16,
    color: '#333',
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    borderLeftColor: '#ff4d4f',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  topAddressRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingRight: 10,
  },
  topAddressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    flexShrink: 1,
  },
  appointmentStatus: {
    color: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  appointmentDescription: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  appointmentAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginLeft: 8,
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentClient: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
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
