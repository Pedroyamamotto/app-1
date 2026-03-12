import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { buildTechniciansFromServices, fetchAdminServicesFromApi, fetchAdminTecnicosFromApi, type AdminTechnicianData } from '../../components/shared/admin/adminApi';
import AdminHeader from '../../components/shared/admin/AdminHeader';
import AdminOverviewCard from '../../components/shared/admin/AdminOverviewCard';
import { formatLockDisplayName } from '../../constants/serviceDisplay';

type Tecnico = AdminTechnicianData;

const TECNICOS: Tecnico[] = [
  {
    id: '1',
    nome: 'Joao Silva',
    email: 'joao@yamamotto.com.br',
    telefone: '(11) 98765-2101',
    cpf: '123.456.789-10',
    area: 'Instalacao e manutencao',
    cidadeBase: 'Sao Paulo - SP',
    especialidade: 'Fechaduras digitais residenciais e comerciais',
    disponibilidade: 'Disponivel ate 18:00',
    total: 2,
    ativos: 1,
    concluidos: 0,
    avaliacao: '4.8',
    observacoes: 'Tecnico senior com foco em instalacao premium e configuracao avancada.',
    atendimentos: [
      { id: 'a1', cliente: 'Carlos Eduardo Mendes', servico: 'Instalacao YM-500', status: 'Em andamento', data: '12/03/26', hora: '10:30' },
      { id: 'a2', cliente: 'Aline Prado', servico: 'Visita tecnica preventiva', status: 'Aguardando', data: '12/03/26', hora: '15:00' },
    ],
  },
  {
    id: '2',
    nome: 'Maria Santos',
    email: 'maria@yamamotto.com.br',
    telefone: '(11) 98765-2102',
    cpf: '234.567.890-11',
    area: 'Suporte e manutencao',
    cidadeBase: 'Sao Paulo - SP',
    especialidade: 'Reprogramacao, sensores e diagnostico de falhas',
    disponibilidade: 'Em rota para atendimento',
    total: 2,
    ativos: 1,
    concluidos: 1,
    avaliacao: '4.9',
    observacoes: 'Excelente taxa de resolucao na primeira visita.',
    atendimentos: [
      { id: 'a3', cliente: 'Mariana Costa', servico: 'Reprogramacao YM-700', status: 'Em andamento', data: '12/03/26', hora: '14:20' },
      { id: 'a4', cliente: 'Ricardo Nogueira', servico: 'Troca de modulo', status: 'Concluido', data: '11/03/26', hora: '16:10' },
    ],
  },
  {
    id: '3',
    nome: 'Pedro Costa',
    email: 'pedro@yamamotto.com.br',
    telefone: '(11) 98765-2103',
    cpf: '345.678.901-22',
    area: 'Campo e instalacao',
    cidadeBase: 'Osasco - SP',
    especialidade: 'Sensores, modulos e kits corporativos',
    disponibilidade: 'Disponivel para novo chamado',
    total: 2,
    ativos: 1,
    concluidos: 1,
    avaliacao: '4.7',
    observacoes: 'Atua em regioes metropolitanas com foco em contratos empresariais.',
    atendimentos: [
      { id: 'a5', cliente: 'Paulo Ricardo', servico: 'Ajuste de sensores YM-900', status: 'Concluido', data: '11/03/26', hora: '16:10' },
      { id: 'a6', cliente: 'Condominio Alpha', servico: 'Instalacao de kit corporativo', status: 'Em andamento', data: '12/03/26', hora: '13:30' },
    ],
  },
  {
    id: '4',
    nome: 'Ana Rodrigues',
    email: 'ana@yamamotto.com.br',
    telefone: '(11) 98765-2104',
    cpf: '456.789.012-33',
    area: 'Pos-venda',
    cidadeBase: 'Barueri - SP',
    especialidade: 'Checklists finais e orientacao ao cliente',
    disponibilidade: 'Encerrado expediente de hoje',
    total: 1,
    ativos: 0,
    concluidos: 1,
    avaliacao: '4.9',
    observacoes: 'Responsavel por validacao final e acompanhamento do cliente.',
    atendimentos: [
      { id: 'a7', cliente: 'Fernanda Alves', servico: 'Validacao pos-instalacao YM-450', status: 'Concluido', data: '12/03/26', hora: '09:00' },
    ],
  },
];

export default function AdmTecnicosScreen() {
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(TECNICOS);
  const [overview, setOverview] = useState({ aguardando: 3, atribuidos: 2, concluidos: 1, total: TECNICOS.reduce((sum, t) => sum + t.total, 0) });

  const loadTecnicos = useCallback(async () => {
    try {
      const [services, tecnicoUsers] = await Promise.all([
        fetchAdminServicesFromApi(),
        fetchAdminTecnicosFromApi(),
      ]);

      const fromServices = buildTechniciansFromServices(services);
      const serviceStatsByName = new Map(fromServices.map((item) => [item.nome, item]));

      const merged = tecnicoUsers.map((tecnico) => {
        const stats = serviceStatsByName.get(tecnico.nome);
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
          observacoes: stats?.observacoes || 'Cadastro retornado pela API administrativa.',
          atendimentos: stats?.atendimentos || [],
        } satisfies Tecnico;
      });

      const semCadastro = fromServices.filter(
        (item) => !tecnicoUsers.some((tecnico) => tecnico.nome === item.nome)
      );

      setTecnicos([...merged, ...semCadastro]);
      setOverview({
        aguardando: services.filter((service) => service.status === 'aguardando').length,
        atribuidos: services.filter((service) => service.status === 'atribuido').length,
        concluidos: services.filter((service) => service.status === 'concluido').length,
        total: services.length,
      });
    } catch (error) {
      console.warn('Erro ao carregar tecnicos admin:', error);
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

  const totalAguardando = overview.aguardando;
  const totalAtribuidos = overview.atribuidos;
  const totalConcluidos = overview.concluidos;
  const totalGeral = overview.total;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
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

        {/* Cards dos tecnicos */}
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
            </View>
          </TouchableOpacity>
        ))}

        {tecnicos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum tecnico encontrado</Text>
            <Text style={styles.emptySubtitle}>A API ainda nao retornou servicos com tecnico atribuido.</Text>
          </View>
        ) : null}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={selectedTecnico !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedTecnico(null)}
      >
        {selectedTecnico ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

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
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Observacoes</Text>
                <Text style={styles.notesText}>{selectedTecnico.observacoes}</Text>
              </View>

              <View style={styles.detailCard}>
                <Text style={styles.detailSectionTitle}>Atendimentos</Text>
                {selectedTecnico.atendimentos.map((item) => (
                  <View key={item.id} style={styles.serviceRow}>
                    <View style={styles.serviceRowTop}>
                      <Text style={styles.serviceClient}>{item.cliente}</Text>
                      <Text style={[
                        styles.serviceBadge,
                        item.status === 'Concluido' ? styles.serviceBadgeBlue : item.status === 'Em andamento' ? styles.serviceBadgeGreen : styles.serviceBadgeYellow,
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                    <Text style={styles.serviceDescription}>{formatLockDisplayName(item.servico)}</Text>
                    <Text style={styles.serviceMeta}>{item.data} as {item.hora}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.closeDetailButton}
                activeOpacity={0.9}
                onPress={() => setSelectedTecnico(null)}
              >
                <Text style={styles.closeDetailButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
    marginTop: -4,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140,
  },
  tecCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
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
});
