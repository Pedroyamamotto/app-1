import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildTechniciansFromServices, fetchAdminDashboardFromApi, fetchAdminGerentesFromApi, fetchAdminServicesAllFromApi, fetchAdminTecnicosFromApi, formatTimeDuration, updateAdminUser, type AdminGerenteUser, type AdminTechnicianData } from '../../components/shared/admin/adminApi';
import AdminHeader from '../../components/shared/admin/AdminHeader';
import AdminOverviewCard from '../../components/shared/admin/AdminOverviewCard';
import { formatLockDisplayName } from '../../constants/serviceDisplay';
import { statusBadgeColorByCode, statusLabelByCode } from './components/constants';
import { formatOrdemServicoLabel, formatPedidoLabel } from './components/utils';

type Tecnico = AdminTechnicianData;

export default function AdmTecnicosScreen() {
  const navigation = useNavigation();
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [gerentes, setGerentes] = useState<AdminGerenteUser[]>([]);
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'gerentes'>('tecnicos');
  const [overview, setOverview] = useState({ aguardando: 0, atribuidos: 0, concluidos: 0, total: 0 });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedGerente, setSelectedGerente] = useState<AdminGerenteUser | null>(null);

  const loadTecnicos = useCallback(async () => {
    try {
      const [services, tecnicoUsers, dashData, gerentesData] = await Promise.all([
        fetchAdminServicesAllFromApi(),
        fetchAdminTecnicosFromApi(),
        fetchAdminDashboardFromApi(),
        fetchAdminGerentesFromApi().catch(() => [] as AdminGerenteUser[]),
      ]);

      const fromServices = buildTechniciansFromServices(services);
      const normalizeName = (value: string) => String(value || '').trim().toLowerCase();
      const serviceStatsByName = new Map(fromServices.map((item) => [normalizeName(item.nome), item]));

      // Filtra apenas técnicos realmente cadastrados (presentes em tecnicoUsers)
      const merged = tecnicoUsers.map((tecnico) => {
        const stats = serviceStatsByName.get(normalizeName(tecnico.nome));
        return {
          id: tecnico.id,
          nome: tecnico.nome,
          email: tecnico.email,
          telefone: tecnico.telefone,
          cpf: stats?.cpf || 'Nao informado',
          area: stats?.area || 'Equipe Tecnica',
          cidadeBase: stats?.cidadeBase,
          especialidade: stats?.especialidade,
          disponibilidade: stats?.disponibilidade || 'Disponivel para atendimento',
          avaliacao: stats?.avaliacao,
          total: stats?.total || 0,
          ativos: stats?.ativos || 0,
          concluidos: stats?.concluidos || 0,
          endereco: stats?.endereco,
          observacoes: stats?.observacoes || 'Cadastro retornado pela API administrativa.',
          atendimentos: stats?.atendimentos || [],
        } satisfies Tecnico;
      });

      // Não inclui técnicos "sem cadastro" (apenas presentes nos serviços, mas não no banco)
      setTecnicos(merged);

      // Cruza stats de serviços com gerentes (gerentes também podem ser atribuídos a serviços)
      const mergedGerentes = gerentesData.map((ger) => {
        const stats = serviceStatsByName.get(normalizeName(ger.nome));
        return {
          ...ger,
          total: stats?.total ?? 0,
          ativos: stats?.ativos ?? 0,
          concluidos: stats?.concluidos ?? 0,
          tempoMedioMs: stats?.tempoMedioMs ?? 0,
          atendimentos: stats?.atendimentos ?? [],
        };
      });
      setGerentes(mergedGerentes);
      setLoadError(null);
      setOverview({
        aguardando: dashData.resumo.aguardando,
        atribuidos: dashData.resumo.atribuidos,
        concluidos: dashData.resumo.concluidos,
        total: dashData.resumo.total,
      });
    } catch (error) {
      console.warn('Erro ao carregar tecnicos admin:', error);
      setLoadError(error instanceof Error ? error.message : 'Nao foi possivel carregar os tecnicos da API admin.');
      setTecnicos([]);
      setOverview({ aguardando: 0, atribuidos: 0, concluidos: 0, total: 0 });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTecnicos();
      const intervalId = setInterval(() => {
        loadTecnicos();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadTecnicos])
  );

  const handlePromoteToGerente = async (tecnico: Tecnico) => {
    Alert.alert(
      'Tornar Gerente',
      `Deseja promover o técnico ${tecnico.nome} para gerente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promover',
          onPress: async () => {
            try {
              await updateAdminUser(tecnico.id, { typeUser: 'gerente' });
              Alert.alert('Sucesso', `${tecnico.nome} agora é um gerente!`);
              setSelectedTecnico(null);
              loadTecnicos();
            } catch (error) {
              console.warn('Erro ao promover técnico:', error);
              Alert.alert('Erro', 'Não foi possível promover o técnico.');
            }
          },
        },
      ]
    );
  };

  const totalAguardando = overview.aguardando;
  const totalAtribuidos = overview.atribuidos;
  const totalConcluidos = overview.concluidos;
  const totalGeral = overview.total;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.container}>
        <AdminHeader />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <AdminOverviewCard
          title="Equipe Tecnica"
          stats={[
            { label: 'Aguardando', value: totalAguardando, tone: 'pending' },
            { label: 'Atribuidos', value: totalAtribuidos, tone: 'assigned' },
            { label: 'Concluidos', value: totalConcluidos, tone: 'finished' },
            { label: 'Total', value: totalGeral, tone: 'total' },
          ]}
        />

        {/* Tab Selector */}
        <View style={styles.tabSelector}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'tecnicos' && styles.tabBtnActive]}
            onPress={() => setActiveTab('tecnicos')}
          >
            <Feather name="tool" size={15} color={activeTab === 'tecnicos' ? '#fff' : '#7A1A1A'} />
            <Text style={[styles.tabBtnText, activeTab === 'tecnicos' && styles.tabBtnTextActive]}>
              Técnicos ({tecnicos.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'gerentes' && styles.tabBtnActive]}
            onPress={() => setActiveTab('gerentes')}
          >
            <Feather name="briefcase" size={15} color={activeTab === 'gerentes' ? '#fff' : '#7A1A1A'} />
            <Text style={[styles.tabBtnText, activeTab === 'gerentes' && styles.tabBtnTextActive]}>
              Gerentes ({gerentes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cards dos tecnicos */}
        {activeTab === 'tecnicos' && (
          <>
            {tecnicos.map((tec) => (
              <TouchableOpacity key={tec.id} style={styles.tecCard} activeOpacity={0.9} onPress={() => setSelectedTecnico(tec)}>
                <View style={styles.tecHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{tec.nome.charAt(0)}</Text>
                  </View>
                  <View style={styles.tecInfo}>
                    <Text style={styles.tecNome}>{tec.nome}</Text>
                    <Text style={styles.tecEmail}>{tec.email}</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Técnico</Text>
                  </View>
                </View>

                <View style={styles.tecStats}>
                  <View style={styles.tecStatItem}>
                    <Text style={styles.tecStatNumber}>{tec.total}</Text>
                    <Text style={styles.tecStatLabel}>Total</Text>
                  </View>
                  <View style={[styles.tecStatItem, styles.tecStatItemGreen]}>
                    <Text style={[styles.tecStatNumber, { color: '#15803d' }]}>{tec.ativos}</Text>
                    <Text style={styles.tecStatLabel}>Ativos</Text>
                  </View>
                  <View style={[styles.tecStatItem, styles.tecStatItemBlue]}>
                    <Text style={[styles.tecStatNumber, { color: '#1d4ed8' }]}>{tec.concluidos}</Text>
                    <Text style={styles.tecStatLabel}>Concluidos</Text>
                  </View>
                  <View style={[styles.tecStatItem, { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.tecStatNumber, { color: '#475569' }]}>{formatTimeDuration(tec.tempoMedioMs)}</Text>
                    <Text style={styles.tecStatLabel}>T. Médio</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {tecnicos.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhum técnico encontrado</Text>
                <Text style={styles.emptySubtitle}>
                  {loadError || 'A API ainda não retornou serviços com técnico atribuído.'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* Cards dos gerentes */}
        {activeTab === 'gerentes' && (
          <>
            {gerentes.map((ger) => (
              <TouchableOpacity key={ger.id} style={[styles.tecCard, { borderLeftColor: '#5b21b6' }]} activeOpacity={0.9} onPress={() => setSelectedGerente(ger)}>
                <View style={styles.tecHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{ger.nome.charAt(0)}</Text>
                  </View>
                  <View style={styles.tecInfo}>
                    <Text style={styles.tecNome}>{ger.nome}</Text>
                    <Text style={styles.tecEmail}>{ger.email}</Text>
                    {ger.telefone ? <Text style={styles.tecEmail}>{ger.telefone}</Text> : null}
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' }]}>
                    <Text style={[styles.roleBadgeText, { color: '#5b21b6' }]}>Gerente</Text>
                  </View>
                </View>

                <View style={styles.tecStats}>
                  <View style={styles.tecStatItem}>
                    <Text style={styles.tecStatNumber}>{ger.total ?? 0}</Text>
                    <Text style={styles.tecStatLabel}>Total</Text>
                  </View>
                  <View style={[styles.tecStatItem, styles.tecStatItemGreen]}>
                    <Text style={[styles.tecStatNumber, { color: '#15803d' }]}>{ger.ativos ?? 0}</Text>
                    <Text style={styles.tecStatLabel}>Ativos</Text>
                  </View>
                  <View style={[styles.tecStatItem, styles.tecStatItemBlue]}>
                    <Text style={[styles.tecStatNumber, { color: '#1d4ed8' }]}>{ger.concluidos ?? 0}</Text>
                    <Text style={styles.tecStatLabel}>Concluidos</Text>
                  </View>
                  <View style={[styles.tecStatItem, { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.tecStatNumber, { color: '#475569' }]}>{formatTimeDuration(ger.tempoMedioMs)}</Text>
                    <Text style={styles.tecStatLabel}>T. Médio</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {gerentes.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Nenhum gerente encontrado</Text>
                <Text style={styles.emptySubtitle}>Nenhum gerente está cadastrado no sistema.</Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      </View>

      <Modal
        visible={selectedTecnico !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedTecnico(null)}
      >
        {selectedTecnico ? (
          <SafeAreaView style={styles.detailSafeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#2a0000" />
            <View style={styles.detailContainer}>

            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.85}
                onPress={() => setSelectedTecnico(null)}
              >
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>

              <View style={styles.detailHeaderInfo}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarLetter}>{selectedTecnico.nome.charAt(0)}</Text>
                </View>
                <View style={styles.detailHeaderTextBox}>
                  <Text style={styles.detailHeaderTitle}>{selectedTecnico.nome}</Text>
                  <Text style={styles.detailHeaderSub}>{selectedTecnico.area}</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Informacoes do Tecnico</Text>

                <View style={styles.detailInfoRow}>
                  <Feather name="mail" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedTecnico.email}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="phone" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedTecnico.telefone}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="credit-card" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>CPF: {selectedTecnico.cpf}</Text>
                </View>
                {selectedTecnico.endereco && (
                  <View style={styles.detailInfoRow}>
                    <Feather name="map-pin" size={16} color="#64748b" />
                    <Text style={styles.detailInfoText}>{selectedTecnico.endereco}</Text>
                  </View>
                )}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>{selectedTecnico.total}</Text>
                  <Text style={styles.metricLabel}>Total</Text>
                </View>
                <View style={[styles.metricCard, styles.metricCardGreen]}>
                  <Text style={[styles.metricValue, styles.metricValueGreen]}>{selectedTecnico.ativos}</Text>
                  <Text style={styles.metricLabel}>Ativos</Text>
                </View>
                <View style={[styles.metricCard, styles.metricCardBlue]}>
                  <Text style={[styles.metricValue, styles.metricValueBlue]}>{selectedTecnico.concluidos}</Text>
                  <Text style={styles.metricLabel}>Concluidos</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: '#f8fafc' }]}>
                  <Text style={[styles.metricValue, { color: '#475569' }]}>{formatTimeDuration(selectedTecnico.tempoMedioMs)}</Text>
                  <Text style={styles.metricLabel}>T. Médio</Text>
                </View>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Observacoes</Text>
                <Text style={styles.notesText}>{selectedTecnico.observacoes}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Atendimentos</Text>
                {selectedTecnico.atendimentos.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.orderCard, { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: (statusBadgeColorByCode as any)[item.status] || '#d1d5db' }]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedTecnico(null);
                      (navigation as any).navigate('Pedidos', { selectedServiceId: item.id, fromTab: 'Tecnicos' });
                    }}
                  >
                    <View style={styles.orderTopRow}>
                      <View style={styles.orderIdentityRow}>
                        <Text style={styles.orderId}>{formatPedidoLabel(item.numeroPedido)}</Text>
                        {item.numeroOrdemServico ? (
                          <View style={styles.osBadge}>
                            <Text style={styles.osBadgeText}>{formatOrdemServicoLabel(item.numeroOrdemServico)}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.orderBadge, { backgroundColor: (statusBadgeColorByCode as any)[item.status] }]}>
                        {(statusLabelByCode as any)[item.status]}
                      </Text>
                    </View>

                    <Text style={styles.clientName}>{item.cliente}</Text>

                    <View style={styles.infoRow}>
                      <Feather name="phone" size={16} color="#16a34a" />
                      <Text style={styles.infoText}>{item.telefone || 'Telefone nao informado'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Feather name="map-pin" size={16} color="#ef4444" />
                      <Text style={styles.infoText}>{item.endereco}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Feather name="clock" size={16} color="#64748b" />
                      <Text style={styles.infoText}>{(item.data && item.data !== '--/--/--' ? item.data : (item.dataConclusao || '--/--/--'))} as {(item.hora && item.hora !== '--:--' ? item.hora : (item.horaConclusao || '--:--'))}</Text>
                    </View>

                    <View style={styles.descriptionBox}>
                      <Text style={styles.descriptionText}>{formatLockDisplayName(item.servico)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.closeDetailButton, { flex: 1, backgroundColor: '#7A1A1A', borderColor: '#7A1A1A' }]}
                  activeOpacity={0.9}
                  onPress={() => handlePromoteToGerente(selectedTecnico)}
                >
                  <Text style={[styles.closeDetailButtonText, { color: '#fff' }]}>Tornar Gerente</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeDetailButton, { flex: 1 }]}
                  activeOpacity={0.9}
                  onPress={() => setSelectedTecnico(null)}
                >
                  <Text style={styles.closeDetailButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            </View>
          </SafeAreaView>
        ) : null}
      </Modal>

          {/* Modal Perfil do Gerente */}
          <Modal
            visible={selectedGerente !== null}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setSelectedGerente(null)}
          >
            {selectedGerente ? (
              <SafeAreaView style={styles.detailSafeArea}>
                <StatusBar barStyle="light-content" backgroundColor="#2a0000" />
                <View style={styles.detailContainer}>
                  <View style={[styles.detailHeader, { backgroundColor: '#2d1b69' }]}>
                    <TouchableOpacity
                      style={styles.detailBackButton}
                      activeOpacity={0.85}
                      onPress={() => setSelectedGerente(null)}
                    >
                      <Feather name="chevron-left" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.detailHeaderInfo}>
                      <View style={[styles.detailAvatar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                        <Text style={styles.detailAvatarLetter}>{selectedGerente.nome.charAt(0)}</Text>
                      </View>
                      <View style={styles.detailHeaderTextBox}>
                        <Text style={styles.detailHeaderTitle}>{selectedGerente.nome}</Text>
                        <Text style={styles.detailHeaderSub}>Gerente · {selectedGerente.tecnicosVinculados} técnico(s) na equipe</Text>
                      </View>
                    </View>
                  </View>

                  <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>
                    {/* Informações */}
                    <View style={styles.detailCard}>
                      <Text style={styles.detailSectionTitle}>Informações do Gerente</Text>
                      <View style={styles.detailInfoRow}>
                        <Feather name="mail" size={16} color="#64748b" />
                        <Text style={styles.detailInfoText}>{selectedGerente.email}</Text>
                      </View>
                      {selectedGerente.telefone ? (
                        <View style={styles.detailInfoRow}>
                          <Feather name="phone" size={16} color="#64748b" />
                          <Text style={styles.detailInfoText}>{selectedGerente.telefone}</Text>
                        </View>
                      ) : null}
                      <View style={styles.detailInfoRow}>
                        <Feather name="map-pin" size={16} color={selectedGerente.lastLocation ? '#15803d' : '#dc2626'} />
                        <Text style={styles.detailInfoText}>
                          {selectedGerente.lastLocation
                            ? `GPS ativo · ${selectedGerente.lastLocation.latitude.toFixed(5)}, ${selectedGerente.lastLocation.longitude.toFixed(5)}`
                            : 'Sem localização GPS'}
                        </Text>
                      </View>
                    </View>

                    {/* Métricas */}
                    <View style={styles.metricsRow}>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricValue}>{selectedGerente.total ?? 0}</Text>
                        <Text style={styles.metricLabel}>Total</Text>
                      </View>
                      <View style={[styles.metricCard, styles.metricCardGreen]}>
                        <Text style={[styles.metricValue, styles.metricValueGreen]}>{selectedGerente.ativos ?? 0}</Text>
                        <Text style={styles.metricLabel}>Ativos</Text>
                      </View>
                      <View style={[styles.metricCard, styles.metricCardBlue]}>
                        <Text style={[styles.metricValue, styles.metricValueBlue]}>{selectedGerente.concluidos ?? 0}</Text>
                        <Text style={styles.metricLabel}>Concluidos</Text>
                      </View>
                      <View style={[styles.metricCard, { backgroundColor: '#f8fafc' }]}>
                        <Text style={[styles.metricValue, { color: '#475569' }]}>{formatTimeDuration(selectedGerente.tempoMedioMs)}</Text>
                        <Text style={styles.metricLabel}>T. Médio</Text>
                      </View>
                    </View>

                    {/* Atendimentos */}
                    {(selectedGerente.atendimentos ?? []).length > 0 ? (
                      <View style={styles.detailCard}>
                        <Text style={styles.detailSectionTitle}>Atendimentos</Text>
                        {(selectedGerente.atendimentos ?? []).map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.orderCard, { backgroundColor: '#fff', borderLeftWidth: 4, borderLeftColor: (statusBadgeColorByCode as any)[item.status] || '#d1d5db' }]}
                            activeOpacity={0.8}
                            onPress={() => {
                              setSelectedGerente(null);
                              (navigation as any).navigate('Pedidos', { selectedServiceId: item.id, fromTab: 'Tecnicos' });
                            }}
                          >
                            <View style={styles.orderTopRow}>
                              <View style={styles.orderIdentityRow}>
                                <Text style={styles.orderId}>{formatPedidoLabel(item.numeroPedido)}</Text>
                                {item.numeroOrdemServico ? (
                                  <View style={styles.osBadge}>
                                    <Text style={styles.osBadgeText}>{formatOrdemServicoLabel(item.numeroOrdemServico)}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={[styles.orderBadge, { backgroundColor: (statusBadgeColorByCode as any)[item.status] }]}>
                                {(statusLabelByCode as any)[item.status]}
                              </Text>
                            </View>
                            <Text style={styles.clientName}>{item.cliente}</Text>
                            <View style={styles.infoRow}>
                              <Feather name="map-pin" size={16} color="#ef4444" />
                              <Text style={styles.infoText}>{item.endereco}</Text>
                            </View>
                            <View style={styles.infoRow}>
                              <Feather name="clock" size={16} color="#64748b" />
                              <Text style={styles.infoText}>{item.data && item.data !== '--/--/--' ? item.data : (item.dataConclusao || '--/--/--')} às {item.hora && item.hora !== '--:--' ? item.hora : (item.horaConclusao || '--:--')}</Text>
                            </View>
                            <View style={styles.descriptionBox}>
                              <Text style={styles.descriptionText}>{formatLockDisplayName(item.servico)}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.closeDetailButton, { marginTop: 12 }]}
                      activeOpacity={0.9}
                      onPress={() => setSelectedGerente(null)}
                    >
                      <Text style={styles.closeDetailButtonText}>Fechar</Text>
                    </TouchableOpacity>
                    <View style={{ height: 40 }} />
                  </ScrollView>
                </View>
              </SafeAreaView>
            ) : null}
          </Modal>
        </SafeAreaView>
      );
    }

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#7A1A1A',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
    marginTop: 22,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140,
  },
  tecCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#7A1A1A',
  },
  tecHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  tecInfo: {
    flex: 1,
  },
  tecNome: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  tecEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 1,
  },
  tecStats: {
    flexDirection: 'row',
    gap: 10,
  },
  tecStatItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tecStatItemGreen: {
    backgroundColor: '#dcfce7',
  },
  tecStatItemBlue: {
    backgroundColor: '#dbeafe',
  },
  tecStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  tecStatLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#7A1A1A',
    shadowColor: '#7A1A1A',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7A1A1A',
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  roleBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  roleBadgeText: {
    color: '#7A1A1A',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9dfe7',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
  },
  detailSafeArea: {
    flex: 1,
    backgroundColor: '#2a0000',
  },
  detailContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  detailHeader: {
    backgroundColor: '#2a0000',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  detailBackButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  detailAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailAvatarLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  detailHeaderTextBox: {
    flex: 1,
  },
  detailHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  detailHeaderSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 2,
  },
  detailScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailSectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  detailInfoText: {
    color: '#334155',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#eef2f6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricCardGreen: {
    backgroundColor: '#d9f3e6',
  },
  metricCardBlue: {
    backgroundColor: '#dbe9f8',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  metricValueGreen: {
    color: '#008a5c',
  },
  metricValueBlue: {
    color: '#2563eb',
  },
  metricLabel: {
    color: '#475569',
    fontSize: 12,
    marginTop: 2,
  },
  notesText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
  },
  serviceRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  serviceRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  serviceClient: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  serviceBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  serviceBadgeYellow: {
    backgroundColor: '#d97706',
  },
  serviceBadgeGreen: {
    backgroundColor: '#059669',
  },
  serviceBadgeBlue: {
    backgroundColor: '#2563eb',
  },
  serviceDescription: {
    color: '#334155',
    fontSize: 13,
    marginBottom: 4,
  },
  serviceMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  closeDetailButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  closeDetailButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dbe0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    color: '#5b1111',
    fontWeight: '700',
    fontSize: 13,
    backgroundColor: '#f8e9de',
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    borderRadius: 8,
    textAlignVertical: 'center',
  },
  osBadge: {
    backgroundColor: '#fff3c4',
    borderWidth: 1,
    borderColor: '#f3d36b',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: 24,
    justifyContent: 'center',
  },
  osBadgeText: {
    color: '#8a5a00',
    fontSize: 13,
    fontWeight: '700',
  },
  orderBadge: {
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12.5,
  },
  clientName: {
    color: '#0f172a',
    fontSize: 34 / 1.5,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 7,
  },
  infoText: {
    color: '#334155',
    fontSize: 14,
    flex: 1,
  },
  descriptionBox: {
    backgroundColor: '#f0f1f4',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  descriptionText: {
    color: '#1e293b',
    fontSize: 27 / 1.5,
    lineHeight: 22,
  },
});
