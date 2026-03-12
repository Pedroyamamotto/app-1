import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { assignAdminService, fetchAdminServicesFromApi, fetchAdminTecnicosFromApi, type AdminServiceData, type AdminTecnicoUser } from '../../components/shared/admin/adminApi';
import AdminHeader from '../../components/shared/admin/AdminHeader';
import AdminOverviewCard from '../../components/shared/admin/AdminOverviewCard';
import { formatLockDisplayName } from '../../constants/serviceDisplay';

type AdminService = AdminServiceData;

type FilterState = {
  status: string;
  tecnico: string;
  periodo: string;
};

type NewServiceForm = {
  nomeCompleto: string;
  telefone: string;
  cep: string;
  email: string;
  endereco: string;
  observacoes: string;
  descricao: string;
  tecnicoResponsavel: string;
  dataHoraVisita: string;
};

type DropdownKey = 'status' | 'tecnico' | 'periodo' | null;

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

type ServiceDetail = Omit<AdminService, 'checklist'> & {
  horaConclusao: string;
  checklist: ChecklistItem[];
  fotoUri: string;
  assinadoPor: string;
};

type NaoRealizadoDetail = AdminService & {
  motivoCompleto: string;
};

type ReagendarForm = {
  tecnicoId: string;
  data: string;
  hora: string;
};

const normalizeSearchValue = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const MOCK_CHECKLIST: ChecklistItem[] = [
  { id: 'c1', label: 'Instalacao da fechadura digital concluida', done: true },
  { id: 'c2', label: 'Configuracao e cadastro de senhas/digitais realizado', done: true },
  { id: 'c3', label: 'Teste de abertura com digital/senha/cartao aprovado', done: true },
  { id: 'c4', label: 'Verificacao de bateria e autonomia', done: true },
  { id: 'c5', label: 'Teste de travamento automatico funcionando', done: true },
  { id: 'c6', label: 'Orientacao ao cliente sobre uso e manutencao', done: true },
  { id: 'c7', label: 'Sincronizacao com aplicativo (se aplicavel)', done: false },
  { id: 'c8', label: 'Entrega de cartoes/chaves extras e manual', done: true },
  { id: 'c9', label: 'Limpeza do local de instalacao', done: true },
];

const DEFAULT_FILTERS: FilterState = {
  status: 'Todos os Status',
  tecnico: 'Todos os Tecnicos',
  periodo: 'Todos os Periodos',
};

const STATUS_OPTIONS = [
  'Todos os Status',
  'Aguardando Atribuicao',
  'Atribuidos',
  'Concluidos',
  'Nao Realizados',
];

const PERIODO_OPTIONS = [
  'Todos os Periodos',
  'Hoje',
  'Esta Semana',
  'Este Mes',
];

const ASSIGN_OPTIONS = ['Selecionar depois', 'Joao Silva', 'Maria Santos', 'Pedro Costa', 'Ana Rodrigues'];

const DEFAULT_NEW_SERVICE_FORM: NewServiceForm = {
  nomeCompleto: '',
  telefone: '',
  cep: '',
  email: '',
  endereco: '',
  observacoes: '',
  descricao: '',
  tecnicoResponsavel: 'Selecionar depois',
  dataHoraVisita: '',
};

const mockServices: AdminService[] = [
  {
    id: '1',
    numeroPedido: 'BLING-10234',
    descricao: 'Instalacao de Fechadura Digital Yamamotto YM-500',
    cliente: 'Carlos Eduardo Mendes',
    tecnico: 'Joao Silva',
    endereco: 'Av. Paulista, 1578 - Bela Vista, Sao Paulo - SP',
    hora: '10:30',
    data: '04/03/26',
    status: 'aguardando',
  },
  {
    id: '2',
    numeroPedido: 'BLING-10235',
    descricao: 'Manutencao e reprogramacao Fechadura Yamamotto YM-700',
    cliente: 'Mariana Costa',
    tecnico: 'Maria Santos',
    endereco: 'Rua Haddock Lobo, 595 - Consolacao, Sao Paulo - SP',
    hora: '14:20',
    data: '04/03/26',
    status: 'atribuido',
  },
  {
    id: '3',
    numeroPedido: 'BLING-10236',
    descricao: 'Troca de modulo e ajuste de sensores YM-900',
    cliente: 'Paulo Ricardo',
    tecnico: 'Pedro Costa',
    endereco: 'Rua da Consolacao, 88 - Centro, Sao Paulo - SP',
    hora: '16:10',
    data: '05/03/26',
    status: 'concluido',
  },
  {
    id: '4',
    numeroPedido: 'BLING-10237',
    descricao: 'Reset e substituicao de teclado numerico YM-450',
    cliente: 'Fernanda Alves',
    tecnico: 'Ana Rodrigues',
    endereco: 'Rua da Liberdade, 120 - Liberdade, Sao Paulo - SP',
    hora: '09:00',
    data: '12/03/26',
    status: 'nao_realizado',
    motivo: 'Cliente nao estava presente no local no horario agendado. Tentamos contato por telefone sem sucesso. Necessario reagendar a visita.',
    telefone: '(11) 98765-4321',
  },
];

const statusLabelByCode: Record<AdminService['status'], string> = {
  aguardando: 'Aguardando',
  atribuido: 'Atribuido',
  concluido: 'Concluido',
  nao_realizado: 'Nao Realizado',
};

const statusFilterToCode: Record<string, AdminService['status'] | null> = {
  'Todos os Status': null,
  'Aguardando Atribuicao': 'aguardando',
  Atribuidos: 'atribuido',
  Concluidos: 'concluido',
  'Nao Realizados': 'nao_realizado',
};

const statusBadgeColorByCode: Record<AdminService['status'], string> = {
  aguardando: '#f15a00',
  atribuido: '#0ea5a4',
  concluido: '#2563eb',
  nao_realizado: '#6b7280',
};

