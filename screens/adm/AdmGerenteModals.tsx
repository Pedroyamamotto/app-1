import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AdminGerenteUser, AdminTecnicoUser, fetchAdminServicesAllFromApi, buildTechniciansFromServices, AdminServiceData } from '../../components/shared/admin/adminApi';

// --- GERENTE ACTION SHEET ---
type ActionSheetProps = {
  visible: boolean;
  gerente: AdminGerenteUser | null;
  onClose: () => void;
  onSelectOption: (option: 'edit' | 'team' | 'history' | 'deactivate' | 'delete') => void;
};

export function GerenteActionSheet({ visible, gerente, onClose, onSelectOption }: ActionSheetProps) {
  if (!gerente) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheetContent}>
          <View style={styles.sheetHandle} />
          
          <TouchableOpacity style={styles.sheetItem} onPress={() => onSelectOption('edit')}>
            <Feather name="edit-2" size={20} color="#334155" />
            <View style={styles.sheetItemTexts}>
              <Text style={styles.sheetItemTitle}>Editar gerente</Text>
              <Text style={styles.sheetItemSub}>Atualize as informações do gerente</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetItem} onPress={() => onSelectOption('team')}>
            <Feather name="users" size={20} color="#334155" />
            <View style={styles.sheetItemTexts}>
              <Text style={styles.sheetItemTitle}>Gerenciar equipe</Text>
              <Text style={styles.sheetItemSub}>Adicionar ou remover técnicos da equipe</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetItem} onPress={() => onSelectOption('history')}>
            <Feather name="clock" size={20} color="#334155" />
            <View style={styles.sheetItemTexts}>
              <Text style={styles.sheetItemTitle}>Histórico da equipe</Text>
              <Text style={styles.sheetItemSub}>Ver atividades e instalações da equipe</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.sheetItem, { borderBottomWidth: 0 }]} onPress={() => onSelectOption('delete')}>
            <Feather name="trash-2" size={20} color="#ef4444" />
            <View style={styles.sheetItemTexts}>
              <Text style={[styles.sheetItemTitle, { color: '#ef4444' }]}>Excluir gerente</Text>
              <Text style={styles.sheetItemSub}>Remover gerente e desvincular a equipe</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sheetBtnCancel} onPress={onClose}>
            <Text style={styles.sheetBtnCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// --- GERENTE TEAM MODAL ---
type TeamModalProps = {
  visible: boolean;
  gerente: AdminGerenteUser | null;
  tecnicos: AdminTecnicoUser[];
  onClose: () => void;
  onEdit: () => void;
};

export function GerenteTeamModal({ visible, gerente, tecnicos, onClose, onEdit }: TeamModalProps) {
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsMap, setStatsMap] = useState<Map<string, any>>(new Map());
  const [selectedTecnico, setSelectedTecnico] = useState<AdminTecnicoUser | null>(null);

  useEffect(() => {
    if (visible && gerente) {
      setLoading(true);
      fetchAdminServicesAllFromApi()
        .then(data => {
          setServices(data);
          const fromServices = buildTechniciansFromServices(data);
          const normalizeName = (val: string) => String(val || '').trim().toLowerCase();
          const map = new Map();
          fromServices.forEach(item => {
            if (item.id) map.set(item.id.toLowerCase(), item);
            if (item.nome) map.set(normalizeName(item.nome), item);
          });
          setStatsMap(map);
        })
        .catch(err => console.warn('Erro ao carregar serviços globais', err))
        .finally(() => setLoading(false));
    } else {
      setServices([]);
      setStatsMap(new Map());
      setSelectedTecnico(null);
    }
  }, [visible, gerente]);

  if (!gerente) return null;
  
  const equipe = tecnicos.filter(t => t.gerenteId === gerente.id);

  // Calcula instalações concluídas de toda a equipe
  const totalConcluidas = equipe.reduce((acc, tecnico) => {
    const nomeNormalizado = String(tecnico.nome || '').trim().toLowerCase();
    const stats = statsMap.get(tecnico.id?.toLowerCase()) || statsMap.get(nomeNormalizado);
    return acc + (stats?.concluidos || 0);
  }, 0);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '--/--/----';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.modalHeaderRed}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalHeaderTitle}>Equipe de {gerente.nome}</Text>
            <Text style={styles.modalHeaderSub}>Gerencie os técnicos desta equipe</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryTop, { borderBottomWidth: 0, paddingBottom: 8, marginBottom: 8 }]}>
              <View style={styles.summaryAvatar}>
                <Text style={styles.summaryAvatarLetter}>{(gerente.nome || 'GE').substring(0, 2).toUpperCase()}</Text>
                <View style={styles.shieldIcon}>
                  <Feather name="shield" size={12} color="#fff" />
                </View>
              </View>
              <View style={[styles.summaryInfo, { flex: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
                  <Text style={styles.summaryName}>{gerente.nome}</Text>
                  <View style={styles.badgeGerente}>
                    <Text style={styles.badgeGerenteText}>Gerente</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="phone" size={14} color="#64748b" />
                  <Text style={styles.infoText}>{gerente.telefone}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Feather name="mail" size={14} color="#64748b" />
                  <Text style={[styles.infoText, { flexShrink: 1 }]} numberOfLines={1}>{gerente.email}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.btnEditOutlineFull} onPress={onEdit}>
              <Feather name="edit-2" size={14} color="#7A1A1A" />
              <Text style={styles.btnEditOutlineTextFull}>Editar gerente</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: '#f1f5f9', marginHorizontal: -16, marginBottom: 16 }} />

            <View style={styles.summaryFooter}>
              <View style={styles.summaryMetric}>
                <Feather name="users" size={20} color="#64748b" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricValue}>{equipe.length}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>Técnicos na equipe</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryMetric}>
                <Feather name="calendar" size={20} color="#64748b" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.metricValue}>{totalConcluidas}</Text>
                  <Text style={styles.metricLabel} numberOfLines={2}>Instalações concluídas</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Técnicos Atribuídos</Text>
            <TouchableOpacity style={styles.btnAddTecnico} onPress={onEdit}>
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.btnAddTecnicoText}>Gerenciar equipe</Text>
            </TouchableOpacity>
          </View>

          {equipe.map(tecnico => {
            const nomeNormalizado = String(tecnico.nome || '').trim().toLowerCase();
            const stats = statsMap.get(tecnico.id?.toLowerCase()) || statsMap.get(nomeNormalizado);
            const total = stats?.total || 0;
            const concluidos = stats?.concluidos || 0;
            const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;

            return (
              <TouchableOpacity 
                key={tecnico.id} 
                style={styles.tecCard} 
                activeOpacity={0.8}
                onPress={() => setSelectedTecnico(tecnico)}
              >
                <View style={styles.tecCardTop}>
                  <View style={styles.tecAvatar}>
                    <Feather name="user" size={24} color="#9ca3af" />
                  </View>
                  <View style={styles.tecInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={styles.tecName}>{tecnico.nome}</Text>
                      <View style={[styles.badgeAtivo, { marginLeft: 8 }]}>
                        <Text style={styles.badgeAtivoText}>Ativo</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="phone" size={14} color="#9ca3af" />
                      <Text style={styles.tecSubText}>{tecnico.telefone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="calendar" size={14} color="#9ca3af" />
                      <Text style={styles.tecSubText}>Desde {formatDate(tecnico.criadoEm)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => setSelectedTecnico(tecnico)}>
                    <Feather name="more-vertical" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <View style={styles.tecCardFooter}>
                  <View style={styles.tecMetric}>
                    <Feather name="briefcase" size={16} color="#9ca3af" style={{ marginBottom: 4 }} />
                    <Text style={styles.tecMetricVal}>{total}</Text>
                    <Text style={styles.tecMetricLbl}>Instalações</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.tecMetric}>
                    <Feather name="clock" size={16} color="#9ca3af" style={{ marginBottom: 4 }} />
                    <Text style={styles.tecMetricVal}>{taxa}%</Text>
                    <Text style={styles.tecMetricLbl}>Taxa de conclusão</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.tipCard}>
            <Feather name="info" size={20} color="#2563eb" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.tipTitle}>Dica</Text>
              <Text style={styles.tipText}>Você pode tocar em qualquer técnico para ver seu perfil completo e histórico individual de atendimentos.</Text>
            </View>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {selectedTecnico && (
        <Modal
          visible={selectedTecnico !== null}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setSelectedTecnico(null)}
        >
          <SafeAreaView style={styles.modalSafeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
            <View style={styles.modalHeaderRed}>
              <TouchableOpacity onPress={() => setSelectedTecnico(null)} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHeaderTitle}>Perfil de {selectedTecnico.nome}</Text>
                <Text style={styles.modalHeaderSub}>Métricas e histórico do técnico</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryTop}>
                  <View style={styles.summaryAvatar}>
                    <Text style={styles.summaryAvatarLetter}>{(selectedTecnico.nome || 'TE').substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryName}>{selectedTecnico.nome}</Text>
                    <View style={styles.infoRow}>
                      <Feather name="phone" size={14} color="#64748b" />
                      <Text style={styles.infoText}>{selectedTecnico.telefone}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Feather name="mail" size={14} color="#64748b" />
                      <Text style={styles.infoText}>{selectedTecnico.email}</Text>
                    </View>
                  </View>
                </View>

                {(() => {
                  const nomeNormalizado = String(selectedTecnico.nome || '').trim().toLowerCase();
                  const stats = statsMap.get(selectedTecnico.id?.toLowerCase()) || statsMap.get(nomeNormalizado);
                  const total = stats?.total || 0;
                  const concluidos = stats?.concluidos || 0;
                  const ativos = stats?.ativos || 0;
                  const taxa = total > 0 ? Math.round((concluidos / total) * 100) : 0;
                  
                  return (
                    <View style={styles.summaryFooter}>
                      <View style={styles.summaryMetric}>
                        <Feather name="briefcase" size={20} color="#64748b" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metricValue}>{total}</Text>
                          <Text style={styles.metricLabel} numberOfLines={2}>Total</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.summaryMetric}>
                        <Feather name="clock" size={20} color="#64748b" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metricValue}>{ativos}</Text>
                          <Text style={styles.metricLabel} numberOfLines={2}>Ativos</Text>
                        </View>
                      </View>
                      <View style={styles.divider} />
                      <View style={styles.summaryMetric}>
                        <Feather name="check-circle" size={20} color="#64748b" style={{ marginRight: 8 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.metricValue}>{taxa}%</Text>
                          <Text style={styles.metricLabel} numberOfLines={2}>Concluídos</Text>
                        </View>
                      </View>
                    </View>
                  );
                })()}
              </View>

              <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Atendimentos do Técnico</Text>
              {(() => {
                const tecName = String(selectedTecnico.nome || '').trim().toLowerCase();
                const filteredServices = services.filter(s => String(s.tecnico || '').trim().toLowerCase() === tecName);
                
                if (filteredServices.length === 0) {
                  return (
                    <Text style={{ textAlign: 'center', color: '#64748b', marginVertical: 20 }}>
                      Nenhum atendimento registrado no momento.
                    </Text>
                  );
                }

                return filteredServices.map(item => {
                  const statusColor = localStatusColors[item.status] || '#cbd5e1';
                  const statusLabel = localStatusLabels[item.status] || 'Desconhecido';
                  
                  return (
                    <View 
                      key={item.id} 
                      style={[
                        styles.tecCard, 
                        { 
                          borderLeftWidth: 4, 
                          borderLeftColor: statusColor, 
                          padding: 14 
                        }
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={styles.tecName}>{item.numeroPedido}</Text>
                        <View style={[styles.badgeAtivo, { backgroundColor: statusColor + '15' }]}>
                          <Text style={[styles.badgeAtivoText, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 14, color: '#475569', marginBottom: 2 }}>{item.descricao}</Text>
                      <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{item.cliente}</Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>{item.data} • {item.hora}</Text>
                    </View>
                  );
                });
              })()}

              <TouchableOpacity
                style={[styles.btnCancelFooter, { marginHorizontal: 0, marginTop: 16 }]}
                onPress={() => setSelectedTecnico(null)}
              >
                <Text style={styles.btnCancelFooterText}>Fechar Perfil</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </Modal>
  );
}

// --- GERENTE EDIT MODAL ---
type EditModalProps = {
  visible: boolean;
  gerente: AdminGerenteUser | null;
  allTecnicos: AdminTecnicoUser[];
  onClose: () => void;
  onSave: (gerenteData: any, selectedTecnicosIds: string[]) => void;
};

export function GerenteEditModal({ visible, gerente, allTecnicos, onClose, onSave }: EditModalProps) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('Ativo');
  const [dataInicio, setDataInicio] = useState('10/04/2025');
  const [observacoes, setObservacoes] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '--/--/----';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    if (gerente) {
      const g = gerente as any;
      setNome(g.nome || '');
      setTelefone(g.telefone || '');
      setEmail(g.email || '');
      setObservacoes(g.observacoes || '');
      setDataInicio(formatDate(g.criadoEm));
      
      const equipe = allTecnicos.filter(t => t.gerenteId === g.id).map(t => t.id);
      setSelectedIds(equipe);
    }
  }, [gerente, visible]);

  if (!gerente) return null;

  const toggleTecnico = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.modalHeaderRed}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalHeaderTitle}>Editar Gerente</Text>
            <Text style={styles.modalHeaderSub}>Atualize as informações do gerente</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => {}}>
            <Feather name="trash-2" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, marginTop: 2 }}>Excluir</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.formSectionTitle}>Informações do Gerente</Text>
          
          <View style={[styles.avatar, { marginBottom: 20 }]}>
            <Text style={styles.avatarText}>{(nome || 'GE').substring(0, 2).toUpperCase()}</Text>
            <View style={styles.camIcon}>
              <Feather name="camera" size={12} color="#64748b" />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome completo *</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome} />
            </View>
            <View style={[styles.formGroup, { flex: 0.6 }]}>
              <Text style={styles.label}>Função</Text>
              <View style={styles.inputDisabled}>
                <Text style={styles.inputText}>Gerente</Text>
                <Feather name="chevron-down" size={16} color="#64748b" />
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Telefone *</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="phone" size={16} color="#64748b" />
                <TextInput style={styles.inputNoBorder} value={telefone} onChangeText={setTelefone} />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>E-mail *</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="mail" size={16} color="#64748b" />
                <TextInput style={styles.inputNoBorder} value={email} onChangeText={setEmail} />
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Status *</Text>
              <View style={styles.inputWithIcon}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a', marginRight: 8 }} />
                <Text style={[styles.inputText, { flex: 1 }]}>Ativo</Text>
                <Feather name="chevron-down" size={16} color="#64748b" />
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Data de início</Text>
              <View style={styles.inputWithIcon}>
                <Feather name="calendar" size={16} color="#64748b" />
                <TextInput style={styles.inputNoBorder} value={dataInicio} onChangeText={setDataInicio} />
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Observações</Text>
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder="Adicione observações (opcional)"
              multiline 
              value={observacoes} 
              onChangeText={setObservacoes} 
            />
            <Text style={styles.charCount}>0/200</Text>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.formSectionTitle}>Técnicos da Equipe</Text>
              <Text style={styles.sectionSubtitle}>Selecione os técnicos que fazem parte da equipe deste gerente.</Text>
            </View>
            <TouchableOpacity style={styles.btnAddTecnico}>
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.btnAddTecnicoText}>Adicionar técnico</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tecListContainer}>
            {allTecnicos.map(tec => {
              const checked = selectedIds.includes(tec.id);
              return (
                <TouchableOpacity key={tec.id} style={styles.tecCheckItem} onPress={() => toggleTecnico(tec.id)} activeOpacity={0.8}>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Feather name="check" size={14} color="#fff" />}
                  </View>
                  <View style={styles.tecCheckAvatar}>
                    <Feather name="user" size={16} color="#64748b" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tecCheckName}>{tec.nome}</Text>
                    <Text style={styles.tecCheckPhone}>{tec.telefone}</Text>
                  </View>
                  <View style={styles.badgeAtivo}>
                    <Text style={styles.badgeAtivoText}>Ativo</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tipCard}>
            <Feather name="info" size={20} color="#2563eb" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.tipTitle}>Dica</Text>
              <Text style={styles.tipText}>Você pode adicionar ou remover técnicos da equipe a qualquer momento.</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
        
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.btnCancelFooter} onPress={onClose}>
            <Text style={styles.btnCancelFooterText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.btnSaveFooter} 
            onPress={() => onSave({ nome, telefone, email, status, dataInicio, observacoes }, selectedIds)}
          >
            <Feather name="save" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.btnSaveFooterText}>Salvar alterações</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// --- STYLES ---
