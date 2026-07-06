import { FontAwesome, Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AppHeader from '../components/shared/AppHeader';
import ServiceListCard from '../components/shared/ServiceListCard';
import SummaryCard from '../components/shared/SummaryCard';
import { apiFetch } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';
import { formatTimeDuration } from '../components/shared/admin/adminApi';
import { useUser } from '../context/UserContext';
import { useAppTheme } from '../context/ThemeContext';
import { cleanText } from '../utils/platformUtils';

const HomeScreen = () => {
  const { user, logout } = useUser();
  const { isDarkMode, toggleTheme, colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({ concluido: 0, naoConcluida: 0, emEspera: 0, tempoMedioMs: 0 });
  const [upcomingServices, setUpcomingServices] = useState([]);
  const [clientsById, setClientsById] = useState<Record<string, any>>({});
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const previousServiceIdsRef = useRef<Set<string>>(new Set());
  const hasRequestedNotificationsRef = useRef(false);

  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === 'storeClient';
  const Notifications = !isExpoGo && Platform.OS !== 'web'
    ? (require('expo-notifications') as typeof import('expo-notifications'))
    : null;

  const tecnicoId = user?.userId;

  // Atualiza a localização atual do técnico periodicamente enquanto o app estiver aberto
  useEffect(() => {
    if (Platform.OS === 'web' || !user?.userId) return;

    const trackLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Permissão de localização negada na home');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = loc.coords;
        const targetUserId = user.userId || user.id || user._id;
        if (targetUserId) {
          await apiFetch(`/api/users/${targetUserId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });
          console.log('[LocationTracker] Localização atualizada automaticamente:', latitude, longitude);
        }
      } catch (err) {
        console.warn('[LocationTracker] Erro ao atualizar localização automaticamente:', err);
      }
    };

    // Executa imediatamente
    trackLocation();

    // Roda a cada 60 segundos
    const intervalId = setInterval(trackLocation, 60000);
    return () => clearInterval(intervalId);
  }, [user?.userId]);

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

  const getServiceStableId = (service, index = 0) =>
    String(service?._id || service?.id || service?.pedido_id || service?.numero_pedido || index);

  const requestNotificationPermission = useCallback(async () => {
    if (!Notifications || hasRequestedNotificationsRef.current) return;
    hasRequestedNotificationsRef.current = true;

    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return;

      const requested = await Notifications.requestPermissionsAsync();
      if (!requested.granted && __DEV__) {
        console.warn('Permissao de notificacao negada.');
      }
    } catch (error) {
      if (__DEV__) {
        console.warn('Nao foi possivel solicitar permissao de notificacao', error);
      }
    }
  }, [Notifications]);

  const notifyNewAssignedService = useCallback(async (service) => {
    if (!Notifications) return;

    const numeroPedido = service?.numero_pedido || service?.pedido_id || service?._id || service?.id || 'novo servico';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Novo servico atribuido',
        body: `Pedido ${numeroPedido} foi atribuido para voce.`,
        sound: true,
      },
      trigger: null,
    });
  }, [Notifications]);

  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  const loadHome = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const query = tecnicoId ? `?limit=200&tecnicoId=${encodeURIComponent(tecnicoId)}&tecnico_id=${encodeURIComponent(tecnicoId)}` : '?limit=200';
      
      const [servicesRes, reportsRes] = await Promise.all([
        apiFetch(`/api/services${query}`),
        apiFetch('/api/relatorios')
      ]);

      const [servicesData, reportsData] = await Promise.all([
        servicesRes.json().catch(() => ({})),
        reportsRes.json().catch(() => ({}))
      ]);

      const services = normalizeServices(servicesData);
      const tecnicoServices = services.filter((service) => isAssignedToLoggedTechnician(service));
      const activeServices = tecnicoServices.filter((s) => !['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status)));
      const currentServiceIds = new Set<string>(activeServices.map((service, index) => getServiceStableId(service, index)));

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
        // Mapeamento baseado no relatório centralizado
        const concluidos = Number(myStats.concluidos || 0);
        const ativos = Number(myStats.ativos || 0);
        const total = Number(myStats.total_tecnico || 0);
        
        nextSummary = {
          concluido: concluidos,
          // Não Concluída = Total - Concluídos - Ativos (Pode incluir cancelados e não realizados)
          naoConcluida: Math.max(0, total - concluidos - ativos),
          emEspera: ativos,
          tempoMedioMs: Number(myStats.tempo_medio_ms || 0)
        };
      } else {
        // Fallback para cálculo local se não encontrar no relatório
        const concludedServices = tecnicoServices.filter((s) => ['concluido', 'concluida'].includes(normalizeStatus(s?.status)));
        const concluido = concludedServices.length;
        const naoConcluida = tecnicoServices.filter((s) => ['nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length;
        const emEspera = tecnicoServices.filter((s) => !['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(s?.status))).length;
        
        let totalTempoMs = 0;
        concludedServices.forEach(s => {
          totalTempoMs += Number(s.tempo_trabalhado_ms || s.tempoTrabalhadoMs || 0);
        });
        const tempoMedioMs = concluido > 0 ? Math.round(totalTempoMs / concluido) : 0;
        
        nextSummary = { concluido, naoConcluida, emEspera, tempoMedioMs };
      }

      if (hasLoadedOnce && previousServiceIdsRef.current.size > 0) {
        const hasNotificationPermission = Notifications
          ? (await Notifications.getPermissionsAsync()).granted
          : false;

        if (hasNotificationPermission) {
          for (const [index, service] of activeServices.entries()) {
            const id = getServiceStableId(service, index);
            if (!previousServiceIdsRef.current.has(id)) {
              await notifyNewAssignedService(service);
            }
          }
        }
      }
      previousServiceIdsRef.current = currentServiceIds;

      setSummary((prev) => (isSame(prev, nextSummary) ? prev : nextSummary));
      setUpcomingServices((prev) => (isSame(prev, activeServices) ? prev : activeServices));

      const uniqueClientIds = [...new Set(activeServices.map((s) => s?.cliente_id).filter(Boolean))];
      if (uniqueClientIds.length) {
        const clientResults = await Promise.allSettled(
          uniqueClientIds.map(async (clientId) => {
            const clientRes = await apiFetch(`/api/clientes/${clientId}`);
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
  }, [Notifications, hasLoadedOnce, tecnicoId]);

  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      if (Platform.OS === 'web' || !Notifications) return;
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Falha ao obter permissão para notificações push!');
          return;
        }

        const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;
        console.log('Expo Push Token obtido:', token);

        if (token && user?.userId) {
          await apiFetch(`/api/users/${user.userId}/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pushToken: token }),
          });
        }
      } catch (error) {
        console.warn('Erro ao obter token de notificação:', error);
      }
    };

    if (user?.userId) {
      registerForPushNotificationsAsync();
    }
  }, [user?.userId, Notifications]);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.primary }]}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.primary} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader
          title="Home"
          subtitle={`Bem-vindo ${user?.name || 'João'}`}
          rightContent={(
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
              <TouchableOpacity onPress={toggleTheme} style={{ padding: 4 }}>
                <Feather name={isDarkMode ? 'sun' : 'moon'} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <FontAwesome name="sign-out" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
        />

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <SummaryCard
          title="Visão Geral"
          items={[
            { label: 'Concluído', value: summary.concluido, color: '#10b981' },
            { label: 'Não Concluída', value: summary.naoConcluida, color: '#ff4d4f' },
            { label: 'Em Espera', value: summary.emEspera, color: '#f59e0b' },
            { label: 'T. Médio', value: formatTimeDuration(summary.tempoMedioMs), color: '#64748b' },
          ]}
        />

        <Text style={[styles.servicesTitle, { color: colors.text }]}>Próximas Instalações</Text>

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
            const descricao = cleanText(formatLockDisplayName(service?.descricao_servico || service?.descricao || service?.description));
            const clientId = service?.cliente_id;
            const clientData = clientsById?.[clientId];
            const clientName = cleanText(clientData?.cliente || clientData?.nome || clientData?.name || `Cliente ${clientId || '-'}`);
            const endereco = cleanText(buildClientAddress(clientData));
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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7A1A1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6', // Off-white minimalist background
  },
  logoutButton: {
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b', // Slate 800
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b', // Slate 500
    textAlign: 'center',
  },
});

export default HomeScreen;
