import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminHeader from '../../components/shared/admin/AdminHeader';
import AdminOverviewCard from '../../components/shared/admin/AdminOverviewCard';
import { buildTechniciansFromServices, fetchAdminDashboardFromApi, fetchAdminServicesFromApi, fetchAdminTecnicosFromApi, type AdminDashboardData, type AdminServiceData, type AdminTecnicoUser } from '../../components/shared/admin/adminApi';

const normalizeId = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const objectIdMatch = raw.match(/ObjectId\(['\"]?([a-fA-F0-9]{24})['\"]?\)/i);
  return (objectIdMatch ? objectIdMatch[1] : raw).toLowerCase();
};

const normalizeName = (value: unknown) => String(value || '').trim().toLowerCase();

export default function AdmRelatoriosScreen() {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [tecnicos, setTecnicos] = useState<AdminTecnicoUser[]>([]);
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRelatorios = useCallback(async () => {
    try {
      const [nextDashboard, nextTecnicos, nextServices] = await Promise.all([
        fetchAdminDashboardFromApi(),
        fetchAdminTecnicosFromApi(),
        fetchAdminServicesFromApi(),
      ]);
      setDashboard(nextDashboard);
      setTecnicos(nextTecnicos);
      setServices(nextServices);
      setLoadError(null);
    } catch (error) {
      console.warn('Erro ao carregar relatorios admin:', error);
      setLoadError(error instanceof Error ? error.message : 'Nao foi possivel carregar os relatorios da API admin.');
      setDashboard(null);
      setTecnicos([]);
      setServices([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRelatorios();
      const intervalId = setInterval(() => {
        loadRelatorios();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadRelatorios])
  );

  const resumo = useMemo(() => {
    return {
      aguardando: dashboard?.resumo.aguardando || 0,
      atribuidos: dashboard?.resumo.atribuidos || 0,
      concluidos: dashboard?.resumo.concluidos || 0,
      naoRealizados: dashboard?.resumo.nao_realizados || 0,
      total: dashboard?.resumo.total || 0,
      taxaConclusao: dashboard?.resumo.taxa_conclusao || 0,
      tecnicosAtivos: dashboard?.resumo.tecnicos_ativos || 0,
    };
  }, [dashboard]);

  const indicadores = useMemo(() => {
    return [
      { titulo: 'Taxa de Conclusao', valor: `${resumo.taxaConclusao}%`, detalhe: `${resumo.concluidos} pedidos concluidos no total` },
      { titulo: 'Tecnicos Ativos', valor: String(resumo.tecnicosAtivos), detalhe: 'tecnicos com atendimento em aberto' },
      { titulo: 'Nao Realizados', valor: String(resumo.naoRealizados), detalhe: 'pedidos marcados como nao realizados' },
      { titulo: 'Pedidos Totais', valor: String(resumo.total), detalhe: 'servicos retornados pela API' },
    ];
  }, [resumo]);

  const tecnicosById = useMemo(() => {
    const map = new Map<string, string>();
    tecnicos.forEach((tecnico) => {
      const id = normalizeId(tecnico.id);
      const nome = String(tecnico.nome || '').trim();
      if (id && nome) map.set(id, nome);
    });
    return map;
  }, [tecnicos]);

  const tecnicosConsolidados = useMemo(() => {
    const fromServices = buildTechniciansFromServices(services);
    const serviceStatsById = new Map(
      fromServices
        .map((item) => [normalizeId(item.id), item] as const)
        .filter(([id]) => Boolean(id))
    );
    const serviceStatsByName = new Map(
      fromServices.map((item) => [normalizeName(item.nome), item] as const)
    );

    const merged = tecnicos.map((tecnico) => {
      const statsById = serviceStatsById.get(normalizeId(tecnico.id));
      const statsByName = serviceStatsByName.get(normalizeName(tecnico.nome));
      const stats = statsById || statsByName;

      return {
        id: normalizeId(tecnico.id) || normalizeName(tecnico.nome),
        nome: tecnico.nome,
        concluidos: stats?.concluidos || 0,
        andamento: stats?.ativos || 0,
      };
    });

    const semCadastro = fromServices
      .filter((item) => {
        const id = normalizeId(item.id);
        const nome = normalizeName(item.nome);
        return !merged.some((tecnico) => tecnico.id === id || normalizeName(tecnico.nome) === nome);
      })
      .map((item) => ({
        id: normalizeId(item.id) || normalizeName(item.nome),
        nome: item.nome,
        concluidos: item.concluidos,
        andamento: item.ativos,
      }));

    const combined = [...merged, ...semCadastro];
    return combined.filter((item, index, array) => {
      return array.findIndex((candidate) => candidate.id === item.id) === index;
    });
  }, [services, tecnicos]);

  const desempenho = useMemo(() => {
    if (tecnicosConsolidados.length > 0) {
      return tecnicosConsolidados
        .filter((item) => item.nome && !/^nao atribuido$/i.test(item.nome))
        .sort((a, b) => b.andamento - a.andamento);
    }

    return (dashboard?.desempenho_tecnicos || []).map((tecnico) => ({
      id: tecnico.tecnico_id,
      nome: (() => {
        const nomeApi = String(tecnico.nome || '').trim();
        const nomePorId = tecnicosById.get(normalizeId(tecnico.tecnico_id)) || '';
        const nomeInvalido = !nomeApi || /^desconhecido$/i.test(nomeApi);
        return nomeInvalido ? (nomePorId || 'Desconhecido') : nomeApi;
      })(),
      concluidos: tecnico.concluidos,
      andamento: tecnico.pendentes,
    }));
  }, [dashboard, tecnicosById, tecnicosConsolidados]);

  return (
    <SafeAreaView style={styles.container}>
      <AdminHeader />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <AdminOverviewCard
          title="Resumo de Relatorios"
          stats={[
            { label: 'Aguardando', value: resumo.aguardando, tone: 'pending' },
            { label: 'Atribuidos', value: resumo.atribuidos, tone: 'assigned' },
            { label: 'Concluidos', value: resumo.concluidos, tone: 'finished' },
            { label: 'Total', value: resumo.total, tone: 'total' },
          ]}
        />

        <View style={styles.kpiGrid}>
          {indicadores.map((item) => (
            <View key={item.titulo} style={styles.kpiCard}>
              <Text style={styles.kpiTitle}>{item.titulo}</Text>
              <Text style={styles.kpiValue}>{item.valor}</Text>
              <Text style={styles.kpiDetail}>{item.detalhe}</Text>
            </View>
          ))}
        </View>

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Desempenho por Tecnico</Text>
          {desempenho.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum tecnico encontrado a partir dos servicos da API.</Text>
          ) : (
            desempenho.map((item, index) => (
              <View key={`${item.id || 'tecnico'}-${item.nome}-${index}`} style={styles.rowItem}>
                <View>
                  <Text style={styles.rowName}>{item.nome}</Text>
                  <Text style={styles.rowMeta}>{item.andamento} em andamento</Text>
                </View>
                <View style={styles.rowBadge}>
                  <Text style={styles.rowBadgeValue}>{item.concluidos}</Text>
                  <Text style={styles.rowBadgeLabel}>Concluidos</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  kpiTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  kpiDetail: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  errorText: {
    marginBottom: 12,
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f6',
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  rowMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  rowBadge: {
    minWidth: 84,
    borderRadius: 12,
    backgroundColor: '#dbe9f8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  rowBadgeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2563eb',
  },
  rowBadgeLabel: {
    fontSize: 11,
    color: '#475569',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
});