function parseShortDate(value: string) {
  const parts = value.split('/');
  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) {
    return null;
  }

  const fullYear = year < 100 ? 2000 + year : year;
  const parsed = new Date(fullYear, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function matchesPeriodo(dateText: string, periodo: string) {
  if (periodo === 'Todos os Periodos') {
    return true;
  }

  const date = parseShortDate(dateText);
  if (!date) {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (periodo === 'Hoje') {
    return dateStart.getTime() === todayStart.getTime();
  }

  if (periodo === 'Esta Semana') {
    const dayOfWeek = todayStart.getDay();
    const shift = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - shift);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return dateStart >= weekStart && dateStart <= weekEnd;
  }

  if (periodo === 'Este Mes') {
    return (
      dateStart.getMonth() === todayStart.getMonth() &&
      dateStart.getFullYear() === todayStart.getFullYear()
    );
  }

  return true;
}

const REAGENDAR_HOURS = ['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21'];
const REAGENDAR_MINUTES = ['00','15','30','45'];

function toCalendarDate(ddmmyy: string): string {
  const p = ddmmyy.split('/');
  if (p.length !== 3) return '';
  const year = Number(p[2]) < 100 ? `20${p[2].padStart(2,'0')}` : p[2];
  return `${year}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
}

function fromCalendarDate(yyyymmdd: string): string {
  const p = yyyymmdd.split('-');
  if (p.length !== 3) return '';
  return `${p[2]}/${p[1]}/${p[0].slice(-2)}`;
}

const AdmHomeScreen = () => {
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [selectedNaoRealizado, setSelectedNaoRealizado] = useState<NaoRealizadoDetail | null>(null);
  const [reagendarVisible, setReagendarVisible] = useState(false);
  const [isReagendarTecnicoOpen, setIsReagendarTecnicoOpen] = useState(false);
  const [showReagendarCal, setShowReagendarCal] = useState(false);
  const [showReagendarTime, setShowReagendarTime] = useState(false);
  const [reagendarForm, setReagendarForm] = useState<ReagendarForm>({ tecnicoId: '', data: '', hora: '' });
  const [isSavingReagendar, setIsSavingReagendar] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null);
  const [atribuirVisible, setAtribuirVisible] = useState(false);
  const [atribuirTarget, setAtribuirTarget] = useState<AdminService | null>(null);
  const [atribuirForm, setAtribuirForm] = useState<{ tecnicoId: string; data: string; hora: string }>({ tecnicoId: '', data: '', hora: '' });
  const [isAtribuirTecnicoOpen, setIsAtribuirTecnicoOpen] = useState(false);
  const [showAtribuirCal, setShowAtribuirCal] = useState(false);
  const [showAtribuirTime, setShowAtribuirTime] = useState(false);
  const [tecnicosApi, setTecnicosApi] = useState<AdminTecnicoUser[]>([]);

  const openAtribuirModal = (item: AdminService) => {
    setAtribuirTarget(item);
    setAtribuirForm({ tecnicoId: item.tecnicoId || '', data: '', hora: '' });
    setIsAtribuirTecnicoOpen(false);
    setShowAtribuirCal(false);
    setShowAtribuirTime(false);
    setAtribuirVisible(true);
  };

  const confirmAtribuir = async () => {
    if (!atribuirTarget || !atribuirForm.tecnicoId || !atribuirForm.data.trim() || !atribuirForm.hora.trim()) {
      Alert.alert('Campos obrigatorios', 'Selecione tecnico, data e horario para continuar.');
      return;
    }

    try {
      await assignAdminService(atribuirTarget.id, {
        tecnicoId: atribuirForm.tecnicoId,
        dataAgendada: atribuirForm.data,
        horaAgendada: atribuirForm.hora,
      }, {
        numeroPedido: atribuirTarget.numeroPedido,
        descricao: atribuirTarget.descricao,
        cliente: atribuirTarget.cliente,
        telefone: atribuirTarget.telefone,
        endereco: atribuirTarget.endereco,
        tecnicoNome: tecnicoAtribuidoSelecionado?.nome,
        tecnicoEmail: tecnicoAtribuidoSelecionado?.email,
        tecnicoTelefone: tecnicoAtribuidoSelecionado?.telefone,
      });
      setAtribuirVisible(false);
      setAtribuirTarget(null);
      await loadAdminServices();
    } catch (error) {
      Alert.alert('Falha ao atribuir', error instanceof Error ? error.message : 'Nao foi possivel atribuir o tecnico.');
    }
  };

  const openReagendar = () => {
    setReagendarForm({ tecnicoId: selectedNaoRealizado?.tecnicoId || '', data: '', hora: '' });
    setIsReagendarTecnicoOpen(false);
    setShowReagendarCal(false);
    setShowReagendarTime(false);
    setReagendarVisible(true);
  };

  const confirmReagendar = async () => {
    if (!selectedNaoRealizado) {
      return;
    }
    if (!reagendarForm.tecnicoId || !reagendarForm.data.trim() || !reagendarForm.hora.trim()) {
      Alert.alert('Campos obrigatorios', 'Selecione tecnico, data e horario para continuar.');
      return;
    }

    try {
      setIsSavingReagendar(true);
      await assignAdminService(selectedNaoRealizado.id, {
        tecnicoId: reagendarForm.tecnicoId,
        dataAgendada: reagendarForm.data,
        horaAgendada: reagendarForm.hora,
      }, {
        numeroPedido: selectedNaoRealizado.numeroPedido,
        descricao: selectedNaoRealizado.descricao,
        cliente: selectedNaoRealizado.cliente,
        telefone: selectedNaoRealizado.telefone,
        endereco: selectedNaoRealizado.endereco,
        tecnicoNome: tecnicoReagendarSelecionado?.nome,
        tecnicoEmail: tecnicoReagendarSelecionado?.email,
        tecnicoTelefone: tecnicoReagendarSelecionado?.telefone,
      });
      setReagendarVisible(false);
      setSelectedNaoRealizado(null);
      await loadAdminServices();
    } catch (error) {
      Alert.alert('Falha ao reagendar', error instanceof Error ? error.message : 'Nao foi possivel reagendar a visita.');
    } finally {
      setIsSavingReagendar(false);
    }
  };

  const openDetailModal = (item: AdminService) => {
    const checklistFromApi: ChecklistItem[] = Array.isArray(item.checklist)
      ? item.checklist.map((check, idx) => ({
          id: `${item.id}-check-${idx}`,
          label: String(check.item || `Item ${idx + 1}`),
          done: Boolean(check.status),
        }))
      : [];

    setSelectedService({
      ...item,
      telefone: item.telefone ?? '(11) 96543-2109',
      horaConclusao: '12:30',
      checklist: checklistFromApi.length ? checklistFromApi : MOCK_CHECKLIST,
      fotoUri: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
      assinadoPor: item.cliente,
    });
  };

  const openNaoRealizadoModal = (item: AdminService) => {
    setSelectedNaoRealizado({
      ...item,
      motivoCompleto: item.motivo ?? 'Motivo nao informado.',
    });
  };
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const [services, setServices] = useState<AdminService[]>(mockServices);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [newServiceForm, setNewServiceForm] = useState<NewServiceForm>(DEFAULT_NEW_SERVICE_FORM);

  const openFilterModal = () => {
    setDraftFilters(appliedFilters);
    setOpenDropdown(null);
    setIsFilterModalVisible(true);
  };

  const closeFilterModal = () => {
    setIsFilterModalVisible(false);
    setOpenDropdown(null);
  };

  const selectFilterOption = (key: Exclude<DropdownKey, null>, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
    setOpenDropdown(null);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setOpenDropdown(null);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    closeFilterModal();
  };

  const openCreateModal = () => {
    setNewServiceForm(DEFAULT_NEW_SERVICE_FORM);
    setIsAssignDropdownOpen(false);
    setIsCreateModalVisible(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setIsAssignDropdownOpen(false);
  };

  const setFormField = (field: keyof NewServiceForm, value: string) => {
    setNewServiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateService = () => {
    if (!newServiceForm.nomeCompleto.trim() || !newServiceForm.descricao.trim()) {
      return;
    }

    const now = new Date();
    const defaultDay = String(now.getDate()).padStart(2, '0');
    const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
    const defaultYear = String(now.getFullYear()).slice(-2);
    const defaultDate = `${defaultDay}/${defaultMonth}/${defaultYear}`;
    const defaultHour = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const input = newServiceForm.dataHoraVisita.trim();
    const match = input.match(/(\d{2}\/\d{2}\/\d{2,4})\s+(\d{2}:\d{2})/);
    const parsedDate = match?.[1] || defaultDate;
    const parsedHour = match?.[2] || defaultHour;
    const assignedTech = newServiceForm.tecnicoResponsavel === 'Selecionar depois'
      ? 'Nao atribuido'
      : newServiceForm.tecnicoResponsavel;

    const created: AdminService = {
      id: String(Date.now()),
      numeroPedido: `BLING-${10230 + services.length + 1}`,
      descricao: newServiceForm.descricao.trim(),
      cliente: newServiceForm.nomeCompleto.trim(),
      tecnico: assignedTech,
      endereco: newServiceForm.endereco.trim() || 'Endereco nao informado',
      hora: parsedHour,
      data: parsedDate,
      status: assignedTech === 'Nao atribuido' ? 'aguardando' : 'atribuido',
    };

    setServices((prev) => [created, ...prev]);
    setAppliedFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    closeCreateModal();
  };

  const loadAdminServices = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const [nextServices, nextTecnicos] = await Promise.all([
        fetchAdminServicesFromApi(),
        fetchAdminTecnicosFromApi(),
      ]);
      setServices(nextServices);
      setTecnicosApi(nextTecnicos);
    } catch (error) {
      console.warn('Erro ao carregar pedidos admin:', error);
    } finally {
      setIsLoading(false);
      setHasLoadedOnce(true);
    }
  }, [hasLoadedOnce]);

  useFocusEffect(
    useCallback(() => {
      loadAdminServices();
      const intervalId = setInterval(() => {
        loadAdminServices();
      }, 20000);

      return () => clearInterval(intervalId);
    }, [loadAdminServices])
  );

  const stats = useMemo(() => {
    const aguardando = services.filter((s) => s.status === 'aguardando').length;
    const atribuidos = services.filter((s) => s.status === 'atribuido').length;
    const concluidos = services.filter((s) => s.status === 'concluido').length;
    const total = services.length;
    return { aguardando, atribuidos, concluidos, total };
  }, [services]);

  const tecnicoOptions = useMemo(() => {
    const dynamicTecnicos = [
      ...new Set([
        ...services.map((service) => service.tecnico).filter((name) => name && name !== 'Nao atribuido'),
        ...tecnicosApi.map((tecnico) => tecnico.nome),
      ]),
    ].sort();
    return ['Todos os Tecnicos', ...dynamicTecnicos];
  }, [services, tecnicosApi]);

  const tecnicoAtribuidoSelecionado = useMemo(() => {
    return tecnicosApi.find((tecnico) => tecnico.id === atribuirForm.tecnicoId) || null;
  }, [tecnicosApi, atribuirForm.tecnicoId]);

  const tecnicoReagendarSelecionado = useMemo(() => {
    return tecnicosApi.find((tecnico) => tecnico.id === reagendarForm.tecnicoId) || null;
  }, [tecnicosApi, reagendarForm.tecnicoId]);

  const filteredServices = useMemo(() => {
    const statusCode = statusFilterToCode[appliedFilters.status] ?? null;
    const normalizedQuery = normalizeSearchValue(searchQuery);

    return services.filter((service) => {
      const matchesStatus = statusCode ? service.status === statusCode : true;
      const matchesTecnico =
        appliedFilters.tecnico === 'Todos os Tecnicos'
          ? true
          : service.tecnico === appliedFilters.tecnico;
      const matchesPeriodoFilter = matchesPeriodo(service.data, appliedFilters.periodo);
      const matchesSearch =
        !normalizedQuery ||
        [
          service.numeroPedido,
          service.cliente,
          service.telefone,
          service.tecnico,
          service.endereco,
          service.descricao,
          service.data,
          service.hora,
        ].some((value) => normalizeSearchValue(value).includes(normalizedQuery));

      return matchesStatus && matchesTecnico && matchesPeriodoFilter && matchesSearch;
    });
  }, [appliedFilters, searchQuery, services]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <AdminHeader />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <AdminOverviewCard
          title="Gestao de Pedidos"
          actionIcon="plus"
          onActionPress={openCreateModal}
          stats={[
            { label: 'Aguardando', value: stats.aguardando, tone: 'pending' },
            { label: 'Atribuidos', value: stats.atribuidos, tone: 'assigned' },
            { label: 'Concluidos', value: stats.concluidos, tone: 'finished' },
            { label: 'Total', value: stats.total, tone: 'total' },
          ]}
        />

        <View style={styles.searchBar}>
          <Feather name="search" size={22} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por ID, nome, telefone..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Feather name="x-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          activeOpacity={0.9}
          onPress={openFilterModal}
        >
          <Feather name="filter" size={20} color="#475569" />
          <Text style={styles.filterText}>Filtros</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Carregando pedidos...</Text>
            <Text style={styles.emptySubtitle}>Buscando dados da API.</Text>
          </View>
        ) : null}

        {filteredServices.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.orderCard}
            activeOpacity={item.status === 'concluido' ? 0.8 : 1}
            onPress={() => {
            if (item.status === 'concluido') openDetailModal(item);
          }}
          >
            <View style={styles.orderTopRow}>
              <Text style={styles.orderId}>{item.numeroPedido}</Text>
              <Text style={[styles.orderBadge, { backgroundColor: statusBadgeColorByCode[item.status] }]}>
                {statusLabelByCode[item.status]}
              </Text>
            </View>

            <Text style={styles.clientName}>{item.cliente}</Text>

            <View style={styles.infoRow}>
              <Feather name="phone" size={16} color="#16a34a" />
              <Text style={styles.infoText}>{item.telefone ?? '(11) 98765-4321'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="user" size={16} color="#0ea5a4" />
              <Text style={styles.infoText}>{item.tecnico}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color="#ef4444" />
              <Text style={styles.infoText}>{item.endereco}</Text>
            </View>

            <View style={styles.infoRow}>
              <Feather name="clock" size={16} color="#64748b" />
              <Text style={styles.infoText}>{item.data} as {item.hora}</Text>
            </View>

            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionText}>{formatLockDisplayName(item.descricao)}</Text>
            </View>

            {item.status === 'aguardando' || item.status === 'atribuido' ? (
              <TouchableOpacity style={styles.assignButton} activeOpacity={0.9} onPress={() => openAtribuirModal(item)}>
                <Text style={styles.assignButtonText}>Atribuir Tecnico</Text>
              </TouchableOpacity>
            ) : null}
            {item.status === 'nao_realizado' ? (
              <TouchableOpacity
                style={styles.motivoButton}
                activeOpacity={0.9}
                onPress={() => openNaoRealizadoModal(item)}
              >
                <Feather name="alert-circle" size={16} color="#6b7280" />
                <Text style={styles.motivoButtonText}>Ver Motivo</Text>
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        ))}

        {filteredServices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum pedido encontrado</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? 'Nenhum pedido corresponde ao texto pesquisado.'
                : 'Ajuste os filtros para ver mais resultados.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={isFilterModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsFilterModalVisible(false)}
        >
          <Pressable style={styles.filterModalCard} onPress={() => {}}>
            <View style={styles.filterModalHeader}>
              <Feather name="filter" size={22} color="#111827" />
              <Text style={styles.filterModalTitle}>Filtros Avancados</Text>
            </View>

            <Text style={styles.filterModalSubtitle}>
              Refine sua busca aplicando multiplos filtros
            </Text>

            <View style={styles.filterFieldGroup}>
              <Text style={styles.filterFieldLabel}>Status do Pedido</Text>
              <TouchableOpacity
                style={styles.filterSelectBox}
                activeOpacity={0.9}
                onPress={() => setOpenDropdown((prev) => (prev === 'status' ? null : 'status'))}
              >
                <Text style={styles.filterSelectValue}>{draftFilters.status}</Text>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {openDropdown === 'status' ? (
                <View style={styles.dropdownList}>
                  {STATUS_OPTIONS.map((option, index) => {
                    const isSelected = draftFilters.status === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                          index === STATUS_OPTIONS.length - 1 && styles.dropdownOptionLast,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => selectFilterOption('status', option)}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                        {isSelected ? <Feather name="check" size={18} color="#6b7280" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.filterFieldGroup}>
              <Text style={styles.filterFieldLabel}>Tecnico</Text>
              <TouchableOpacity
                style={styles.filterSelectBox}
                activeOpacity={0.9}
                onPress={() => setOpenDropdown((prev) => (prev === 'tecnico' ? null : 'tecnico'))}
              >
                <Text style={styles.filterSelectValue}>{draftFilters.tecnico}</Text>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {openDropdown === 'tecnico' ? (
                <View style={styles.dropdownList}>
                  {tecnicoOptions.map((option, index) => {
                    const isSelected = draftFilters.tecnico === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                          index === tecnicoOptions.length - 1 && styles.dropdownOptionLast,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => selectFilterOption('tecnico', option)}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                        {isSelected ? <Feather name="check" size={18} color="#6b7280" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.filterFieldGroup}>
              <Text style={styles.filterFieldLabel}>Periodo</Text>
              <TouchableOpacity
                style={styles.filterSelectBox}
                activeOpacity={0.9}
                onPress={() => setOpenDropdown((prev) => (prev === 'periodo' ? null : 'periodo'))}
              >
                <Text style={styles.filterSelectValue}>{draftFilters.periodo}</Text>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {openDropdown === 'periodo' ? (
                <View style={styles.dropdownList}>
                  {PERIODO_OPTIONS.map((option, index) => {
                    const isSelected = draftFilters.periodo === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                          index === PERIODO_OPTIONS.length - 1 && styles.dropdownOptionLast,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => selectFilterOption('periodo', option)}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                        {isSelected ? <Feather name="check" size={18} color="#6b7280" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <View style={styles.filterDivider} />

            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={styles.clearFilterButton}
                activeOpacity={0.9}
                onPress={clearFilters}
              >
                <Text style={styles.clearFilterButtonText}>Limpar Tudo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyFilterButton}
                activeOpacity={0.9}
                onPress={applyFilters}
              >
                <Text style={styles.applyFilterButtonText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeCreateModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            <ScrollView contentContainerStyle={styles.createModalContent} showsVerticalScrollIndicator>
              <Text style={styles.createTitle}>Cadastrar Novo Pedido</Text>
              <Text style={styles.createSubtitle}>Preencha os dados do cliente e do servico</Text>

              <View style={styles.sectionHeader}>
                <Feather name="user" size={18} color="#7A1A1A" />
                <Text style={styles.sectionTitle}>Dados do Cliente</Text>
              </View>

              <Text style={styles.inputLabel}>Nome Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Joao da Silva"
                placeholderTextColor="#64748b"
                value={newServiceForm.nomeCompleto}
                onChangeText={(value) => setFormField('nomeCompleto', value)}
              />

              <View style={styles.rowTwoColumns}>
                <View style={styles.columnHalf}>
                  <Text style={styles.inputLabel}>Telefone *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(11) 98765-4321"
                    placeholderTextColor="#64748b"
                    value={newServiceForm.telefone}
                    onChangeText={(value) => setFormField('telefone', value)}
                  />
                </View>

                <View style={styles.columnHalf}>
                  <Text style={styles.inputLabel}>CEP *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="01310-100"
                    placeholderTextColor="#64748b"
                    value={newServiceForm.cep}
                    onChangeText={(value) => setFormField('cep', value)}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>E-mail *</Text>
              <TextInput
                style={styles.input}
                placeholder="cliente@email.com"
                placeholderTextColor="#64748b"
                value={newServiceForm.email}
                onChangeText={(value) => setFormField('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Endereco Completo *</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua, numero - Bairro, Cidade"
                placeholderTextColor="#64748b"
                value={newServiceForm.endereco}
                onChangeText={(value) => setFormField('endereco', value)}
              />

              <Text style={styles.inputLabel}>Observacoes</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Ex: Portao azul, interfone 204"
                placeholderTextColor="#64748b"
                multiline
                textAlignVertical="top"
                value={newServiceForm.observacoes}
                onChangeText={(value) => setFormField('observacoes', value)}
              />

              <View style={styles.sectionHeader}>
                <Feather name="box" size={18} color="#7A1A1A" />
                <Text style={styles.sectionTitle}>Servico</Text>
              </View>

              <Text style={styles.inputLabel}>Descricao *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Ex: Instalacao de Fechadura Digital Yamamotto YM-500"
                placeholderTextColor="#64748b"
                multiline
                textAlignVertical="top"
                value={newServiceForm.descricao}
                onChangeText={(value) => setFormField('descricao', value)}
              />

              <View style={styles.sectionHeader}>
                <Feather name="calendar" size={18} color="#7A1A1A" />
                <Text style={styles.sectionTitle}>Atribuicao (Opcional)</Text>
              </View>

              <Text style={styles.inputLabel}>Tecnico Responsavel</Text>
              <TouchableOpacity
                style={styles.inputSelect}
                activeOpacity={0.9}
                onPress={() => setIsAssignDropdownOpen((prev) => !prev)}
              >
                <Text style={styles.inputSelectText}>{newServiceForm.tecnicoResponsavel}</Text>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {isAssignDropdownOpen ? (
                <View style={styles.dropdownList}>
                  {ASSIGN_OPTIONS.map((option, index) => {
                    const isSelected = newServiceForm.tecnicoResponsavel === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                          index === ASSIGN_OPTIONS.length - 1 && styles.dropdownOptionLast,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => {
                          setFormField('tecnicoResponsavel', option);
                          setIsAssignDropdownOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                        {isSelected ? <Feather name="check" size={18} color="#6b7280" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <Text style={styles.helperText}>Deixe em branco para atribuir posteriormente</Text>

              <Text style={styles.inputLabel}>Data e Hora da Visita</Text>
              <TextInput
                style={styles.input}
                placeholder="dd/mm/aaaa --:--"
                placeholderTextColor="#64748b"
                value={newServiceForm.dataHoraVisita}
                onChangeText={(value) => setFormField('dataHoraVisita', value)}
              />

              <Text style={styles.helperText}>Defina quando o servico sera realizado</Text>

              <View style={styles.createDivider} />

              <TouchableOpacity style={styles.createButton} activeOpacity={0.9} onPress={handleCreateService}>
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.createButtonText}>Criar Pedido</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelCreateButton} activeOpacity={0.9} onPress={closeCreateModal}>
                <Text style={styles.cancelCreateButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de detalhes de nao realizado */}
      <Modal
        visible={selectedNaoRealizado !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedNaoRealizado(null)}
      >
        {selectedNaoRealizado ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            <View style={[styles.detailHeader, { backgroundColor: '#374151' }]}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={() => setSelectedNaoRealizado(null)}
              >
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.detailHeaderInfo}>
                <View style={[styles.detailHeaderIcon, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Feather name="alert-circle" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.detailHeaderTitle}>Servico Nao Realizado</Text>
                  <Text style={styles.detailHeaderSub}>{selectedNaoRealizado.numeroPedido}</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>

              {/* Info do pedido */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardSectionTitle}>Informacoes do Pedido:</Text>

                <View style={styles.detailInfoRow}>
                  <Feather name="user" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedNaoRealizado.cliente}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="phone" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedNaoRealizado.telefone ?? '(11) 98765-4321'}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="map-pin" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedNaoRealizado.endereco}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="clock" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedNaoRealizado.data} as {selectedNaoRealizado.hora}</Text>
                </View>

                <View style={styles.detailTechRow}>
                  <Feather name="user-check" size={16} color="#0ea5a4" />
                  <Text style={styles.detailTechText}>Tecnico: {selectedNaoRealizado.tecnico}</Text>
                </View>

                <View style={styles.detailServiceBox}>
                  <Text style={styles.detailServiceLabel}>Servico:</Text>
                  <Text style={[styles.detailServiceDesc, { color: '#1e293b' }]}>{formatLockDisplayName(selectedNaoRealizado.descricao)}</Text>
                </View>
              </View>

              {/* Motivo */}
              <View style={styles.detailSectionHeader}>
                <Feather name="alert-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Motivo da Nao Realizacao</Text>
              </View>

              <View style={styles.motivoCard}>
                <Text style={styles.motivoText}>{selectedNaoRealizado.motivoCompleto}</Text>
              </View>

              {/* Acoes */}
              <TouchableOpacity
                style={styles.reagendarButton}
                activeOpacity={0.9}
                onPress={openReagendar}
              >
                <Feather name="calendar" size={16} color="#fff" />
                <Text style={styles.reagendarButtonText}>Reagendar Visita</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeDetailButton}
                activeOpacity={0.9}
                onPress={() => setSelectedNaoRealizado(null)}
              >
                <Text style={styles.closeDetailButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>

      {/* Modal Atribuir Tecnico */}
      <Modal
        visible={atribuirVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setAtribuirVisible(false)}
      >
        {atribuirTarget ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={() => setAtribuirVisible(false)}
              >
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.detailHeaderInfo}>
                <View style={styles.detailHeaderIcon}>
                  <Feather name="user-check" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.detailHeaderTitle}>Atribuir Tecnico</Text>
                  <Text style={styles.detailHeaderSub}>{atribuirTarget.numeroPedido} - {atribuirTarget.cliente}</Text>
                </View>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Informacoes do Cliente */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardSectionTitle}>Informacoes do Cliente:</Text>
                <View style={styles.detailInfoRow}>
                  <Feather name="user" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{atribuirTarget.cliente}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="phone" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{atribuirTarget.telefone ?? '(11) 96543-2109'}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="map-pin" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{atribuirTarget.endereco}</Text>
                </View>
                <View style={styles.detailServiceBox}>
                  <Text style={styles.detailServiceLabel}>Servico:</Text>
                  <Text style={styles.detailServiceDesc}>{formatLockDisplayName(atribuirTarget.descricao)}</Text>
                </View>
              </View>

              {/* Tecnico */}
              <Text style={styles.atribuirFieldLabel}>Tecnico Responsavel *</Text>
              <TouchableOpacity
                style={styles.atribuirSelect}
                activeOpacity={0.9}
                onPress={() => {
                  setIsAtribuirTecnicoOpen((p) => !p);
                  setShowAtribuirCal(false);
                  setShowAtribuirTime(false);
                }}
              >
                <Text style={[styles.atribuirSelectText, !atribuirForm.tecnicoId && { color: '#94a3b8' }]}>
                  {tecnicoAtribuidoSelecionado?.nome || 'Selecione um tecnico'}
                </Text>
                <Feather name="chevron-down" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {isAtribuirTecnicoOpen ? (
                <View style={styles.dropdownList}>
                  {tecnicosApi.map((option, index, arr) => {
                    const isSelected = atribuirForm.tecnicoId === option.id;
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.dropdownOption,
                          isSelected && styles.dropdownOptionSelected,
                          index === arr.length - 1 && styles.dropdownOptionLast,
                        ]}
                        activeOpacity={0.9}
                        onPress={() => {
                          setAtribuirForm((p) => ({ ...p, tecnicoId: option.id }));
                          setIsAtribuirTecnicoOpen(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{option.nome}</Text>
                        {isSelected ? <Feather name="check" size={16} color="#6b7280" /> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              {/* Data */}
              <Text style={styles.atribuirFieldLabel}>Data e Hora da Visita *</Text>
              <TouchableOpacity
                style={styles.atribuirSelect}
                activeOpacity={0.9}
                onPress={() => { setShowAtribuirCal((p) => !p); setShowAtribuirTime(false); }}
              >
                <Text style={[styles.atribuirSelectText, !atribuirForm.data && { color: '#94a3b8' }]}>
                  {atribuirForm.data || 'dd/mm/aaaa'}
                </Text>
                <Feather name="calendar" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {showAtribuirCal ? (
                <View style={styles.calendarWrapper}>
                  <Calendar
                    current={toCalendarDate(atribuirForm.data) || undefined}
                    onDayPress={(day) => {
                      setAtribuirForm((p) => ({ ...p, data: fromCalendarDate(day.dateString) }));
                      setShowAtribuirCal(false);
                    }}
                    markedDates={atribuirForm.data ? { [toCalendarDate(atribuirForm.data)]: { selected: true, selectedColor: '#7A1A1A' } } : {}}
                    theme={{
                      selectedDayBackgroundColor: '#7A1A1A',
                      todayTextColor: '#7A1A1A',
                      arrowColor: '#7A1A1A',
                      textSectionTitleColor: '#374151',
                      dayTextColor: '#0f172a',
                      monthTextColor: '#0f172a',
                      textMonthFontWeight: '700',
                    }}
                  />
                </View>
              ) : null}

              {/* Horario */}
              <TouchableOpacity
                style={[styles.atribuirSelect, { marginTop: 10 }]}
                activeOpacity={0.9}
                onPress={() => { setShowAtribuirTime((p) => !p); setShowAtribuirCal(false); }}
              >
                <Text style={[styles.atribuirSelectText, !atribuirForm.hora && { color: '#94a3b8' }]}>
                  {atribuirForm.hora || 'HH:MM'}
                </Text>
                <Feather name="clock" size={18} color="#9ca3af" />
              </TouchableOpacity>

              {showAtribuirTime ? (() => {
                const [selH, selM] = atribuirForm.hora ? atribuirForm.hora.split(':') : ['', ''];
                return (
                  <View style={styles.timePickerWrapper}>
                    <View style={styles.timePickerCol}>
                      <Text style={styles.timePickerColTitle}>Hora</Text>
                      <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                        {REAGENDAR_HOURS.map((h) => (
                          <TouchableOpacity
                            key={h}
                            style={[styles.timePickerItem, selH === h && styles.timePickerItemActive]}
                            activeOpacity={0.85}
                            onPress={() => {
                              const m = selM || '00';
                              setAtribuirForm((p) => ({ ...p, hora: `${h}:${m}` }));
                            }}
                          >
                            <Text style={[styles.timePickerItemText, selH === h && styles.timePickerItemTextActive]}>{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                    <View style={styles.timePickerDividerV} />
                    <View style={styles.timePickerCol}>
                      <Text style={styles.timePickerColTitle}>Minuto</Text>
                      {REAGENDAR_MINUTES.map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.timePickerItem, selM === m && styles.timePickerItemActive]}
                          activeOpacity={0.85}
                          onPress={() => {
                            const h = selH || REAGENDAR_HOURS[4];
                            setAtribuirForm((p) => ({ ...p, hora: `${h}:${m}` }));
                            setShowAtribuirTime(false);
                          }}
                        >
                          <Text style={[styles.timePickerItemText, selM === m && styles.timePickerItemTextActive]}>{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })() : null}

              <View style={{ height: 24 }} />

              {/* Botoes */}
              <TouchableOpacity
                style={styles.atribuirConfirmButton}
                activeOpacity={0.9}
                onPress={confirmAtribuir}
              >
                <Feather name="check-circle" size={18} color="#fff" />
                <Text style={styles.atribuirConfirmButtonText}>Confirmar Atribuicao</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.atribuirCancelButton}
                activeOpacity={0.9}
                onPress={() => setAtribuirVisible(false)}
              >
                <Text style={styles.atribuirCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>

      {/* Popup de reagendamento */}
      <Modal
        visible={reagendarVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setReagendarVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => !isSavingReagendar && setReagendarVisible(false)}>
          <Pressable style={styles.reagendarCard} onPress={() => {}}>
            <View style={styles.reagendarHeader}>
              <Feather name="calendar" size={20} color="#7A1A1A" />
              <Text style={styles.reagendarTitle}>Reagendar Visita</Text>
            </View>
            <Text style={styles.reagendarSubtitle}>Selecione novo tecnico, data e horario</Text>

            <Text style={styles.reagendarLabel}>Tecnico Responsavel</Text>
            <TouchableOpacity
              style={styles.reagendarSelect}
              activeOpacity={0.9}
              onPress={() => setIsReagendarTecnicoOpen((p) => !p)}
            >
              <Text style={[styles.reagendarSelectText, !reagendarForm.tecnicoId && { color: '#94a3b8' }]}>
                {tecnicoReagendarSelecionado?.nome || 'Selecionar Tecnico'}
              </Text>
              <Feather name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>

            {isReagendarTecnicoOpen ? (
              <View style={styles.dropdownList}>
                {tecnicosApi.map((option, index, arr) => {
                  const isSelected = reagendarForm.tecnicoId === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.dropdownOption,
                        isSelected && styles.dropdownOptionSelected,
                        index === arr.length - 1 && styles.dropdownOptionLast,
                      ]}
                      activeOpacity={0.9}
                      onPress={() => {
                        setReagendarForm((p) => ({ ...p, tecnicoId: option.id }));
                        setIsReagendarTecnicoOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>{option.nome}</Text>
                      {isSelected ? <Feather name="check" size={16} color="#6b7280" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}

            {/* Data: dropdown com calendario */}
            <Text style={styles.reagendarLabel}>Data *</Text>
            <TouchableOpacity
              style={styles.reagendarSelect}
              activeOpacity={0.9}
              onPress={() => { setShowReagendarCal((p) => !p); setShowReagendarTime(false); }}
            >
              <Text style={[styles.reagendarSelectText, !reagendarForm.data && { color: '#94a3b8' }]}>
                {reagendarForm.data || 'dd/mm/aaaa'}
              </Text>
              <Feather name="calendar" size={18} color="#9ca3af" />
            </TouchableOpacity>

            {showReagendarCal ? (
              <View style={styles.calendarWrapper}>
                <Calendar
                  current={toCalendarDate(reagendarForm.data) || undefined}
                  onDayPress={(day) => {
                    setReagendarForm((p) => ({ ...p, data: fromCalendarDate(day.dateString) }));
                    setShowReagendarCal(false);
                  }}
                  markedDates={reagendarForm.data ? { [toCalendarDate(reagendarForm.data)]: { selected: true, selectedColor: '#7A1A1A' } } : {}}
                  theme={{
                    selectedDayBackgroundColor: '#7A1A1A',
                    todayTextColor: '#7A1A1A',
                    arrowColor: '#7A1A1A',
                    textSectionTitleColor: '#374151',
                    dayTextColor: '#0f172a',
                    monthTextColor: '#0f172a',
                    textMonthFontWeight: '700',
                  }}
                />
              </View>
            ) : null}

            {/* Horario: dropdown com grade de hora e minuto */}
            <Text style={styles.reagendarLabel}>Horario *</Text>
            <TouchableOpacity
              style={styles.reagendarSelect}
              activeOpacity={0.9}
              onPress={() => { setShowReagendarTime((p) => !p); setShowReagendarCal(false); }}
            >
              <Text style={[styles.reagendarSelectText, !reagendarForm.hora && { color: '#94a3b8' }]}>
                {reagendarForm.hora || 'HH:MM'}
              </Text>
              <Feather name="clock" size={18} color="#9ca3af" />
            </TouchableOpacity>

            {showReagendarTime ? (() => {
              const [selH, selM] = reagendarForm.hora ? reagendarForm.hora.split(':') : ['', ''];
              return (
                <View style={styles.timePickerWrapper}>
                  <View style={styles.timePickerCol}>
                    <Text style={styles.timePickerColTitle}>Hora</Text>
                    <ScrollView style={{ maxHeight: 160 }} showsVerticalScrollIndicator={false}>
                      {REAGENDAR_HOURS.map((h) => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.timePickerItem, selH === h && styles.timePickerItemActive]}
                          activeOpacity={0.85}
                          onPress={() => {
                            const m = selM || '00';
                            setReagendarForm((p) => ({ ...p, hora: `${h}:${m}` }));
                          }}
                        >
                          <Text style={[styles.timePickerItemText, selH === h && styles.timePickerItemTextActive]}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.timePickerDividerV} />
                  <View style={styles.timePickerCol}>
                    <Text style={styles.timePickerColTitle}>Minuto</Text>
                    {REAGENDAR_MINUTES.map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.timePickerItem, selM === m && styles.timePickerItemActive]}
                        activeOpacity={0.85}
                        onPress={() => {
                          const h = selH || REAGENDAR_HOURS[4];
                          setReagendarForm((p) => ({ ...p, hora: `${h}:${m}` }));
                          setShowReagendarTime(false);
                        }}
                      >
                        <Text style={[styles.timePickerItemText, selM === m && styles.timePickerItemTextActive]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })() : null}

            <View style={styles.filterDivider} />

            <View style={styles.filterActionsRow}>
              <TouchableOpacity
                style={styles.clearFilterButton}
                activeOpacity={0.9}
                disabled={isSavingReagendar}
                onPress={() => setReagendarVisible(false)}
              >
                <Text style={styles.clearFilterButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.applyFilterButton, isSavingReagendar && { opacity: 0.7 }]}
                activeOpacity={0.9}
                disabled={isSavingReagendar}
                onPress={confirmReagendar}
              >
                <Text style={styles.applyFilterButtonText}>{isSavingReagendar ? 'Salvando...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de detalhes de servico concluido */}
      <Modal
        visible={selectedService !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedService(null)}
      >
        {selectedService ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={() => setSelectedService(null)}
              >
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.detailHeaderInfo}>
                <View style={styles.detailHeaderIcon}>
                  <Feather name="check-circle" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.detailHeaderTitle}>Servico Concluido</Text>
                  <Text style={styles.detailHeaderSub}>{selectedService.numeroPedido}</Text>
                </View>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.detailScrollContent} showsVerticalScrollIndicator={false}>

              {/* Informacoes do Cliente */}
              <View style={styles.detailCard}>
                <Text style={styles.detailCardSectionTitle}>Informacoes do Cliente:</Text>

                <View style={styles.detailInfoRow}>
                  <Feather name="user" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedService.cliente}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="phone" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedService.telefone}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="map-pin" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{selectedService.endereco}</Text>
                </View>

                <View style={styles.detailTechRow}>
                  <Feather name="user-check" size={16} color="#0ea5a4" />
                  <Text style={styles.detailTechText}>Tecnico: {selectedService.tecnico}</Text>
                </View>

                <View style={styles.detailServiceBox}>
                  <Text style={styles.detailServiceLabel}>Servico:</Text>
                  <Text style={styles.detailServiceDesc}>{formatLockDisplayName(selectedService.descricao)}</Text>
                </View>

                <View style={styles.detailDivider} />
                <Text style={styles.detailConclusaoText}>
                  Concluido em: {selectedService.data} as {selectedService.horaConclusao}
                </Text>
              </View>

              {/* Checklist */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Checklist de Instalacao</Text>
              </View>

              {selectedService.checklist.map((ci) => (
                <View
                  key={ci.id}
                  style={[styles.checklistItem, ci.done ? styles.checklistItemDone : styles.checklistItemPending]}
                >
                  {ci.done ? (
                    <View style={styles.checklistIconDone}>
                      <Feather name="check" size={14} color="#fff" />
                    </View>
                  ) : (
                    <View style={styles.checklistIconPending} />
                  )}
                  <Text style={[styles.checklistLabel, !ci.done && styles.checklistLabelPending]}>
                    {ci.label}
                  </Text>
                </View>
              ))}

              <View style={styles.checklistSummaryBox}>
                <Feather name="check" size={14} color="#2563eb" />
                <Text style={styles.checklistSummaryText}>
                  {selectedService.checklist.filter((c) => c.done).length} de {selectedService.checklist.length} itens realizados
                </Text>
              </View>

              {/* Foto */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Foto da Instalacao</Text>
              </View>

              <Image
                source={{ uri: selectedService.fotoUri }}
                style={styles.detailPhoto}
                resizeMode="cover"
              />

              {/* Assinatura */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Assinatura do Cliente</Text>
              </View>

              <View style={styles.signatureBox}>
                <Text style={styles.signaturePlaceholder}>Assinatura do Cliente</Text>
              </View>
              <Text style={styles.signedByText}>Assinado por {selectedService.assinadoPor}</Text>

              <TouchableOpacity
                style={styles.closeDetailButton}
                activeOpacity={0.9}
                onPress={() => setSelectedService(null)}
              >
                <Text style={styles.closeDetailButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#2a0000',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 40 / 1.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  content: {
    flex: 1,
    marginTop: -4,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 140,
  },
  managementCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  managementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  managementTitle: {
    fontSize: 33 / 1.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  plusButton: {
    backgroundColor: '#7A1A1A',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  statPending: {
    backgroundColor: '#f6f0d9',
    borderColor: '#f3d97a',
  },
  statAssigned: {
    backgroundColor: '#d9f3e6',
    borderColor: '#95ddb9',
  },
  statFinished: {
    backgroundColor: '#dbe9f8',
    borderColor: '#9ec0e6',
  },
  statTotal: {
    backgroundColor: '#eef2f6',
    borderColor: '#d5dce5',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statText: {
    fontSize: 16,
    color: '#334155',
  },
  searchBar: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d9e3',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#64748b',
    fontSize: 30 / 1.5,
    paddingVertical: 0,
  },
  filterButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d9e3',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  filterText: {
    fontSize: 30 / 1.5,
    color: '#1e293b',
    fontWeight: '600',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d9dfe7',
    borderLeftWidth: 4,
    borderLeftColor: '#d18a00',
    padding: 12,
    marginBottom: 12,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    color: '#6b1f1f',
    fontWeight: '700',
    fontSize: 14,
  },
  orderBadge: {
    backgroundColor: '#f15a00',
    color: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
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
    backgroundColor: '#eef2f6',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  descriptionText: {
    color: '#1e293b',
    fontSize: 27 / 1.5,
    lineHeight: 22,
  },
  assignButton: {
    marginTop: 8,
    backgroundColor: '#f15a00',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d9dfe7',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filterModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterModalTitle: {
    color: '#111827',
    fontSize: 30 / 1.5,
    fontWeight: '800',
  },
  filterModalSubtitle: {
    color: '#6b7280',
    fontSize: 18 / 1.5,
    marginTop: 8,
    marginBottom: 14,
    paddingLeft: 30,
  },
  filterFieldGroup: {
    marginBottom: 10,
  },
  filterFieldLabel: {
    color: '#111827',
    fontSize: 19 / 1.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  filterSelectBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterSelectValue: {
    color: '#111827',
    fontSize: 30 / 1.5,
    fontWeight: '500',
  },
  dropdownList: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownOption: {
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eceff3',
  },
  dropdownOptionSelected: {
    backgroundColor: '#eceff3',
  },
  dropdownOptionLast: {
    borderBottomWidth: 0,
  },
  dropdownOptionText: {
    color: '#202020',
    fontSize: 19 / 1.5,
    fontWeight: '500',
  },
  filterDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
    marginBottom: 12,
  },
  filterActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  clearFilterButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    alignItems: 'center',
  },
  clearFilterButtonText: {
    color: '#202020',
    fontSize: 19 / 1.5,
    fontWeight: '600',
  },
  applyFilterButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#7A1A1A',
    paddingVertical: 10,
    alignItems: 'center',
  },
  applyFilterButtonText: {
    color: '#fff',
    fontSize: 19 / 1.5,
    fontWeight: '700',
  },
  createModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  createModalContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 22,
  },
  createTitle: {
    color: '#111827',
    fontSize: 40 / 1.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  createSubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 34 / 1.5,
    fontWeight: '700',
  },
  inputLabel: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 16,
  },
  inputMultiline: {
    minHeight: 84,
  },
  rowTwoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
  columnHalf: {
    flex: 1,
  },
  inputSelect: {
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputSelectText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
  },
  createDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 10,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 21 / 1.5,
    fontWeight: '800',
  },
  cancelCreateButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelCreateButtonText: {
    color: '#111827',
    fontSize: 21 / 1.5,
    fontWeight: '700',
  },

  // ---- DETAIL MODAL ----
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
  },
  detailHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  detailHeaderSub: {
    color: 'rgba(255,255,255,0.7)',
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
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailCardSectionTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 7,
  },
  detailInfoText: {
    color: '#334155',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  detailTechRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  detailTechText: {
    color: '#0ea5a4',
    fontSize: 14,
    fontWeight: '600',
  },
  detailServiceBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  detailServiceLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailServiceDesc: {
    color: '#2563eb',
    fontSize: 14,
    lineHeight: 20,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
  detailConclusaoText: {
    color: '#64748b',
    fontSize: 13,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailSectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '700',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checklistItemDone: {
    backgroundColor: '#f0fdf4',
  },
  checklistItemPending: {
    backgroundColor: '#f8fafc',
  },
  checklistIconDone: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checklistIconPending: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#cbd5e1',
    marginTop: 1,
    flexShrink: 0,
  },
  checklistLabel: {
    color: '#0f172a',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  checklistLabelPending: {
    color: '#94a3b8',
  },
  checklistSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    marginBottom: 18,
  },
  checklistSummaryText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  detailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  signatureBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  signaturePlaceholder: {
    color: '#94a3b8',
    fontSize: 14,
  },
  signedByText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
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
  motivoButton: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
  },
  motivoButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  motivoCard: {
    backgroundColor: '#fff8f0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd5a0',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 14,
    marginBottom: 20,
  },
  motivoText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
  },
  reagendarButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  reagendarButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  reagendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
  },
  reagendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  reagendarTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  reagendarSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 14,
    paddingLeft: 30,
  },
  reagendarLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  reagendarSelect: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reagendarSelectText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  reagendarRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 2,
  },
  reagendarInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#111827',
    fontSize: 15,
  },
  calendarWrapper: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  timePickerWrapper: {
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  timePickerCol: {
    flex: 1,
    paddingVertical: 8,
  },
  timePickerColTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 4,
  },
  timePickerDividerV: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  timePickerItem: {
    paddingVertical: 9,
    alignItems: 'center',
    marginHorizontal: 6,
    borderRadius: 8,
  },
  timePickerItemActive: {
    backgroundColor: '#7A1A1A',
  },
  timePickerItemText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  timePickerItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  atribuirFieldLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 14,
  },
  atribuirSelect: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  atribuirSelectText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '500',
  },
  atribuirConfirmButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  atribuirConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  atribuirCancelButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7A1A1A',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atribuirCancelButtonText: {
    color: '#7A1A1A',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AdmHomeScreen;
