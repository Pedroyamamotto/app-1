import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../components/shared/AppHeader';
import ServiceListCard from '../components/shared/ServiceListCard';
import SummaryCard from '../components/shared/SummaryCard';
import { apiFetch } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';
import { useUser } from '../context/UserContext';

const HistoricoScreen = () => {
  const { user } = useUser();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [historyAppointments, setHistoryAppointments] = useState([]);
  const [summary, setSummary] = useState({ concluido: 0, naoConcluida: 0, emEspera: 0 });
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

  const isAssignedToLoggedTechnician = (service) => {
    const loggedId = String(tecnicoId || '').trim();
    if (!loggedId) return false;

    const candidates = [
      service?.tecnico_id,
      service?.tecnicoId,
      service?.tecnico?.id,
      service?.tecnico?._id,
      service?.tecnico_user_id,
      service?.tecnicoUserId,
      service?.usuario_tecnico_id,
      service?.usuarioTecnicoId,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    return candidates.includes(loggedId);
  };

  const getStatusStyle = (status) => {
    const normalized = normalizeStatus(status);

    if (['nao_realizado', 'não_realizado'].includes(normalized)) {
      return { label: 'Não Concluída', backgroundColor: '#ef4444' };
    }

    if (normalized === 'cancelado') {
      return { label: 'Não Concluída', backgroundColor: '#ef4444' };
    }

    if (['concluido', 'concluida'].includes(normalized)) {
      return { label: 'Concluído', backgroundColor: '#3b82f6' };
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

  const loadHistorico = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const query = tecnicoId ? `?limit=200&tecnicoId=${encodeURIComponent(tecnicoId)}&tecnico_id=${encodeURIComponent(tecnicoId)}` : '?limit=200';
      
      const [servicesRes, reportsRes] = await Promise.all([
        apiFetch(`/api/services${query}`),
        apiFetch('/api/relatorios')
      ]);

      const [servicesPayload, reportsData] = await Promise.all([
        servicesRes.json().catch(() => ({})),
        reportsRes.json().catch(() => ({}))
      ]);

      const services = normalizeServices(servicesPayload);
      const tecnicoServices = services.filter((service) => isAssignedToLoggedTechnician(service));

      // Encontrar dados do técnico logado no relatório (ID ou Nome)
      const servicosPorTecnico = Array.isArray(reportsData?.servicosConcluidosPorTecnico) ? reportsData.servicosConcluidosPorTecnico : [];
      const loggedName = String(user?.name || user?.nome || 'pedro adm').trim().toLowerCase();
      const currentId = String(tecnicoId || '').trim().toLowerCase();
      
      const myStats = servicosPorTecnico.find(t => {
        const reportId = String(t._id || t.id || '').trim().toLowerCase();
        const reportName = String(t.nome || '').trim().toLowerCase();
        
        // Se o nome no relatório contiver o nome logado ou vice-versa, consideramos match
        const nameMatch = reportName !== '' && (reportName.includes(loggedName) || loggedName.includes(reportName));
        const idMatch = reportId !== '' && reportId === currentId;
        
        return idMatch || nameMatch;
      });

      let nextSummary;
      if (myStats) {
        const concluidos = Number(myStats.concluidos || 0);
        const ativos = Number(myStats.ativos || 0);
        const total = Number(myStats.total_tecnico || 0);
        
        nextSummary = {
          concluido: concluidos,
          naoConcluida: Math.max(0, total - concluidos - ativos),
          emEspera: ativos
        };
      } else {
        // Fallback para cálculo local se não encontrar no relatório
        const concluido = tecnicoServices.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status))).length;
        const naoConcluida = tecnicoServices.filter((s) => ['nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length;
        // Considera "Em Espera" tudo que não está concluído ou cancelado/não realizado
        const emEspera = tecnicoServices.filter((s) => !['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length;
        nextSummary = { concluido, naoConcluida, emEspera };
      }

      setSummary((prev) => (isSame(prev, nextSummary) ? prev : nextSummary));

      const finishedServices = tecnicoServices.filter((service) => {
        const status = normalizeStatus(service?.status);
        return ['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(status);
      });

      setHistoryAppointments((prev) => (isSame(prev, finishedServices) ? prev : finishedServices));

      const uniqueClientIds = [...new Set(finishedServices.map((s) => s?.cliente_id).filter(Boolean))];

      if (uniqueClientIds.length) {
        const clientResults = await Promise.allSettled(
          uniqueClientIds.map(async (clientId) => {
            const clientRes = await apiFetch(`/api/clientes/${clientId}`);
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
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce, tecnicoId]);

  useFocusEffect(
    useCallback(() => {
      loadHistorico();
      const intervalId = setInterval(() => {
        loadHistorico();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadHistorico])
  );

  // summaryStats removido em favor do estado summary sincronizado

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.container}>

      <AppHeader title="Histórico" />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <SummaryCard
          title=""
          items={[
            { label: 'Concluído', value: summary.concluido, color: '#1890ff' },
            { label: 'Não Concluída', value: summary.naoConcluida, color: '#ff4d4f' },
            { label: 'Em Espera', value: summary.emEspera, color: '#7A1A1A' },
          ]}
        />

        {/* Lista de Serviços do Histórico */}
        {isLoading ? (
          <View style={styles.noServicesContainer}>
            <Text style={styles.noServicesText}>Carregando histórico...</Text>
          </View>
        ) : historyAppointments.length > 0 ? (
          historyAppointments.map((item, index) => {
            const serviceId = item?._id || item?.id || index;
            const numeroPedido = item?.numero_pedido || item?.pedido_id || serviceId;
            const descricao = formatLockDisplayName(item?.descricao_servico || item?.descricao || item?.description);
            const clientId = item?.cliente_id;
            const clientData = clientsById?.[clientId];
            const clientName = clientData?.cliente || clientData?.nome || clientData?.name || `Cliente ${clientId || '-'}`;
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
        ) : (
          <View style={styles.noServicesContainer}>
            <FontAwesome name="inbox" size={32} color="#ccc" />
            <Text style={styles.noServicesText}>Nenhum serviço no histórico.</Text>
          </View>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#7A1A1A' 
  },
  container: { 
    flex: 1, 
    backgroundColor: '#f0f2f5' 
  },
  content: { 
    flex: 1,
    marginTop: 22,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100, // Espaço para não ser cortado pelo tab bar
  },
  noServicesContainer: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 8 },
  noServicesText: { marginTop: 10, fontSize: 16, color: '#999' },
});

export default HistoricoScreen;
