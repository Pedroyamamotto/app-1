import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '../../components/shared/AppHeader';
import { AdminServiceData, buildTechniciansFromServices, fetchAdminServicesAllFromApi, fetchAdminTecnicosFromApi, formatTimeDuration } from '../../components/shared/admin/adminApi';
import { useUser } from '../../context/UserContext';
import { statusBadgeColorByCode, statusLabelByCode } from '../adm/components/constants';
import { formatOrdemServicoLabel, formatPedidoLabel } from '../adm/components/utils';
import { cleanText } from '../../utils/platformUtils';

export default function MinhaEquipeScreen() {
  const navigation = useNavigation();
  const { user } = useUser();
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Controle de expansão (mostrar todas as OS do técnico ou só as 3 primeiras)
  const [expandedTecs, setExpandedTecs] = useState<Record<string, boolean>>({});
  // Controle do accordion de cada técnico
  const [collapsedTecs, setCollapsedTecs] = useState<Record<string, boolean>>({});
  const [searchText, setSearchText] = useState('');

  const loadData = useCallback(async () => {
    const userId = user?.userId || user?._id || user?.id;
    if (!userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const typeUser = String(user?.typeUser || '').toLowerCase();
      let data: AdminServiceData[] = [];
      
      if (typeUser === 'admin') {
        data = await fetchAdminServicesAllFromApi();
      } else {
        const [allServicos, tecnicos] = await Promise.all([
          fetchAdminServicesAllFromApi(),
          fetchAdminTecnicosFromApi()
        ]);
        const userId = user?.userId || user?.id || '';
        const minhaEquipeTecnicos = tecnicos.filter(t => String(t.gerenteId) === userId);
        const nomesTecnicos = minhaEquipeTecnicos.map(t => t.nome);
        data = allServicos.filter(s => s.tecnico && nomesTecnicos.includes(s.tecnico));
      }
      
      setServices(data);
    } catch (e) {
      console.warn('Erro ao carregar equipe:', e);
      setError('Não foi possível carregar os serviços da equipe.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const toggleExpand = (tecId: string) => {
    setExpandedTecs(prev => ({ ...prev, [tecId]: !prev[tecId] }));
  };

  const toggleCollapse = (tecId: string) => {
    setCollapsedTecs(prev => ({ ...prev, [tecId]: !prev[tecId] }));
  };

  // Estatísticas gerais da equipe
  const stats = useMemo(() => {
    let total = 0, abertos = 0, andamento = 0, concluidos = 0;
    services.forEach(s => {
      total++;
      if (s.status === 'aguardando') abertos++;
      else if (s.status === 'atribuido') andamento++;
      else if (s.status === 'concluido') concluidos++;
    });
    return { total, abertos, andamento, concluidos };
  }, [services]);

  // Agrupar serviços por técnico
  const groupedTecs = useMemo(() => {
    const tecStats = buildTechniciansFromServices(services);
    
    // Filtrar pelo search
    let filteredServices = services;
    if (searchText) {
      const lower = searchText.toLowerCase();
      filteredServices = services.filter(s => 
        (s.cliente && s.cliente.toLowerCase().includes(lower)) ||
        (s.endereco && s.endereco.toLowerCase().includes(lower)) ||
        (s.tecnico && s.tecnico.toLowerCase().includes(lower))
      );
    }

    const groupedMap = new Map<string, { nome: string, initials: string, servicos: AdminServiceData[], tempoMedioMs?: number }>();
    
    filteredServices.forEach(s => {
      const nome = s.tecnico && s.tecnico !== 'Nao atribuido' ? s.tecnico : 'Sem técnico';
      if (!groupedMap.has(nome)) {
        const initialsMatch = nome.match(/\b\w/g);
        const initials = initialsMatch ? (initialsMatch[0] + (initialsMatch[1] || '')).toUpperCase() : 'NA';
        const stats = tecStats.find(t => t.nome === nome);
        groupedMap.set(nome, { nome, initials, servicos: [], tempoMedioMs: stats?.tempoMedioMs || 0 });
      }
      groupedMap.get(nome)!.servicos.push(s);
    });

    return Array.from(groupedMap.values()).sort((a, b) => b.servicos.length - a.servicos.length);
  }, [services, searchText]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <AppHeader title="Minha Equipe" subtitle="Serviços dos técnicos sob sua gestão" />

      <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={styles.content}>
        
        {/* Cards de Resumo */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={24} color="#ef4444" />
              <Text style={styles.statValue}>{stats.total}</Text>
            </View>
            <Text style={styles.statLabelTotal}>Total</Text>
            <Text style={styles.statSubLabel}>serviços</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="history" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{stats.abertos}</Text>
            </View>
            <Text style={styles.statLabel}>Em aberto</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{stats.andamento}</Text>
            </View>
            <Text style={styles.statLabel}>Em andamento</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statIconRow}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#22c55e" />
              <Text style={styles.statValue}>{stats.concluidos}</Text>
            </View>
            <Text style={styles.statLabel}>Concluídos</Text>
          </View>
        </View>

        {/* Busca e Filtro */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Feather name="search" size={20} color="#94a3b8" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar por cliente, endereço ou técnico"
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="filter" size={20} color="#334155" />
            <Text style={styles.filterBtnText}>Filtrar</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={{ padding: 16, backgroundColor: '#fee2e2', borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#ef4444' }}>{error}</Text>
          </View>
        )}

        {/* Listagem de Técnicos em Accordion */}
        {groupedTecs.map((tec) => {
          const isCollapsed = collapsedTecs[tec.nome] || false;
          const isExpanded = expandedTecs[tec.nome] || false;
          
          // Se não estiver expandido, mostra só as 3 primeiras OS
          const visibleServices = isExpanded ? tec.servicos : tec.servicos.slice(0, 3);
          const hasMore = tec.servicos.length > 3;

          return (
            <View key={tec.nome} style={styles.tecAccordion}>
              <TouchableOpacity style={styles.tecHeader} activeOpacity={0.7} onPress={() => toggleCollapse(tec.nome)}>
                <View style={styles.tecHeaderLeft}>
                  <View style={styles.tecAvatar}>
                    <Text style={styles.tecAvatarText}>{tec.initials}</Text>
                  </View>
                  <View>
                    <Text style={styles.tecName}>{tec.nome}</Text>
                    <Text style={styles.tecServicesCount}>{tec.servicos.length} serviços • T. Médio: {formatTimeDuration(tec.tempoMedioMs)}</Text>
                  </View>
                </View>
                <Feather name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={24} color="#64748b" />
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={styles.tecContent}>
                  {visibleServices.map(item => {
                    const statusColor = (statusBadgeColorByCode as any)[item.status] || '#d1d5db';
                    const statusLabel = (statusLabelByCode as any)[item.status] || 'Desconhecido';
                    
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.serviceCard, { borderLeftColor: statusColor }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          (navigation as any).navigate('GerServiceDetail', { id: item.id });
                        }}
                      >
                        <View style={styles.serviceRow}>
                          <View style={styles.serviceIconCol}>
                            {item.status === 'concluido' ? (
                              <Feather name="check-circle" size={20} color="#22c55e" />
                            ) : item.status === 'aguardando' ? (
                              <Feather name="clock" size={20} color="#3b82f6" />
                            ) : (
                              <Feather name="pie-chart" size={20} color="#f59e0b" />
                            )}
                          </View>
                          <View style={styles.serviceDetailsCol}>
                            <Text style={styles.serviceId}>{formatPedidoLabel(item.numeroPedido)}</Text>
                            <Text style={styles.serviceDesc} numberOfLines={1}>{cleanText(item.descricao)}</Text>
                            <Text style={styles.serviceAddress} numberOfLines={1}>{cleanText(item.endereco)}</Text>
                          </View>
                          <View style={styles.serviceRightCol}>
                            <View style={[styles.serviceBadge, { backgroundColor: statusColor + '15' }]}>
                              <Text style={[styles.serviceBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                            </View>
                            <Text style={styles.serviceDate}>{item.data} • {item.hora}</Text>
                          </View>
                          <Feather name="chevron-right" size={20} color="#cbd5e1" style={{ alignSelf: 'center', marginLeft: 8 }} />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  
                  {hasMore && !isExpanded && (
                    <TouchableOpacity style={styles.seeMoreBtn} onPress={() => toggleExpand(tec.nome)}>
                      <Text style={styles.seeMoreText}>Ver mais {tec.servicos.length - 3} serviços</Text>
                    </TouchableOpacity>
                  )}
                  {hasMore && isExpanded && (
                    <TouchableOpacity style={styles.seeMoreBtn} onPress={() => toggleExpand(tec.nome)}>
                      <Text style={styles.seeMoreText}>Mostrar menos</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {services.length === 0 && !isLoading && !error && (
          <View style={{ padding: 32, alignItems: 'center' }}>
            <Feather name="inbox" size={48} color="#cbd5e1" />
            <Text style={{ marginTop: 16, color: '#64748b', fontSize: 16, fontFamily: 'Inter-Medium' }}>
              Nenhum serviço encontrado.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7A1A1A' },
  content: { padding: 16, paddingBottom: 100, backgroundColor: '#f8fafc', flexGrow: 1 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginHorizontal: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontFamily: 'Inter-Bold', color: '#1e293b', marginLeft: 4 },
  statLabelTotal: { fontSize: 10, fontFamily: 'Inter-Bold', color: '#1e293b', textAlign: 'center' },
  statLabel: { fontSize: 10, fontFamily: 'Inter-Bold', color: '#64748b', textAlign: 'center' },
  statSubLabel: { fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 2 },

  searchRow: { flexDirection: 'row', marginBottom: 24 },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: { flex: 1, height: 44, marginLeft: 8, color: '#334155' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnText: { color: '#334155', marginLeft: 8, fontFamily: 'Inter-Medium' },

  tecAccordion: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
  },
  tecHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tecHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  tecAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#fce7f3',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  tecAvatarText: { color: '#be185d', fontFamily: 'Inter-Bold', fontSize: 14 },
  tecName: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#1e293b' },
  tecServicesCount: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  tecContent: { padding: 12, backgroundColor: '#fff' },
  
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderLeftWidth: 4,
  },
  serviceRow: { flexDirection: 'row', flex: 1, paddingLeft: 12 },
  serviceIconCol: { justifyContent: 'flex-start', paddingTop: 2, marginRight: 12 },
  serviceDetailsCol: { flex: 1, justifyContent: 'center' },
  serviceId: { fontSize: 14, fontFamily: 'Inter-Bold', color: '#1e293b' },
  serviceDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
  serviceAddress: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  
  serviceRightCol: { alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 8 },
  serviceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  serviceBadgeText: { fontSize: 10, fontFamily: 'Inter-SemiBold' },
  serviceDate: { fontSize: 11, color: '#64748b' },

  seeMoreBtn: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  seeMoreText: { color: '#3b82f6', fontFamily: 'Inter-Medium', fontSize: 13 },
});
