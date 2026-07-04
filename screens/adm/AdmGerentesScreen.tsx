import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAdminGerentesFromApi, fetchAdminTecnicosFromApi, updateAdminUser, type AdminGerenteUser, type AdminTecnicoUser } from '../../components/shared/admin/adminApi';
import { GerenteActionSheet, GerenteTeamModal, GerenteEditModal, GerenteHistoryModal } from './AdmGerenteModals';

export default function AdmGerentesScreen() {
  const navigation = useNavigation();
  const [gerentes, setGerentes] = useState<AdminGerenteUser[]>([]);
  const [tecnicos, setTecnicos] = useState<AdminTecnicoUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal de atribuição de gerente
  const [assignTarget, setAssignTarget] = useState<AdminTecnicoUser | null>(null);
  
  // Modais de gerenciamento do gerente
  const [selectedGerente, setSelectedGerente] = useState<AdminGerenteUser | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gerentesData, tecnicosData] = await Promise.all([
        fetchAdminGerentesFromApi(),
        fetchAdminTecnicosFromApi()
      ]);
      setGerentes(gerentesData);
      setTecnicos(tecnicosData);
    } catch (error) {
      console.warn('Erro ao carregar gerentes/tecnicos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAssignGerente = async (gerenteId: string) => {
    if (!assignTarget) return;
    try {
      await updateAdminUser(assignTarget.id, { gerente_id: gerenteId });
      Alert.alert('Sucesso', 'Gerente vinculado com sucesso!');
      setAssignTarget(null);
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível vincular gerente.');
    }
  };

  const handleRemoveGerente = async () => {
    if (!assignTarget) return;
    try {
      await updateAdminUser(assignTarget.id, { gerente_id: null });
      Alert.alert('Sucesso', 'Vínculo removido!');
      setAssignTarget(null);
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o vínculo.');
    }
  };

  const handleDemoteGerente = (gerente: AdminGerenteUser) => {
    Alert.alert(
      "Excluir Gerente",
      `Deseja excluir o gerente ${gerente.nome}? Ele voltará a ser um técnico convencional e toda a sua equipe será desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Desvincular todos os técnicos da equipe do gerente
              const teamTecnicos = tecnicos.filter(t => t.gerenteId === gerente.id);
              const unlinkPromises = teamTecnicos.map(t => 
                updateAdminUser(t.id, { gerente_id: null })
              );
              await Promise.all(unlinkPromises);

              // 2. Tornar o gerente um técnico convencional
              await updateAdminUser(gerente.id, { typeUser: 'tecnico' });
              
              Alert.alert('Sucesso', 'Gerente excluído! A equipe foi desfeita e ele voltou a ser técnico convencional.');
              loadData();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o gerente.');
            }
          }
        }
      ]
    );
  };

  const handleSaveGerenteEdit = async (gerenteData: any, selectedTecnicosIds: string[]) => {
    if (!selectedGerente) return;
    try {
      // 1. Atualizar informações do gerente
      await updateAdminUser(selectedGerente.id, gerenteData);
      
      // 2. Atualizar vínculos dos técnicos (em paralelo)
      const currentTeam = tecnicos.filter(t => t.gerenteId === selectedGerente.id).map(t => t.id);
      
      const toAdd = selectedTecnicosIds.filter(id => !currentTeam.includes(id));
      const toRemove = currentTeam.filter(id => !selectedTecnicosIds.includes(id));

      const updatePromises = [
        ...toAdd.map(id => updateAdminUser(id, { gerente_id: selectedGerente.id })),
        ...toRemove.map(id => updateAdminUser(id, { gerente_id: null }))
      ];

      await Promise.all(updatePromises);
      
      Alert.alert('Sucesso', 'Gerente atualizado com sucesso!');
      setEditModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as alterações do gerente.');
    }
  };

  const handleActionSheetOption = (option: 'edit' | 'team' | 'history' | 'deactivate' | 'delete') => {
    setActionSheetVisible(false);
    setTimeout(() => {
      if (option === 'edit') setEditModalVisible(true);
      if (option === 'team') setTeamModalVisible(true);
      if (option === 'history') setHistoryModalVisible(true);
      if (option === 'delete') {
        if (selectedGerente) handleDemoteGerente(selectedGerente);
      }
    }, 300);
  };

  const filteredTecnicos = tecnicos.filter(t => t.nome.toLowerCase().includes(search.toLowerCase()));
  const filteredGerentes = gerentes.filter(g => g.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.container}>
        <View style={styles.headerRed}>
          <View>
            <Text style={styles.headerTitle}>Gerentes</Text>
            <Text style={styles.headerSubtitle}>Gerencie os gerentes e suas equipes</Text>
          </View>

        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.searchRow}>
            <View style={styles.searchContainer}>
              <Feather name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar gerente ou técnico"
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <TouchableOpacity style={styles.filterBtn} onPress={() => Alert.alert('Filtro', 'Filtros avançados em desenvolvimento.')}>
              <Feather name="filter" size={16} color="#475569" />
              <Text style={styles.filterBtnText}>Filtrar</Text>
            </TouchableOpacity>
          </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Feather name="users" size={24} color="#7A1A1A" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statNumber}>{gerentes.length}</Text>
              <Text style={styles.statLabel}>Gerentes cadastrados</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Feather name="users" size={24} color="#7A1A1A" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.statNumber}>{tecnicos.filter(t => t.gerenteId).length}</Text>
              <Text style={styles.statLabel}>Técnicos vinculados</Text>
            </View>
          </View>
        </View>

        {filteredGerentes.map(gerente => (
          <TouchableOpacity 
            key={gerente.id} 
            style={styles.gerenteCard} 
            activeOpacity={0.8} 
            onPress={() => {
              setSelectedGerente(gerente);
              setTeamModalVisible(true);
            }}
          >
            <View style={styles.gerenteHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(gerente.nome || 'GE').substring(0, 2).toUpperCase()}</Text>
              </View>
              <View style={styles.gerenteInfo}>
                <Text style={styles.gerenteName}>{gerente.nome}</Text>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{gerente.telefone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="mail" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{gerente.email}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.activeBadge, { marginBottom: 8 }]}>
                  <Text style={styles.activeBadgeText}>Ativo</Text>
                </View>
                <TouchableOpacity 
                  style={{ padding: 4, marginRight: -4 }} 
                  onPress={() => {
                    setSelectedGerente(gerente);
                    setActionSheetVisible(true);
                  }}
                >
                  <Feather name="more-vertical" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.gerenteFooter}>
              <View style={styles.infoRow}>
                <Feather name="users" size={16} color="#64748b" />
                <Text style={styles.footerText}>{gerente.tecnicosVinculados} técnicos</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#334155', fontFamily: 'Inter-Medium', fontSize: 13, marginRight: 4 }}>Ver equipe</Text>
                <Feather name="chevron-right" size={16} color="#334155" />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            Técnicos <Text style={styles.sectionSubtitle}>(Todos os gerentes)</Text>
          </Text>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => navigation.navigate('Tecnicos' as never)}
          >
            <Text style={{ color: '#1e293b', fontSize: 13, fontFamily: 'Inter-Medium', marginRight: 4 }}>Ver todos</Text>
            <Feather name="chevron-right" size={14} color="#1e293b" />
          </TouchableOpacity>
        </View>

        {filteredTecnicos.map(tecnico => {
          const gerenteResp = gerentes.find(g => g.id === tecnico.gerenteId);
          return (
            <TouchableOpacity key={tecnico.id} style={styles.tecnicoCard} onPress={() => setAssignTarget(tecnico)}>
              <View style={[styles.tecnicoInfo, { flex: 1, marginRight: 12 }]}>
                <View style={styles.tecnicoAvatar}>
                  <Feather name="user" size={20} color="#64748b" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.tecnicoName} numberOfLines={1}>{tecnico.nome}</Text>
                  <Text style={styles.tecnicoPhone}>{tecnico.telefone}</Text>
                </View>
              </View>
              <View style={styles.tecnicoRight}>
                <View style={styles.tecnicoRightInfo}>
                  {gerenteResp ? (
                    <View style={[styles.gerenteRespBadge, { maxWidth: 100 }]}>
                      <Feather name="user" size={12} color="#7A1A1A" />
                      <Text style={[styles.gerenteRespText, { flexShrink: 1 }]} numberOfLines={1}>{gerenteResp.nome}</Text>
                    </View>
                  ) : (
                    <Text style={styles.noGerenteText}>Sem gerente</Text>
                  )}
                  <View style={[styles.activeBadge, { paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }]}>
                    <Text style={[styles.activeBadgeText, { fontSize: 10 }]}>Ativo</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Novos Modais Baseados no Design */}
      <GerenteActionSheet 
        visible={actionSheetVisible} 
        gerente={selectedGerente} 
        onClose={() => setActionSheetVisible(false)} 
        onSelectOption={handleActionSheetOption} 
      />

      <GerenteTeamModal 
        visible={teamModalVisible} 
        gerente={selectedGerente} 
        tecnicos={tecnicos} 
        onClose={() => setTeamModalVisible(false)} 
        onEdit={() => {
          setTeamModalVisible(false);
          setTimeout(() => setEditModalVisible(true), 300);
        }} 
      />

      <GerenteEditModal 
        visible={editModalVisible} 
        gerente={selectedGerente} 
        allTecnicos={tecnicos} 
        onClose={() => setEditModalVisible(false)} 
        onSave={handleSaveGerenteEdit} 
      />

      <GerenteHistoryModal
        visible={historyModalVisible}
        gerente={selectedGerente}
        tecnicos={tecnicos}
        onClose={() => setHistoryModalVisible(false)}
      />

      {/* Modal para Vincular Gerente a um Técnico (Manteve-se o antigo para AdmTecnicosScreen/Acesso rápido) */}
      <Modal
        visible={assignTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vincular Gerente</Text>
            <Text style={styles.modalDesc}>
              Selecione um gerente para liderar o técnico <Text style={{fontWeight: 'bold'}}>{assignTarget?.nome}</Text>:
            </Text>

            <ScrollView style={{ maxHeight: 300, width: '100%', marginVertical: 16 }}>
              {gerentes.map(g => (
                <TouchableOpacity 
                  key={g.id} 
                  style={[styles.modalOption, assignTarget?.gerenteId === g.id && styles.modalOptionSelected]}
                  onPress={() => handleAssignGerente(g.id)}
                >
                  <Text style={[styles.modalOptionText, assignTarget?.gerenteId === g.id && { color: '#7A1A1A', fontWeight: 'bold' }]}>
                    {g.nome}
                  </Text>
                  {assignTarget?.gerenteId === g.id && <Feather name="check" size={18} color="#7A1A1A" />}
                </TouchableOpacity>
              ))}
              
              {assignTarget?.gerenteId && (
                <TouchableOpacity 
                  style={[styles.modalOption, { marginTop: 16, borderStyle: 'dashed' }]}
                  onPress={handleRemoveGerente}
                >
                  <Text style={{ color: '#ef4444', fontFamily: 'Inter-Medium' }}>Remover Vínculo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAssignTarget(null)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7A1A1A' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerRed: { backgroundColor: '#7A1A1A', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontFamily: 'Inter-Bold' },
  headerSubtitle: { color: '#f1f5f9', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 4 },
  btnNovoGerente: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnNovoGerenteText: { color: '#fff', fontSize: 13, fontFamily: 'Inter-Medium', marginLeft: 6 },
  content: { padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontFamily: 'Inter-Regular', fontSize: 14 },
  filterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 44, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnText: { color: '#475569', fontSize: 14, fontFamily: 'Inter-Medium', marginLeft: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#1e293b' },
  statLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#64748b' },
  gerenteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  gerenteHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#7A1A1A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontFamily: 'Inter-Bold' },
  gerenteInfo: { flex: 1, marginLeft: 12 },
  gerenteName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1e293b', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoText: { fontSize: 13, color: '#64748b', marginLeft: 6, fontFamily: 'Inter-Regular' },
  activeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activeBadgeText: { color: '#16a34a', fontSize: 12, fontFamily: 'Inter-Medium' },
  gerenteFooter: { backgroundColor: '#f8fafc', marginHorizontal: -16, marginBottom: -16, padding: 12, paddingHorizontal: 16, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerText: { fontSize: 13, color: '#64748b', marginLeft: 6, fontFamily: 'Inter-Medium' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1e293b' },
  sectionSubtitle: { fontSize: 13, color: '#64748b', fontFamily: 'Inter-Regular' },
  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tecnicoAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  tecnicoInfo: { flexDirection: 'row', alignItems: 'center' },
  tecnicoName: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#1e293b' },
  tecnicoPhone: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#64748b', marginTop: 2 },
  tecnicoRight: { alignItems: 'flex-end' },
  tecnicoRightInfo: { flexDirection: 'row', alignItems: 'center' },
  gerenteRespBadge: { flexDirection: 'row', alignItems: 'center' },
  gerenteRespText: { color: '#7A1A1A', fontSize: 12, fontFamily: 'Inter-Medium', marginLeft: 4 },
  noGerenteText: { color: '#9ca3af', fontSize: 12, fontFamily: 'Inter-Medium', marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', width: '100%', borderRadius: 12, padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b', marginBottom: 8 },
  modalDesc: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#64748b', textAlign: 'center' },
  modalOption: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  modalOptionSelected: { borderColor: '#7A1A1A', backgroundColor: '#fff1f2' },
  modalOptionText: { fontSize: 15, fontFamily: 'Inter-Medium', color: '#1e293b' },
  modalCloseButton: { marginTop: 8, padding: 12 },
  modalCloseText: { color: '#64748b', fontFamily: 'Inter-SemiBold', fontSize: 16 },
});