const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  modalSafeArea: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeaderRed: { backgroundColor: '#7A1A1A', paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  backBtn: { padding: 8, marginRight: 8, alignItems: 'center' },
  modalHeaderTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter-Bold' },
  modalHeaderSub: { color: '#f1f5f9', fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  modalContent: { padding: 16 },
  
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, paddingHorizontal: 16 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sheetItemTexts: { flex: 1, marginLeft: 16 },
  sheetItemTitle: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#1e293b' },
  sheetItemSub: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#64748b', marginTop: 2 },
  sheetBtnCancel: { backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  sheetBtnCancelText: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#1e293b' },

  summaryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 16, marginBottom: 16 },
  summaryAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7A1A1A', justifyContent: 'center', alignItems: 'center' },
  summaryAvatarLetter: { color: '#fff', fontSize: 24, fontFamily: 'Inter-Bold' },
  shieldIcon: { position: 'absolute', bottom: 0, right: -4, backgroundColor: '#7A1A1A', borderRadius: 10, padding: 2, borderWidth: 2, borderColor: '#fff' },
  summaryInfo: { flex: 1, marginLeft: 16 },
  summaryName: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b' },
  badgeGerente: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeGerenteText: { color: '#ef4444', fontSize: 10, fontFamily: 'Inter-Medium' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  infoText: { fontSize: 13, color: '#64748b', marginLeft: 6, fontFamily: 'Inter-Regular' },
  btnEditOutlineFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7A1A1A',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  btnEditOutlineTextFull: {
    color: '#7A1A1A',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  
  summaryFooter: { flexDirection: 'row' },
  summaryMetric: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  metricValue: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#1e293b' },
  metricLabel: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#64748b' },
  divider: { width: 1, backgroundColor: '#e2e8f0', marginHorizontal: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b' },
  btnAddTecnico: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7A1A1A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnAddTecnicoText: { color: '#fff', fontSize: 12, fontFamily: 'Inter-Medium', marginLeft: 6 },

  tecCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12, overflow: 'hidden' },
  tecCardTop: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  tecAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  tecInfo: { flex: 1, marginLeft: 16 },
  tecName: { fontSize: 16, fontFamily: 'Inter-Medium', color: '#1e293b' },
  badgeAtivo: { backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
  badgeAtivoText: { color: '#16a34a', fontSize: 10, fontFamily: 'Inter-Medium' },
  tecSubText: { fontSize: 13, color: '#64748b', marginLeft: 6, fontFamily: 'Inter-Regular' },
  tecCardFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 12, backgroundColor: '#fafaf9' },
  tecMetric: { flex: 1, alignItems: 'center' },
  tecMetricVal: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#1e293b' },
  tecMetricLbl: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#64748b' },

  tipCard: { backgroundColor: '#eff6ff', borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginTop: 16 },
  tipTitle: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#1d4ed8', marginBottom: 4 },
  tipText: { fontSize: 13, fontFamily: 'Inter-Regular', color: '#1e3a8a', lineHeight: 20 },

  formSectionTitle: { fontSize: 16, fontFamily: 'Inter-Bold', color: '#1e293b', marginBottom: 16 },
  sectionSubtitle: { fontSize: 13, color: '#64748b', fontFamily: 'Inter-Regular', marginTop: 2, marginBottom: 8 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#7A1A1A', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 24, fontFamily: 'Inter-Bold' },
  camIcon: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  formGroup: { flex: 1 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#475569', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14, fontFamily: 'Inter-Regular', color: '#1e293b' },
  inputDisabled: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { fontSize: 14, fontFamily: 'Inter-Regular', color: '#1e293b' },
  inputWithIcon: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, height: 44, flexDirection: 'row', alignItems: 'center' },
  inputNoBorder: { flex: 1, marginLeft: 8, fontSize: 14, fontFamily: 'Inter-Regular', color: '#1e293b' },
  charCount: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#94a3b8', textAlign: 'right', marginTop: 4 },

  tecListContainer: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  tecCheckItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#7A1A1A', borderColor: '#7A1A1A' },
  tecCheckAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tecCheckName: { fontSize: 14, fontFamily: 'Inter-Medium', color: '#1e293b' },
  tecCheckPhone: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#64748b', marginTop: 2 },

  bottomBar: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  btnCancelFooter: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#7A1A1A', alignItems: 'center', marginRight: 8 },
  btnCancelFooterText: { color: '#7A1A1A', fontSize: 14, fontFamily: 'Inter-Medium' },
  btnSaveFooter: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#7A1A1A', alignItems: 'center', marginLeft: 8, flexDirection: 'row', justifyContent: 'center' },
  btnSaveFooterText: { color: '#fff', fontSize: 14, fontFamily: 'Inter-Medium' },
});

const localStatusColors: Record<string, string> = {
  aguardando: '#3b82f6',
  atribuido: '#f59e0b',
  concluido: '#22c55e',
  nao_realizado: '#ef4444',
};

const localStatusLabels: Record<string, string> = {
  aguardando: 'Aguardando',
  atribuido: 'Atribuído',
  concluido: 'Concluido',
  nao_realizado: 'Não Realizado',
};

type HistoryModalProps = {
  visible: boolean;
  gerente: AdminGerenteUser | null;
  tecnicos: AdminTecnicoUser[];
  onClose: () => void;
};

export function GerenteHistoryModal({ visible, gerente, tecnicos, onClose }: HistoryModalProps) {
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && gerente) {
      setLoading(true);
      fetchAdminServicesAllFromApi()
        .then(data => {
          const teamTecnicosNames = tecnicos
            .filter(t => t.gerenteId === gerente.id)
            .map(t => String(t.nome || '').trim().toLowerCase());

          const filtered = data.filter(s => {
            const serviceTecName = String(s.tecnico || '').trim().toLowerCase();
            return teamTecnicosNames.includes(serviceTecName);
          });
          setServices(filtered);
        })
        .catch(err => console.warn('Erro ao carregar histórico da equipe:', err))
        .finally(() => setLoading(false));
    } else {
      setServices([]);
    }
  }, [visible, gerente, tecnicos]);

  if (!gerente) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.modalHeaderRed}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalHeaderTitle}>Histórico da Equipe</Text>
            <Text style={styles.modalHeaderSub}>Serviços realizados pela equipe de {gerente.nome}</Text>
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
            <ActivityIndicator size="large" color="#7A1A1A" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalContent}>
            {services.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Feather name="clock" size={48} color="#cbd5e1" />
                <Text style={{ marginTop: 16, color: '#64748b', fontSize: 16, textAlign: 'center', fontFamily: 'Inter-Medium' }}>
                  Nenhum serviço no histórico desta equipe.
                </Text>
              </View>
            ) : (
              services.map(item => {
                const statusColor = localStatusColors[item.status] || '#cbd5e1';
                const statusLabel = localStatusLabels[item.status] || 'Desconhecido';
                return (
                  <View 
                    key={item.id} 
                    style={[
                      styles.tecCard, 
                      { 
                        borderLeftWidth: 4, 
                        borderLeftColor: statusColor, 
                        paddingBottom: 14 
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tecName}>{item.numeroPedido}</Text>
                        <Text style={{ fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#334155', marginTop: 2 }}>
                          Téc: {item.tecnico}
                        </Text>
                      </View>
                      <View style={[styles.badgeAtivo, { backgroundColor: statusColor + '15' }]}>
                        <Text style={[styles.badgeAtivoText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 14, color: '#475569', marginBottom: 4, fontFamily: 'Inter-Medium' }}>
                      {item.descricao}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontFamily: 'Inter-Regular' }}>
                      {item.cliente}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Feather name="map-pin" size={14} color="#64748b" />
                      <Text style={{ fontSize: 12, color: '#64748b', flex: 1 }} numberOfLines={1}>
                        {item.endereco}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Feather name="calendar" size={14} color="#64748b" />
                      <Text style={{ fontSize: 12, color: '#64748b' }}>
                        {item.data} • {item.hora}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

