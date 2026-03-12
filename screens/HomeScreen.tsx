import { FontAwesome } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/shared/AppHeader';
import ServiceListCard from '../components/shared/ServiceListCard';
import SummaryCard from '../components/shared/SummaryCard';
import { apiUrl } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';
import { useUser } from '../context/UserContext';

const HomeScreen = () => {
  const { user, logout } = useUser();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({ concluido: 0, naoConcluida: 0, emEspera: 0 });
  const [upcomingServices, setUpcomingServices] = useState([]);
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

    if (['nao_realizado', 'não_realizado'].includes(normalized)) {
      return { label: 'Não Concluída', backgroundColor: '#ef4444' };
    }

    if (['concluido', 'concluida'].includes(normalized)) {
      return { label: 'Concluído', backgroundColor: '#3b82f6' };
    }

    if (normalized === 'cancelado') {
      return { label: 'Não Concluída', backgroundColor: '#ef4444' };
    }

    if (['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(normalized)) {
      return { label: 'Em Espera', backgroundColor: '#7A1A1A' };
    }

    return { label: 'Em Espera', backgroundColor: '#7A1A1A' };
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

  const loadHome = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const query = tecnicoId ? `?limit=20&tecnicoId=${tecnicoId}` : '?limit=20';
      const servicesRes = await fetch(apiUrl(`/api/services${query}`));
      const servicesData = await servicesRes.json().catch(() => ({}));
      const services = normalizeServices(servicesData);
      const activeServices = services.filter((s) => !['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status)));

      const concluido = services.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length;
      const naoConcluida = services.filter((s) => ['nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length;
      const emEspera = services.filter((s) => ['novo', 'pendente', 'agendado', 'aceito', 'em_andamento'].includes(normalizeStatus(s?.status))).length;
      const nextSummary = { concluido, naoConcluida, emEspera };

      setSummary((prev) => (isSame(prev, nextSummary) ? prev : nextSummary));
      setUpcomingServices((prev) => (isSame(prev, activeServices) ? prev : activeServices));

      const uniqueClientIds = [...new Set(activeServices.map((s) => s?.cliente_id).filter(Boolean))];
      if (uniqueClientIds.length) {
        const clientResults = await Promise.allSettled(
          uniqueClientIds.map(async (clientId) => {
            const clientRes = await fetch(apiUrl(`/api/clientes/${clientId}`));
            const clientData = await clientRes.json().catch(() => ({}));
            return { clientId, clientData };
          })
        );

        const mappedClients: Record<string, any> = {};
        clientResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            const id = String(result.value.clientId);
            const payload = result.value.clientData;
            mappedClients[id] = payload?.cliente || payload?.data || payload;
          }
        });

        setClientsById((prev) => (isSame(prev, mappedClients) ? prev : mappedClients));
      } else {
        setClientsById((prev) => (Object.keys(prev).length ? {} : prev));
      }
    } catch (error) {
      console.error('Erro ao carregar Home:', error);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, tecnicoId]);

  useFocusEffect(
    useCallback(() => {
      loadHome();
      const intervalId = setInterval(() => {
        loadHome();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadHome])
  );

  const handleLogout = () => {
    logout();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <AppHeader
        title="Home"
        subtitle={`Bem-vindo ${user?.name || 'João'}`}
        rightContent={(
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <FontAwesome name="sign-out" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      />

      <ScrollView style={styles.content}>
        <SummaryCard
          title="Visão Geral"
          items={[
            { label: 'Concluído', value: summary.concluido, color: '#1890ff' },
            { label: 'Não Concluída', value: summary.naoConcluida, color: '#ff4d4f' },
            { label: 'Em Espera', value: summary.emEspera, color: '#7A1A1A' },
          ]}
        />

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
            const serviceId = service?._id || service?.id || index;
            const numeroPedido = service?.numero_pedido || service?.pedido_id || serviceId;
            const descricao = formatLockDisplayName(service?.descricao_servico || service?.descricao || service?.description);
            const clientId = service?.cliente_id;
            const clientData = clientsById?.[clientId];
            const clientName = clientData?.cliente || clientData?.nome || clientData?.name || `Cliente ${clientId || '-'}`;
            const endereco = buildClientAddress(clientData);
            const hora = service?.hora_agendada || service?.horaInicio || service?.time || '--:--';
            const data = service?.data_agendada || service?.dataAgendada || service?.date;
            const status = service?.status || 'agendado';
            const statusStyle = getStatusStyle(status);
            const dataTexto = formatScheduledDate(data) ? `Agendado: ${formatScheduledDate(data)}` : 'Data não informada';

            return (
              <ServiceListCard
                key={String(serviceId)}
                numeroPedido={numeroPedido}
                descricao={descricao}
                clientName={clientName}
                endereco={endereco}
                hora={hora}
                dataTexto={dataTexto}
                statusLabel={statusStyle.label}
                statusColor={statusStyle.backgroundColor}
                borderLeftColor="#ff4d4f"
                onPress={() => navigation.navigate('Pedido', { id: String(serviceId) })}
              />
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
  logoutButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -30,
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
});

export default HomeScreen;
