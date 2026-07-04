import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminHeaders, fetchAdminTecnicosFromApi, formatScheduledDate } from '../../components/shared/admin/adminApi';
import { apiFetch } from '../../constants/api';
import { formatLockDisplayName } from '../../constants/serviceDisplay';
import { useUser } from '../../context/UserContext';
import { cleanText } from '../../utils/platformUtils';
import { statusBadgeColorByCode, statusLabelByCode } from '../adm/components/constants';
import { formatOrdemServicoLabel, formatPedidoLabel } from '../adm/components/utils';

export default function GerServiceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useUser();
  const { id } = (route.params || {}) as { id?: string };
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [service, setService] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [tecnico, setTecnico] = useState<any>(null);

  const [isReassignModalVisible, setIsReassignModalVisible] = useState(false);
  const [teamTecnicos, setTeamTecnicos] = useState<any[]>([]);

  const serviceId = String(id || '');

  const loadServiceDetail = async () => {
    if (!serviceId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const serviceRes = await apiFetch(`/api/services/${serviceId}`);
      const serviceData = await serviceRes.json().catch(() => ({}));
      const servicePayload = serviceData?.service || serviceData?.data || serviceData;

      if (!servicePayload || (typeof servicePayload === 'object' && Object.keys(servicePayload).length === 0)) {
        setService(null);
        setClient(null);
        return;
      }

      setService(servicePayload);

      const clientId = servicePayload?.cliente_id;
      if (clientId) {
        const clientRes = await apiFetch(`/api/clientes/${clientId}`);
        const clientData = await clientRes.json().catch(() => ({}));
        setClient(clientData?.cliente || clientData?.data || clientData);
      } else {
        setClient(null);
      }

      const tecnicoId = servicePayload?.tecnico_id;
      if (tecnicoId) {
        const tecRes = await apiFetch(`/api/admin/users/${tecnicoId}`, { headers: adminHeaders() });
        const tecData = await tecRes.json().catch(() => null);
        if (tecData && tecData.user) {
          setTecnico(tecData.user);
        } else {
          setTecnico({ nome: servicePayload.tecnico && servicePayload.tecnico !== 'Nao atribuido' ? servicePayload.tecnico : 'N/A' });
        }
      } else {
        setTecnico({ nome: servicePayload.tecnico && servicePayload.tecnico !== 'Nao atribuido' ? servicePayload.tecnico : 'Sem técnico' });
      }

    } catch (error) {
      console.error('Erro ao carregar detalhes do serviço:', error);
      setService(null);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadServiceDetail();
  }, [serviceId]);

  const updateServiceStatus = async (newStatus: string) => {
    if (!serviceId) return;
    setIsUpdating(true);
    try {
      const res = await apiFetch(`/api/servicos/editar-completo/${serviceId}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar o serviço');
      await loadServiceDetail();
      Alert.alert('Sucesso', 'Status atualizado com sucesso.');
    } catch (e) {
      console.warn('Erro ao atualizar status', e);
      Alert.alert('Erro', 'Não foi possível atualizar o serviço.');
    } finally {
      setIsUpdating(false);
    }
  };

  const openReassignModal = async () => {
    setIsReassignModalVisible(true);
    if (teamTecnicos.length === 0) {
      try {
        const userId = user?.userId || user?._id || user?.id;
        const allTecnicos = await fetchAdminTecnicosFromApi();
        const myTeam = allTecnicos.filter(t => t.gerenteId === userId);
        setTeamTecnicos(myTeam);
      } catch (e) {
        console.warn('Erro ao carregar tecnicos', e);
      }
    }
  };

  const handleReassign = async (tecnicoId: string, tecnicoNome: string) => {
    if (!serviceId) return;
    setIsReassignModalVisible(false);
    setIsUpdating(true);
    try {
      const res = await apiFetch(`/api/servicos/editar-completo/${serviceId}`, {
        method: 'PUT',
        headers: adminHeaders(),
        body: JSON.stringify({ tecnico_id: tecnicoId, tecnico: tecnicoNome, status: 'atribuido' }),
      });
      if (!res.ok) throw new Error('Falha ao reatribuir o serviço');
      await loadServiceDetail();
      Alert.alert('Sucesso', 'Serviço reatribuído com sucesso.');
    } catch (e) {
      console.warn('Erro ao reatribuir', e);
      Alert.alert('Erro', 'Não foi possível reatribuir o serviço.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAssumir = () => {
    Alert.alert('Confirmar', 'Deseja assumir este serviço?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Assumir', onPress: async () => {
        const userId = user?._id || user?.id || user?.userId;
        if (!serviceId || !userId) return;
        setIsUpdating(true);
        try {
          const res = await apiFetch(`/api/servicos/editar-completo/${serviceId}`, {
            method: 'PUT',
            headers: adminHeaders(),
            body: JSON.stringify({ tecnico_id: userId, tecnico: user?.name || user?.nome || 'Técnico', status: 'atribuido' }),
          });
          if (!res.ok) throw new Error('Falha ao assumir o serviço');
          await loadServiceDetail();
          Alert.alert('Sucesso', 'Serviço atribuído a você.');
        } catch (e) {
          console.warn('Erro ao assumir', e);
          Alert.alert('Erro', 'Não foi possível assumir o serviço.');
        } finally {
          setIsUpdating(false);
        }
      }},
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalhes do Serviço</Text>
          </View>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#7A1A1A" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Detalhes do Serviço</Text>
          </View>
          <View style={styles.centerContainer}>
            <Text>Serviço não encontrado.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const descricao = cleanText(formatLockDisplayName(service?.descricao_servico || service?.descricao || 'Serviço não informado'));
  const numeroPedido = cleanText(formatPedidoLabel(service?.numeroPedido || service?.numero_pedido || service?.id || service?._id));
  const dataRaw = service?.data_agendada || service?.dataAgendada || service?.data || service?.data_agendamento || 'Sem data';
  const data = dataRaw !== 'Sem data' ? formatScheduledDate(dataRaw) : 'Sem data';
  const hora = service?.hora_agendada || service?.horaAgendada || service?.hora || service?.hora_agendamento || 'Sem hora';
  const statusColor = (statusBadgeColorByCode as any)[service?.status] || '#cbd5e1';
  const statusLabel = (statusLabelByCode as any)[service?.status] || 'Desconhecido';

  const cleanRua = cleanText(client?.rua || 'Endereço não informado');
  const cleanNumero = cleanText(client?.numero || 'S/N');
  const cleanCidade = cleanText(client?.cidade || 'SP');
  const cleanAddress = `${cleanRua}, ${cleanNumero} - ${cleanCidade}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Detalhes do Serviço</Text>
          <Text style={styles.headerSubtitle}>Informações e ações do serviço</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Card Principal */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.osTitleContainer}>
              <View style={styles.iconCircle}>
                <Feather name="clock" size={20} color="#f97316" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.osNumber}>{numeroPedido}</Text>
                <Text style={styles.osDesc} numberOfLines={1}>{descricao}</Text>
                <Text style={styles.osAddress} numberOfLines={1}>{cleanAddress}</Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          
          <View style={styles.cardDivider} />
          
          <View style={styles.cardFooter}>
            <View style={styles.footerInfoBox}>
              <Feather name="user" size={20} color="#64748b" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.footerInfoLabel}>Técnico responsável</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                  <Text style={[styles.footerInfoValue, { flexShrink: 1, marginTop: 0 }]} numberOfLines={1}>
                    {cleanText(tecnico?.nome || 'N/A')}
                  </Text>
                  <View style={styles.onlineBadge}>
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.footerInfoBox}>
              <Feather name="calendar" size={20} color="#64748b" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.footerInfoLabel}>Agendado para</Text>
                <Text style={[styles.footerInfoValue, { marginTop: 2 }]} numberOfLines={2}>{data} • {hora}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Informações Adicionais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações adicionais</Text>
          <Text style={styles.subLabel}>Cliente</Text>
          <View style={styles.clientRow}>
            <Text style={[styles.clientName, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
              {cleanText(client?.cliente || client?.nome || 'Não informado')}
            </Text>
            <View style={styles.phoneRow}>
              <Feather name="phone" size={14} color="#64748b" />
              <Text style={styles.clientPhone}>{client?.telefone || client?.celular || 'N/A'}</Text>
            </View>
          </View>

          <Text style={[styles.subLabel, { marginTop: 16 }]}>Descrição do serviço</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>{cleanText(service?.descricao_servico || service?.descricao || 'Sem descrição')}</Text>
            <Feather name="chevron-down" size={20} color="#64748b" />
          </View>
        </View>

        {/* Ações do serviço */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações do serviço</Text>

          {/* Reatribuir */}
          <TouchableOpacity style={styles.actionItemPrimary} onPress={openReassignModal} disabled={isUpdating}>
            <MaterialCommunityIcons name="account-switch-outline" size={24} color="#2563eb" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitlePrimary}>Reatribuir serviço</Text>
              <Text style={styles.actionSubtitle}>Atribuir este serviço para outro técnico</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>

          {/* Assumir */}
          <TouchableOpacity style={[styles.actionItem, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]} onPress={handleAssumir} disabled={isUpdating}>
            <MaterialCommunityIcons name="account-check-outline" size={24} color="#16a34a" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.actionTitle, { color: '#16a34a' }]}>Técnico, assumir o serviço</Text>
              <Text style={styles.actionSubtitle}>Assumir este serviço para realizar o atendimento</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#16a34a" />
          </TouchableOpacity>


          {/* Ver histórico */}
          <TouchableOpacity style={[styles.actionItem, { marginBottom: 0 }]} onPress={() => navigation.navigate('GerServiceHistory', { id: serviceId })}>
            <Feather name="info" size={24} color="#475569" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.actionTitle}>Ver histórico</Text>
              <Text style={styles.actionSubtitle}>Visualizar histórico de alterações e eventos</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Reatribuir */}
      <Modal visible={isReassignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Escolha um Técnico</Text>
              <TouchableOpacity onPress={() => setIsReassignModalVisible(false)}>
                <Feather name="x" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            {teamTecnicos.length === 0 ? (
              <Text style={styles.modalEmptyText}>Nenhum técnico encontrado na sua equipe.</Text>
            ) : (
              <FlatList
                data={teamTecnicos}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalTecItem}
                    onPress={() => handleReassign(item.id, item.nome)}
                  >
                    <View style={styles.modalTecAvatar}>
                      <Text style={styles.modalTecAvatarLetter}>{item.nome.charAt(0)}</Text>
                    </View>
                    <Text style={styles.modalTecName}>{item.nome}</Text>
                    <Feather name="chevron-right" size={20} color="#cbd5e1" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7A1A1A' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter-Bold' },
  headerSubtitle: { color: '#fca5a5', fontSize: 14, fontFamily: 'Inter-Medium' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 100, backgroundColor: '#f8fafc' },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  osTitleContainer: { flexDirection: 'row', flex: 1 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    alignItems: 'center', justifyContent: 'center'
  },
  osNumber: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b' },
  osDesc: { fontSize: 14, color: '#64748b', marginTop: 4 },
  osAddress: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 12 },
  statusText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  
  cardDivider: { height: 1, backgroundColor: '#e2e8f0' },
  
  cardFooter: { flexDirection: 'row', padding: 16 },
  footerInfoBox: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  footerInfoLabel: { fontSize: 12, color: '#94a3b8', fontFamily: 'Inter-Medium' },
  footerInfoValue: { fontSize: 14, color: '#1e293b', fontFamily: 'Inter-SemiBold', marginTop: 2 },
  verticalDivider: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 16 },
  
  onlineBadge: {
    backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginLeft: 8,
  },
  onlineText: { color: '#16a34a', fontSize: 10, fontFamily: 'Inter-Bold' },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#1e293b', marginBottom: 16 },
  subLabel: { fontSize: 13, color: '#64748b', marginBottom: 4 },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1e293b' },
  phoneRow: { flexDirection: 'row', alignItems: 'center' },
  clientPhone: { fontSize: 14, color: '#64748b', marginLeft: 6 },
  
  descBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f1f5f9', padding: 12, borderRadius: 8,
  },
  descText: { fontSize: 14, color: '#334155', flex: 1, marginRight: 12 },
  
  actionItemPrimary: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff',
    borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  actionTitlePrimary: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#1e3a8a' },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  actionTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#334155' },
  actionSubtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b' },
  modalEmptyText: { padding: 20, textAlign: 'center', color: '#64748b' },
  modalTecItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTecAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fce7f3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  modalTecAvatarLetter: { color: '#be185d', fontFamily: 'Inter-Bold', fontSize: 16 },
  modalTecName: { flex: 1, fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1e293b' },
});
