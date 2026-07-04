import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageZoomModal from '../../components/ImageZoomModal';
import PhotoUploadModal from '../../components/PhotoUploadModal';
import { assignAdminService, createAdminServiceRequest, fetchAdminDashboardFromApi, fetchAdminServicesFromApi, fetchAdminTecnicosFromApi, getAdminApiKey, uploadAdminServiceContextPhoto, fetchAdminServiceFinalizacao, fetchAdminClientesFromApi, fetchAdminGerentesFromApi, type AdminDashboardData, type AdminTecnicoUser, type AdminCliente, type AdminGerenteUser } from '../../components/shared/admin/adminApi';
import AdminHeader from '../../components/shared/admin/AdminHeader';
import AdminOverviewCard from '../../components/shared/admin/AdminOverviewCard';
import StandardImage from '../../components/StandardImage';
import { formatLockDisplayName } from '../../constants/serviceDisplay';
import { apiFetch, API_BASE_URL } from '../../constants/api';
import { useUser } from '../../context/UserContext';
import type { AdminService, ChecklistItem, DropdownKey, FilterState, NaoRealizadoDetail, NewServiceForm, ReagendarForm, ServiceDetail, UploadedPhoto } from './components/types';

import {
  DEFAULT_FILTERS,
  PERIODO_OPTIONS,
  REAGENDAR_HOURS,
  REAGENDAR_MINUTES,
  STATUS_OPTIONS,
  statusBadgeColorByCode,
  statusFilterToCode,
  statusLabelByCode,
} from './components/constants';
import {
  formatOrdemServicoLabel,
  formatPedidoLabel,
  fromCalendarDate,
  getTodayCalendarDate,
  matchesPeriodo,
  normalizeDigits,
  normalizeSearchValue,
  toCalendarDate,
} from './components/utils';

// Valor padrão para formulário de novo serviço
const DEFAULT_NEW_SERVICE_FORM: NewServiceForm = {
  clientMode: 'new',
  clienteId: '',
  nomeCompleto: '',
  cpf: '',
  ie: '',
  tipo: '',
  telefone: '',
  celular: '',
  email: '',
  bling_pedido_id: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
  endereco: '',
  observacoes: '',
  descricao: '',
  valor: '',
  forma_de_pagamento: '',
  descricao_pagamento: '',
  chaveDePagamento: '',
  tecnicoResponsavel: '',
  dataHoraVisita: '',
};


const AdmHomeScreen = ({ isGerente = false }: { isGerente?: boolean } = {}) => {
  const { user } = useUser() as unknown as {
    user: {
      typeUser?: string;
      email?: string;
      name?: string;
      userId?: string;
    } | null;
  };
  const canUploadContextPhoto = String(user?.typeUser || '').toLowerCase() === 'admin';
  const route = useRoute();
  const navigation = useNavigation();
  const todayCalendarDate = getTodayCalendarDate();

  const closeAllDetailModals = useCallback(() => {
    setSelectedService(null);
    setSelectedNaoRealizado(null);
    setAtribuirVisible(false);

    const params = route.params as any;
    if (params?.fromTab) {
      (navigation as any).navigate(params.fromTab);
      navigation.setParams({ fromTab: undefined, selectedServiceId: undefined } as any);
    }
  }, [navigation, route.params]);

  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [selectedNaoRealizado, setSelectedNaoRealizado] = useState<NaoRealizadoDetail | null>(null);
  const [reagendarVisible, setReagendarVisible] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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
  const [gerentesApi, setGerentesApi] = useState<AdminGerenteUser[]>([]);
  const [clientesList, setClientesList] = useState<AdminCliente[]>([]);
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState<AdminCliente | null>(null);
  const [isLoadingClientes, setIsLoadingClientes] = useState(false);

  const [adicionarImagemVisible, setAdicionarImagemVisible] = useState(false);
  const [adicionarImagemTarget, setAdicionarImagemTarget] = useState<AdminService | null>(null);
  const [adicionarImagemPhotos, setAdicionarImagemPhotos] = useState<UploadedPhoto[]>([]);
  const [isAdicionarPickerVisible, setIsAdicionarPickerVisible] = useState(false);
  const [isAdicionarSending, setIsAdicionarSending] = useState(false);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminService | null>(null);
  const [editForm, setEditForm] = useState<Partial<AdminService>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const openEditModal = (item: AdminService) => {
    // Busca id do cliente usando o novo campo clienteId ou fallback
    const clienteId = item.clienteId || item.cliente_id || (item.cliente && typeof item.cliente === 'object' ? (item.cliente._id || item.cliente.id || item.cliente.$oid) : '');
    
    // Garante que editTarget sempre tenha cliente_id ou clienteId
    setEditTarget({ ...item, cliente_id: clienteId || '' });
    setEditForm({
      cliente: item.cliente || '',
      telefone: item.telefone || '',
      endereco: item.endereco || '',
      descricao: item.descricao || '',
      data: item.data || '',
      hora: item.hora || '',
      ...(clienteId ? { clienteId } : {}),
    });
    setIsEditModalVisible(true);
  };

  const closeEditModal = () => {
    setIsEditModalVisible(false);
    setEditTarget(null);
  };

  const setEditFormField = (field: keyof AdminService | 'clienteId', value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setIsSavingEdit(true);
    try {
      // nomeAntigo deve ser o nome original do cliente antes da edição
      let nomeAntigo = '';
      if (editTarget) {
        if (editTarget.cliente && typeof editTarget.cliente === 'object') {
          nomeAntigo = editTarget.cliente.nome || editTarget.cliente.cliente || editTarget.cliente.name || '';
        } else {
          nomeAntigo = editTarget.cliente || editTarget.nome || '';
        }
      }
      const nomeNovo = editForm.cliente || '';
      const telefoneNovo = editForm.telefone || '';
      const enderecoNovo = editForm.endereco || '';

      // Busca o serviço para pegar o cliente_id correto
      const pedidoId = editTarget.pedidoId || editTarget.id;

      let clienteId = undefined;
      try {
        const resServico = await apiFetch(`/api/services/${pedidoId}`);
        const servicoData = await resServico.json().catch(() => ({}));
        clienteId =
          servicoData?.service?.cliente_id ||
          servicoData?.service?.clienteId ||
          servicoData?.cliente_id ||
          servicoData?.clienteId ||
          servicoData?.service?.cliente?._id ||
          servicoData?.service?.cliente?.id ||
          servicoData?.service?.cliente?.$oid ||
          servicoData?.cliente?._id ||
          servicoData?.cliente?.id ||
          servicoData?.cliente?.$oid ||
          servicoData?.service?.cliente ||
          servicoData?.cliente ||
          '';
      } catch (e) {}

      // Se só for mudar o nome do cliente
      if (
        nomeAntigo &&
        nomeNovo &&
        nomeAntigo.trim() !== '' &&
        nomeNovo.trim() !== '' &&
        nomeAntigo.trim() !== nomeNovo.trim() &&
        (!clienteId || clienteId === '')
      ) {
        const payload = {
          nomeAntigo: nomeAntigo.trim(),
          nomeNovo: nomeNovo.trim(),
        };
        console.log('[DEBUG handleSaveEdit] PUT /servicos payload (só nome):', payload);
        const res = await fetch(
          `https://api-bling-990709313938.us-central1.run.app/api/servicos/editar-completo/${encodeURIComponent(pedidoId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.message || `Erro ${res.status}`);
        }
        await loadAdminServices();
        closeEditModal();
        Alert.alert('Sucesso', 'Nome do cliente atualizado com sucesso.');
        return;
      }

      // Monta o payload padrão
      const payload: any = {
        descricao_servico: editForm.descricao || '',
        status: '',
        data_agendada: editForm.data || '',
        hora_agendada: editForm.hora || '',
        observacoes: '',
        nome_cliente: nomeNovo,
        telefone_cliente: telefoneNovo,
        endereco_completo: enderecoNovo,
      };
      if (clienteId && typeof clienteId === 'string' && clienteId.trim() !== '') {
        payload.cliente_id = clienteId;
      }

      console.log('[DEBUG handleSaveEdit] PUT /servicos payload:', payload);
      const res = await fetch(
        `https://api-bling-990709313938.us-central1.run.app/api/servicos/editar-completo/${encodeURIComponent(pedidoId)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ${res.status}`);
      }

      await loadAdminServices();
      closeEditModal();
      Alert.alert('Sucesso', 'Serviço atualizado com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao salvar', error?.message || 'Falha ao atualizar.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const mergeAdicionarImagemPhotos = (incoming: UploadedPhoto[]) => {
    setAdicionarImagemPhotos((prev) => [...prev, ...incoming]);
  };

  const inferMimeType = (nameOrUri: string) => {
    const lower = String(nameOrUri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  };

  const buildPhotoFileName = (sourcePhoto: UploadedPhoto, mimeType: string) => {
    const fromSource = String(sourcePhoto.fileName || sourcePhoto.uri.split('/').pop() || '').trim();
    if (fromSource && /\.[a-z0-9]+$/i.test(fromSource)) return fromSource;
    const extByMime: Record<string, string> = { 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'image/jpeg': 'jpg' };
    return `foto.${extByMime[mimeType] || 'jpg'}`;
  };


  const fetchServiceFullData = async (serviceId: string) => {
    try {
      const res = await apiFetch(`/api/services/${serviceId}`);
      const data = await res.json().catch(() => ({}));

      return data?.service || data?.data || data;
    } catch (error) {
      console.warn('Erro ao buscar serviço completo:', error);
      return null;
    }
  };

  const openAdicionarImagemModal = async (item: AdminService) => {
    const fullService = await fetchServiceFullData(String(item.id));

    setAdicionarImagemTarget({
      ...item,
      ...(fullService || {}),
      id: item.id,
    } as AdminService);

    setAdicionarImagemPhotos([]);
    setIsAdicionarPickerVisible(false);
    setAdicionarImagemVisible(true);
  };

  const closeAdicionarImagemModal = () => {
    setAdicionarImagemVisible(false);
    setAdicionarImagemTarget(null);
    setAdicionarImagemPhotos([]);
  };

  const handleAdicionarImagemSave = async () => {
    if (!adicionarImagemTarget || adicionarImagemPhotos.length === 0) return;
    setIsAdicionarSending(true);
    try {
      let successCount = 0;
      const failedPhotos: UploadedPhoto[] = [];

      for (const photo of adicionarImagemPhotos) {
        try {
          const mimeType = photo.mimeType || inferMimeType(photo.fileName || photo.uri);
          const fileName = buildPhotoFileName(photo, mimeType);
          await uploadAdminServiceContextPhoto(adicionarImagemTarget.id, {
            uri: photo.uri,
            mimeType,
            fileName,
          });
          successCount += 1;
        } catch {
          failedPhotos.push(photo);
        }
      }

      if (successCount > 0) {
        await loadAdminServices();
      }

      if (failedPhotos.length === 0) {
        closeAdicionarImagemModal();
        Alert.alert('Sucesso', `${successCount} foto(s) enviada(s) com sucesso.`);
      } else {
        setAdicionarImagemPhotos(failedPhotos);
        Alert.alert(
          'Envio parcial',
          `${successCount} foto(s) enviada(s) e ${failedPhotos.length} falharam. Tente enviar novamente as restantes.`
        );
      }
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Nao foi possivel salvar a imagem.');
    } finally {
      setIsAdicionarSending(false);
    }
  };

  const openAtribuirModal = async (item: AdminService) => {
    const fullService = await fetchServiceFullData(String(item.id));

    setAtribuirTarget({
      ...item,
      ...(fullService || {}),
      id: item.id,
    } as AdminService);

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
        assignedByEmail: user?.email,
        assignedByName: user?.name,
        assignedById: user?.userId,
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
        assignedByEmail: user?.email,
        assignedByName: user?.name,
        assignedById: user?.userId,
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

const openDetailModal = async (item: AdminService) => {
  const fullService = await fetchServiceFullData(String(item.id));
  const finalizacao = await fetchAdminServiceFinalizacao(String(item.id));

  const mergedItem = {
    ...item,
    ...(fullService || {}),
    id: item.id,
  } as AdminService;

  const rawChecklist = Array.isArray(finalizacao?.checklist) && finalizacao.checklist.length > 0
    ? finalizacao.checklist
    : Array.isArray(mergedItem.checklist)
      ? mergedItem.checklist
      : [];

  const checklistFromApi: ChecklistItem[] = rawChecklist.map((check: any, idx) => ({
        id: `${mergedItem.id}-check-${idx}`,
        label: String(check?.item || check?.label || `Item ${idx + 1}`),
        done: Boolean(check?.status ?? check?.done),
      }));

  const hasComprovante = !!(
    mergedItem.has_comprovante ||
    mergedItem.hasComprovante ||
    (fullService as any)?.has_comprovante ||
    (fullService as any)?.comprovante_pagamento
  );

  const comprovanteUri = hasComprovante
    ? encodeURI(`${API_BASE_URL}/api/admin/services/comprovante/${item.id}`)
    : undefined;

  setSelectedService({
    ...(mergedItem as any),
    checklist: checklistFromApi,
    fotoUri: mergedItem.fotoUri || finalizacao?.fotos?.[0],
    fotosContextoUris: finalizacao?.fotos?.length ? finalizacao.fotos : mergedItem.fotosContextoUris || [],
    assinaturaUri: finalizacao?.assinatura || mergedItem.assinaturaUri,
    observacoes: finalizacao?.observacoes || mergedItem.observacoes,
    comprovanteUri,
    motivoSemComprovante: mergedItem.motivoSemComprovante || finalizacao?.motivoSemComprovante || item.motivoSemComprovante || (mergedItem as any).motivo_sem_comprovante || (finalizacao as any)?.motivo_sem_comprovante || undefined,
  });
};

  const openNaoRealizadoModal = async (item: AdminService) => {
    const fullService = await fetchServiceFullData(String(item.id));

    setSelectedNaoRealizado({
      ...item,
      ...(fullService || {}),
      id: item.id,
      motivoCompleto: item.motivo ?? fullService?.nao_realizado_motivo ?? 'Motivo nao informado.',
    } as NaoRealizadoDetail);
  };
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const [services, setServices] = useState<AdminService[]>([]);
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [newServiceForm, setNewServiceForm] = useState<NewServiceForm>(DEFAULT_NEW_SERVICE_FORM);
  const [isCreatingService, setIsCreatingService] = useState(false);

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

  const loadClientes = async () => {
    try {
      setIsLoadingClientes(true);
      const list = await fetchAdminClientesFromApi();
      setClientesList(list);
    } catch (e) {
      console.warn('Erro ao carregar clientes:', e);
    } finally {
      setIsLoadingClientes(false);
    }
  };

  const openCreateModal = () => {
    setNewServiceForm(DEFAULT_NEW_SERVICE_FORM);
    setIsAssignDropdownOpen(false);
    setSearchClientQuery('');
    setSelectedClient(null);
    setIsCreateModalVisible(true);
    loadClientes();
  };

  const closeCreateModal = () => {
    setIsCreateModalVisible(false);
    setIsAssignDropdownOpen(false);
  };

  const setFormField = (field: keyof NewServiceForm, value: string) => {
    setNewServiceForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseVisitDateTime = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return {
        dataAgendadaIso: tomorrow.toISOString().slice(0, 10),
        horaAgendada: '09:00',
      };
    }

    const match = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(\d{1,2}):(\d{2})/);
    if (!match) {
      const onlyDate = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!onlyDate) return null;
      const [, d, m, y] = onlyDate;
      return {
        dataAgendadaIso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
        horaAgendada: '09:00',
      };
    }

    const [, d, m, y, h, min] = match;
    return {
      dataAgendadaIso: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
      horaAgendada: `${h.padStart(2, '0')}:${min}`,
    };
  };

  const handleCreateService = async () => {
    if (
      !newServiceForm.nomeCompleto.trim() ||
      !newServiceForm.telefone.trim() ||
      !newServiceForm.cep.trim() ||
      !newServiceForm.email.trim() ||
      !newServiceForm.endereco.trim() ||
      !newServiceForm.descricao.trim()
    ) {
      Alert.alert('Campos obrigatorios', 'Preencha nome, telefone, CEP, e-mail, endereco e descricao.');
      return;
    }

    const schedule = parseVisitDateTime(newServiceForm.dataHoraVisita);
    if (!schedule) {
      Alert.alert('Data invalida', 'Use o formato dd/mm/aaaa hh:mm ou deixe em branco para agendar automaticamente.');
      return;
    }

    const selectedTecnico = combinedTecnicosAndGerentes.find((tecnico) => tecnico.nome === newServiceForm.tecnicoResponsavel) || null;
    const tecnicoId = selectedTecnico && newServiceForm.tecnicoResponsavel !== 'Selecionar depois' ? selectedTecnico.id : undefined;

    try {
      setIsCreatingService(true);
      await createAdminServiceRequest({
        nomeCompleto: newServiceForm.nomeCompleto.trim(),
        telefone: newServiceForm.telefone.trim(),
        email: newServiceForm.email.trim(),
        cep: newServiceForm.cep.trim(),
        endereco: newServiceForm.endereco.trim(),
        descricao: newServiceForm.descricao.trim(),
        observacoes: newServiceForm.observacoes.trim() || undefined,
        dataAgendadaIso: schedule.dataAgendadaIso,
        horaAgendada: schedule.horaAgendada,
        tecnicoId,
        clienteId: newServiceForm.clientMode === 'existing' ? newServiceForm.clienteId : undefined,
      });

      closeCreateModal();
      await loadAdminServices();
      Alert.alert('Pedido criado', 'Cadastro realizado com sucesso.');
    } catch (error) {
      Alert.alert('Falha ao criar pedido', error instanceof Error ? error.message : 'Nao foi possivel criar o pedido.');
    } finally {
      setIsCreatingService(false);
    }
  };

  const loadAdminServices = useCallback(async () => {
    if (!hasLoadedOnce) {
      setIsLoading(true);
    }

    try {
      const [nextServices, nextTecnicos, nextDash, nextGerentes] = await Promise.all([
        fetchAdminServicesFromApi(),
        fetchAdminTecnicosFromApi(),
        fetchAdminDashboardFromApi(),
        fetchAdminGerentesFromApi(),
      ]);
      setServices(nextServices);
      setDashboardData(nextDash);
      setLoadError(null);
      setTecnicosApi(nextTecnicos);
      setGerentesApi(nextGerentes);
    } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Nao foi possivel carregar os dados da area admin.');
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

  // Deep linking: abre detalhe se receber selectedServiceId via navegação
  useEffect(() => {
    const params = route.params as any;
    if (params?.selectedServiceId && services.length > 0) {
      const serviceId = String(params.selectedServiceId);
      const found = services.find((s) => String(s.id) === serviceId);
      if (found) {
        openDetailModal(found);
        // Limpa o parâmetro para não abrir novamente ao voltar para a tela
        navigation.setParams({ selectedServiceId: undefined } as any);
      }
    }
  }, [route.params, services, navigation]);

  const stats = useMemo(() => {
    return {
      aguardando: dashboardData?.resumo.aguardando || 0,
      atribuidos: dashboardData?.resumo.atribuidos || 0,
      concluidos: dashboardData?.resumo.concluidos || 0,
      total: dashboardData?.resumo.total || 0,
    };
  }, [dashboardData]);

  const combinedTecnicosAndGerentes = useMemo(() => {
    const list = [
      ...tecnicosApi.map(t => ({ id: t.id, nome: t.nome, email: t.email, telefone: t.telefone })),
      ...gerentesApi.map(g => ({ id: g.id, nome: g.nome, email: g.email, telefone: g.telefone }))
    ];
    const unique: typeof list = [];
    const seen = new Set<string>();
    for (const item of list) {
      if (item.nome && !seen.has(item.nome)) {
        seen.add(item.nome);
        unique.push(item);
      }
    }
    return unique.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tecnicosApi, gerentesApi]);

  const tecnicoOptions = useMemo(() => {
    const dynamicTecnicos = [
      ...new Set([
        ...services.map((service) => service.tecnico).filter((name) => name && name !== 'Nao atribuido'),
        ...combinedTecnicosAndGerentes.map((t) => t.nome),
      ]),
    ].sort();
    return ['Todos os Tecnicos', ...dynamicTecnicos];
  }, [services, combinedTecnicosAndGerentes]);

  const createAssignOptions = useMemo(() => {
    return ['Selecionar depois', ...combinedTecnicosAndGerentes.map((t) => t.nome)];
  }, [combinedTecnicosAndGerentes]);

  const tecnicoAtribuidoSelecionado = useMemo(() => {
    return combinedTecnicosAndGerentes.find((tecnico) => tecnico.id === atribuirForm.tecnicoId) || null;
  }, [combinedTecnicosAndGerentes, atribuirForm.tecnicoId]);

  const tecnicoReagendarSelecionado = useMemo(() => {
    return combinedTecnicosAndGerentes.find((tecnico) => tecnico.id === reagendarForm.tecnicoId) || null;
  }, [combinedTecnicosAndGerentes, reagendarForm.tecnicoId]);

  const filteredServices = useMemo(() => {
    const statusCode = statusFilterToCode[appliedFilters.status] ?? null;
    const normalizedQuery = normalizeSearchValue(searchQuery);
    const queryDigits = normalizeDigits(searchQuery);

    return services.filter((service) => {
      const matchesStatus = statusCode ? service.status === statusCode : true;
      const matchesTecnico =
        appliedFilters.tecnico === 'Todos os Tecnicos'
          ? true
          : String(service.tecnico || '').toLowerCase().trim() === String(appliedFilters.tecnico || '').toLowerCase().trim();
      const matchesPeriodoFilter = matchesPeriodo(service.data, appliedFilters.periodo);
      const ordemDeServico = String(service.numeroOrdemServico || '');
      const numeroPedido = String(service.numeroPedido || '');

      const searchableValues = [
        numeroPedido,
        ordemDeServico,
        service.cliente,
        service.telefone,
        service.tecnico,
        service.endereco,
        service.descricao,
        service.data,
        service.hora,
      ];

      const searchableDigits = [numeroPedido, ordemDeServico]
        .map((value) => normalizeDigits(value))
        .filter(Boolean);

      const matchesSearch =
        !normalizedQuery ||
        searchableValues.some((value) => normalizeSearchValue(value).includes(normalizedQuery)) ||
        Boolean(queryDigits && searchableDigits.some((value) => value.includes(queryDigits)));

      return matchesStatus && matchesTecnico && matchesPeriodoFilter && matchesSearch;
    });
  }, [appliedFilters, searchQuery, services]);


  const renderPaymentInfo = (item: any) => {
    const descricaoPagamento = String(item?.descricao_pagamento || '')
      .replace(/pix/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    const valor = item?.valor;

    return (
      <>
        <View style={styles.detailDivider} />

        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Forma de Pagamento</Text>
          <Text style={styles.paymentInfoValue}>{item?.forma_de_pagamento || '-'}</Text>
        </View>

        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Descrição</Text>
          <Text style={styles.paymentInfoValue}>{descricaoPagamento || '-'}</Text>
        </View>

        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Chave</Text>
          <Text style={styles.paymentInfoValue}>{item?.chaveDePagamento || '-'}</Text>
        </View>

        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Valor</Text>
          <Text style={styles.paymentInfoValue}>
            {valor || valor === 0
              ? Number(valor).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })
              : '-'}
          </Text>
        </View>

        <View style={styles.paymentInfoRow}>
          <Text style={styles.paymentInfoLabel}>Observações</Text>
          <Text style={styles.paymentInfoValue}>{item?.observacoes || '-'}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.container}>

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
            placeholder="Buscar por ID, ordem de serviço, nome, telefone..."
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

        {!isLoading && loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Falha ao carregar rotas admin</Text>
            <Text style={styles.emptySubtitle}>{loadError}</Text>
            <TouchableOpacity style={styles.retryLoadButton} activeOpacity={0.9} onPress={loadAdminServices}>
              <Text style={styles.retryLoadButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {filteredServices.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.orderCard}
            activeOpacity={item.status === 'concluido' || item.status === 'atribuido' ? 0.8 : 1}
            onPress={() => {
            if (item.status === 'concluido' || item.status === 'atribuido') openDetailModal(item);
          }}
          >
            <View style={styles.orderTopRow}>
              <View style={styles.orderIdentityRow}>
                <Text style={styles.orderId}>{formatPedidoLabel(item.numeroPedido)}</Text>
                {formatOrdemServicoLabel(item.numeroOrdemServico) ? (
                  <View style={styles.osBadge}>
                    <Text style={styles.osBadgeText}>{formatOrdemServicoLabel(item.numeroOrdemServico)}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Feather name="edit-2" size={18} color="#64748b" />
                </TouchableOpacity>
                <Text style={[styles.orderBadge, { backgroundColor: statusBadgeColorByCode[item.status] }]}>
                  {statusLabelByCode[item.status]}
                </Text>
              </View>
            </View>

            <Text style={styles.clientName}>{item.cliente}</Text>

            <View style={styles.infoRow}>
              <Feather name="phone" size={16} color="#16a34a" />
              <Text style={styles.infoText}>{item.telefone || 'Telefone nao informado'}</Text>
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

            {item.status === 'aguardando' && canUploadContextPhoto ? (
              <TouchableOpacity style={styles.imageButton} activeOpacity={0.9} onPress={() => openAdicionarImagemModal(item)}>
                <Text style={styles.imageButtonText}>Adicionar Imagem</Text>
              </TouchableOpacity>
            ) : null}

            {item.status === 'aguardando' ? (
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
                <Text style={styles.motivoButtonText}>Ver/Editar Motivo</Text>
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
            <ScrollView contentContainerStyle={styles.createModalContent} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              <Text style={styles.createTitle}>Cadastrar Novo Pedido</Text>
              <Text style={styles.createSubtitle}>Selecione um cliente existente ou cadastre um novo para o serviço</Text>

              {/* Segmented control for Client Mode */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    newServiceForm.clientMode === 'existing' && styles.tabButtonActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFormField('clientMode', 'existing');
                    setSelectedClient(null);
                    setFormField('clienteId', '');
                    setFormField('nomeCompleto', '');
                    setFormField('telefone', '');
                    setFormField('email', '');
                    setFormField('cep', '');
                    setFormField('endereco', '');
                  }}
                >
                  <Feather
                    name="users"
                    size={16}
                    color={newServiceForm.clientMode === 'existing' ? '#fff' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      newServiceForm.clientMode === 'existing' && styles.tabButtonTextActive,
                    ]}
                  >
                    Cliente Existente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tabButton,
                    newServiceForm.clientMode === 'new' && styles.tabButtonActive,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setFormField('clientMode', 'new');
                    setSelectedClient(null);
                    setFormField('clienteId', '');
                    setFormField('nomeCompleto', '');
                    setFormField('telefone', '');
                    setFormField('email', '');
                    setFormField('cep', '');
                    setFormField('endereco', '');
                  }}
                >
                  <Feather
                    name="user-plus"
                    size={16}
                    color={newServiceForm.clientMode === 'new' ? '#fff' : '#475569'}
                  />
                  <Text
                    style={[
                      styles.tabButtonText,
                      newServiceForm.clientMode === 'new' && styles.tabButtonTextActive,
                    ]}
                  >
                    Novo Cliente
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Client Search Section */}
              {newServiceForm.clientMode === 'existing' && (
                <View style={styles.clientSearchSection}>
                  <View style={styles.clientSearchBox}>
                    <Feather name="search" size={18} color="#94a3b8" />
                    <TextInput
                      style={styles.clientSearchInput}
                      placeholder="Buscar cliente por nome, telefone ou e-mail..."
                      placeholderTextColor="#94a3b8"
                      value={searchClientQuery}
                      onChangeText={setSearchClientQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                    {searchClientQuery ? (
                      <TouchableOpacity onPress={() => setSearchClientQuery('')}>
                        <Feather name="x-circle" size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Results List */}
                  {searchClientQuery.trim().length > 0 && (() => {
                    const normalizedQuery = searchClientQuery.toLowerCase().trim();
                    const filtered = clientesList.filter(
                      (c) =>
                        c.nome.toLowerCase().includes(normalizedQuery) ||
                        c.telefone.includes(normalizedQuery) ||
                        c.email.toLowerCase().includes(normalizedQuery)
                    );

                    if (filtered.length === 0) {
                      return (
                        <View style={styles.noClientsFound}>
                          <Text style={styles.noClientsFoundText}>Nenhum cliente correspondente.</Text>
                        </View>
                      );
                    }

                    return (
                      <View style={styles.clientResultsContainer}>
                        {filtered.slice(0, 5).map((c) => {
                          const isSelected = selectedClient?.id === c.id;
                          return (
                            <TouchableOpacity
                              key={c.id}
                              style={[
                                styles.clientResultItem,
                                isSelected && styles.clientResultItemActive,
                              ]}
                              onPress={() => {
                                setSelectedClient(c);
                                setFormField('clienteId', c.id);
                                setFormField('nomeCompleto', c.nome);
                                setFormField('telefone', c.telefone);
                                setFormField('email', c.email);
                                setFormField('cep', c.cep || '');
                                const formattedEnd = [c.rua, c.numero, c.bairro, c.cidade, c.estado]
                                  .filter(Boolean)
                                  .join(', ');
                                setFormField('endereco', formattedEnd);
                                setSearchClientQuery('');
                              }}
                            >
                              <View style={styles.clientResultAvatar}>
                                <Feather name="user" size={16} color="#7A1A1A" />
                              </View>
                              <View style={styles.clientResultInfo}>
                                <Text style={styles.clientResultName}>{c.nome}</Text>
                                <Text style={styles.clientResultDetails}>
                                  {c.telefone}
                                  {c.email ? ` • ${c.email}` : ''}
                                </Text>
                              </View>
                              <Feather
                                name={isSelected ? 'check-circle' : 'chevron-right'}
                                size={18}
                                color={isSelected ? '#10b981' : '#94a3b8'}
                              />
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Selected Client Card */}
              {newServiceForm.clientMode === 'existing' && selectedClient && (
                <View style={styles.selectedClientCard}>
                  <View style={styles.selectedClientCardHeader}>
                    <Feather name="user-check" size={20} color="#15803d" />
                    <Text style={styles.selectedClientCardTitle}>Cliente Selecionado</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedClient(null);
                        setFormField('clienteId', '');
                        setFormField('nomeCompleto', '');
                        setFormField('telefone', '');
                        setFormField('email', '');
                        setFormField('cep', '');
                        setFormField('endereco', '');
                      }}
                      style={styles.clearSelectedClientBtn}
                    >
                      <Feather name="x" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.selectedClientBody}>
                    <Text style={styles.selectedClientName}>{selectedClient.nome}</Text>
                    <Text style={styles.selectedClientContact}>
                      {selectedClient.telefone}
                      {selectedClient.email ? ` • ${selectedClient.email}` : ''}
                    </Text>
                    {selectedClient.cep && (
                      <Text style={styles.selectedClientAddress}>CEP: {selectedClient.cep}</Text>
                    )}
                    {(selectedClient.rua || selectedClient.cidade) && (
                      <Text style={styles.selectedClientAddress}>
                        {[
                          selectedClient.rua,
                          selectedClient.numero,
                          selectedClient.bairro,
                          selectedClient.cidade,
                          selectedClient.estado,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Form Input fields - Only visible in new client mode */}
              {newServiceForm.clientMode === 'new' && (
                <>
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
                </>
              )}

              {/* Service & Schedule Section */}
              {(newServiceForm.clientMode === 'new' || selectedClient) && (
                <>
                  <View style={styles.sectionHeader}>
                    <Feather name="box" size={18} color="#7A1A1A" />
                    <Text style={styles.sectionTitle}>Servico</Text>
                  </View>

                  <Text style={styles.inputLabel}>Descricao *</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Ex: Instalacao de Fechadura Digital ServiYama SY-500"
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
                      {createAssignOptions.map((option, index) => {
                        const isSelected = newServiceForm.tecnicoResponsavel === option;
                        return (
                          <TouchableOpacity
                            key={option}
                            style={[
                              styles.dropdownOption,
                              isSelected && styles.dropdownOptionSelected,
                              index === createAssignOptions.length - 1 && styles.dropdownOptionLast,
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

                  <TouchableOpacity
                    style={[styles.createButton, isCreatingService && { opacity: 0.7 }]}
                    activeOpacity={0.9}
                    onPress={handleCreateService}
                    disabled={isCreatingService}
                  >
                    <Feather name="check-circle" size={18} color="#fff" />
                    <Text style={styles.createButtonText}>{isCreatingService ? 'Criando...' : 'Criar Pedido'}</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity style={styles.cancelCreateButton} activeOpacity={0.9} onPress={closeCreateModal}>
                <Text style={styles.cancelCreateButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Serviço */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            <ScrollView contentContainerStyle={styles.createModalContent} showsVerticalScrollIndicator
            >
              <Text style={styles.createTitle}>Editar Serviço</Text>
              <Text style={styles.createSubtitle}>Altere os dados do cliente e do serviço</Text>

              <View style={styles.sectionHeader}>
                <Feather name="user" size={18} color="#7A1A1A" />
                <Text style={styles.sectionTitle}>Dados do Cliente</Text>
              </View>

              <Text style={styles.inputLabel}>Cliente *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Joao da Silva"
                placeholderTextColor="#64748b"
                value={editForm.cliente}
                onChangeText={(value) => setEditFormField('cliente', value)}
              />

              <Text style={styles.inputLabel}>Telefone</Text>
              <TextInput
                style={styles.input}
                placeholder="(11) 98765-4321"
                placeholderTextColor="#64748b"
                value={editForm.telefone}
                onChangeText={(value) => setEditFormField('telefone', value)}
              />

              <Text style={styles.inputLabel}>Endereco Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Rua, numero - Bairro, Cidade"
                placeholderTextColor="#64748b"
                value={editForm.endereco}
                onChangeText={(value) => setEditFormField('endereco', value)}
              />

              <View style={styles.rowTwoColumns}>
                <View style={styles.columnHalf}>
                  <Text style={styles.inputLabel}>Data (dd/mm/aaaa)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="dd/mm/aaaa"
                    placeholderTextColor="#64748b"
                    value={editForm.data}
                    onChangeText={(value) => setEditFormField('data', value)}
                  />
                </View>

                <View style={styles.columnHalf}>
                  <Text style={styles.inputLabel}>Hora (HH:MM)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="--:--"
                    placeholderTextColor="#64748b"
                    value={editForm.hora}
                    onChangeText={(value) => setEditFormField('hora', value)}
                  />
                </View>
              </View>

              <View style={styles.createDivider} />

              <TouchableOpacity 
                style={[styles.createButton, isSavingEdit && { opacity: 0.7 }]} 
                activeOpacity={0.9} 
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="save" size={18} color="#fff" />
                )}
                <Text style={styles.createButtonText}>Salvar Alterações</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelCreateButton} activeOpacity={0.9} onPress={closeEditModal} disabled={isSavingEdit}>
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
        onRequestClose={closeAllDetailModals}
      >
        {selectedNaoRealizado ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            <View style={[styles.detailHeader, { backgroundColor: '#374151' }]}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={closeAllDetailModals}
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
                  <Text style={styles.detailInfoText}>{selectedNaoRealizado.telefone || 'Telefone nao informado'}</Text>
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

                {renderPaymentInfo(selectedNaoRealizado)}
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
                onPress={closeAllDetailModals}
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
        onRequestClose={closeAllDetailModals}
      >
        {atribuirTarget ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={closeAllDetailModals}
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
                  <Text style={styles.detailInfoText}>{atribuirTarget.telefone || 'Telefone nao informado'}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="map-pin" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{atribuirTarget.endereco}</Text>
                </View>
                <View style={styles.detailServiceBox}>
                  <Text style={styles.detailServiceLabel}>Servico:</Text>
                  <Text style={styles.detailServiceDesc}>{formatLockDisplayName(atribuirTarget.descricao)}</Text>
                </View>

                {renderPaymentInfo(atribuirTarget)}
              </View>

              <View style={styles.detailSectionHeader}>
                <Feather name="camera" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Foto de Contexto</Text>
              </View>

              {/* Extração robusta de fotos de contexto vindas nativamente do parser */}
              {(() => {
                const contextPhotoUris = atribuirTarget.fotosContextoUris || [];
                if (contextPhotoUris.length > 0) {
                  return (
                    <View style={styles.contextPhotosContainer}>
                      <Text style={styles.contextCounter}>
                        {contextPhotoUris.length} foto(s) de contexto
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.contextPhotosRow}
                      >
                        {contextPhotoUris.map((uri, index) => (
                          <StandardImage
                            key={`${uri}-${index}`}
                            source={uri}
                            onPress={() => setZoomedImage(uri)}
                            containerStyle={styles.detailPhotoContainerHorizontal}
                            imageStyle={styles.detailPhotoHorizontal}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  );
                } else if (atribuirTarget.fotoUri) {
                  return (
                    <StandardImage
                      source={atribuirTarget.fotoUri}
                      onPress={() => setZoomedImage(atribuirTarget.fotoUri!)}
                      containerStyle={styles.detailPhotoContainer}
                      imageStyle={styles.detailPhoto}
                    />
                  );
                } else {
                  return (
                    <View style={styles.signatureBox}>
                      <Text style={styles.signaturePlaceholder}>Nenhuma foto de contexto enviada</Text>
                    </View>
                  );
                }
              })()}

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
                  {combinedTecnicosAndGerentes.map((option, index, arr) => {
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
                    minDate={todayCalendarDate}
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

      {/* Modal Adicionar Imagem */}
      <Modal
        visible={adicionarImagemVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeAdicionarImagemModal}
      >
        {adicionarImagemTarget ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={closeAdicionarImagemModal}
              >
                <Feather name="chevron-left" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={styles.detailHeaderInfo}>
                <View style={styles.detailHeaderIcon}>
                  <Feather name="camera" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.detailHeaderTitle}>Adicionar Imagem</Text>
                  <Text style={styles.detailHeaderSub}>
                    {formatPedidoLabel(adicionarImagemTarget.numeroPedido)} - {adicionarImagemTarget.cliente}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailCard}>
                <Text style={styles.detailCardSectionTitle}>Informacoes do Cliente:</Text>
                <View style={styles.detailInfoRow}>
                  <Feather name="user" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{adicionarImagemTarget.cliente}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="phone" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{adicionarImagemTarget.telefone || 'Telefone nao informado'}</Text>
                </View>
                <View style={styles.detailInfoRow}>
                  <Feather name="map-pin" size={16} color="#64748b" />
                  <Text style={styles.detailInfoText}>{adicionarImagemTarget.endereco}</Text>
                </View>
                <View style={styles.detailServiceBox}>
                  <Text style={styles.detailServiceLabel}>Servico:</Text>
                  <Text style={styles.detailServiceDesc}>{formatLockDisplayName(adicionarImagemTarget.descricao)}</Text>
                </View>

                {renderPaymentInfo(adicionarImagemTarget)}
              </View>

              <Text style={styles.atribuirFieldLabel}>Foto da Porta do Cliente (Opcional)</Text>

              <TouchableOpacity
                style={styles.fotoPickerRow}
                activeOpacity={0.85}
                disabled={isAdicionarSending}
                onPress={() => setIsAdicionarPickerVisible(true)}
              >
                <View style={styles.fotoPickerButton}>
                  <Text style={styles.fotoPickerButtonText}>Escolher arquivo</Text>
                </View>
                <Text style={styles.fotoPickerFileName} numberOfLines={1}>
                  {adicionarImagemPhotos.length > 0
                    ? `${adicionarImagemPhotos.length} arquivo(s) escolhido(s)`
                    : 'Nenhum ...escolhido'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.fotoPickerHelperText}>
                Adicione uma ou mais fotos da porta onde sera instalada a fechadura
              </Text>

              {adicionarImagemPhotos[0]?.uri ? (
                <StandardImage
                  source={adicionarImagemPhotos[0].uri}
                  onPress={() => setZoomedImage(adicionarImagemPhotos[0].uri)}
                  containerStyle={styles.fotoPreviewContainer}
                  imageStyle={styles.fotoPreview}
                />
              ) : null}

              {adicionarImagemPhotos.length > 1 ? (
                <Text style={styles.fotoPickerHelperText}>+{adicionarImagemPhotos.length - 1} foto(s) pronta(s) para envio</Text>
              ) : null}

              <View style={{ height: 24 }} />

              <TouchableOpacity
                style={[styles.atribuirConfirmButton, (adicionarImagemPhotos.length === 0 || isAdicionarSending) && { opacity: 0.55 }]}
                activeOpacity={0.9}
                disabled={adicionarImagemPhotos.length === 0 || isAdicionarSending}
                onPress={handleAdicionarImagemSave}
              >
                {isAdicionarSending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Feather name="check-circle" size={18} color="#fff" />}
                <Text style={styles.atribuirConfirmButtonText}>
                  {isAdicionarSending ? 'Enviando...' : 'Enviar Imagens'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.atribuirCancelButton, { marginTop: 10 }]}
                activeOpacity={0.9}
                onPress={closeAdicionarImagemModal}
              >
                <Text style={styles.atribuirCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>

            <PhotoUploadModal
              visible={isAdicionarPickerVisible}
              onClose={() => setIsAdicionarPickerVisible(false)}
              onBack={() => setIsAdicionarPickerVisible(false)}
              allowMultiple
              onNext={(p: UploadedPhoto) => {
                mergeAdicionarImagemPhotos([p]);
                setIsAdicionarPickerVisible(false);
              }}
              onNextMany={(photos: UploadedPhoto[]) => {
                mergeAdicionarImagemPhotos(photos);
                setIsAdicionarPickerVisible(false);
              }}
            />
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
                {combinedTecnicosAndGerentes.map((option, index, arr) => {
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
                  minDate={todayCalendarDate}
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
        onRequestClose={closeAllDetailModals}
      >
        {selectedService ? (
          <SafeAreaView style={styles.detailContainer}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity
                style={styles.detailBackButton}
                activeOpacity={0.8}
                onPress={closeAllDetailModals}
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
                  <Text style={styles.detailInfoText}>{selectedService.telefone || 'Telefone nao informado'}</Text>
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

                {renderPaymentInfo(selectedService)}

                <View style={styles.detailDivider} />
                <Text style={styles.detailConclusaoText}>
                  Concluido em: {selectedService.dataConclusao || selectedService.data} as {selectedService.horaConclusao || 'Horario nao informado'}
                </Text>
              </View>

              {/* Checklist */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Checklist de Instalacao</Text>
              </View>

              {selectedService.checklist?.length ? (
                <>
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
                </>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>Checklist nao enviado</Text>
                  <Text style={styles.emptySubtitle}>Este servico ainda nao possui checklist salvo no backend.</Text>
                </View>
              )}

              {/* Fotos de Contexto */}
              <View style={styles.detailSectionHeader}>
                <Feather name="camera" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Foto de Contexto</Text>
              </View>

              {(() => {
                const contextPhotoUris = selectedService.fotosContextoUris || [];
                if (contextPhotoUris.length > 0) {
                  return (
                    <View style={[styles.contextPhotosContainer, { marginBottom: 18 }]}> 
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.contextPhotosRow}
                      >
                        {contextPhotoUris.map((uri, index) => (
                          <StandardImage
                            key={`${uri}-${index}`}
                            source={uri}
                            onPress={() => setZoomedImage(uri)}
                            containerStyle={styles.contextPhotoContainerDetail}
                            imageStyle={styles.contextPhotoDetail}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  );
                }
                return (
                  <View style={styles.signatureBox}>
                    <Text style={styles.signaturePlaceholder}>Nenhuma foto de contexto enviada</Text>
                  </View>
                );
              })()}
      {/* Modal de zoom de imagem movido para o final do componente */}

              {/* Foto */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Foto do Serviço</Text>
              </View>

              {/* Só mostra a foto de instalação se ela não estiver nas fotos de contexto válidas */}
              {(() => {
                const install = String(selectedService.fotoUri || '').trim().replace(/\\/g, '/').toLowerCase();
                if (!install || install === '/' || install === 'null' || install === 'undefined' || install === '[object object]' || install === 'nan') {
                  return (
                    <View style={styles.signatureBox}>
                      <Text style={styles.signaturePlaceholder}>Nenhuma foto enviada pelo tecnico</Text>
                    </View>
                  );
                }
                const contextList = (selectedService.fotosContextoUris || [])
                  .map(u => String(u || '').trim().replace(/\\/g, '/').toLowerCase())
                  .filter(n => n && n !== '/' && n !== 'null' && n !== 'undefined' && n !== '[object object]' && n !== 'nan');
                if (contextList.includes(install)) {
                  // Não mostra duplicada
                  return null;
                }
                return (
                  <StandardImage
                    source={selectedService.fotoUri}
                    onPress={() => setZoomedImage(selectedService.fotoUri!)}
                    containerStyle={styles.detailPhotoContainer}
                    imageStyle={styles.detailPhoto}
                  />
                );
              })()}

              {/* Comprovante de Pagamento */}
              {(() => {
                const hasCobranca = selectedService.checklist?.some((c) => c.label?.includes('Cobrança feita') && c.done);
                const hasComprovante = selectedService.comprovanteUri && String(selectedService.comprovanteUri).trim() !== '';
                const motivoSem = selectedService.motivoSemComprovante;

                if (!hasCobranca && !hasComprovante && !motivoSem) return null;

                const apiKey = getAdminApiKey();

                return (
                  <>
                    <View style={styles.detailSectionHeader}>
                      <Feather name="dollar-sign" size={20} color="#7A1A1A" />
                      <Text style={styles.detailSectionTitle}>Comprovante de Pagamento</Text>
                    </View>
                    
                    {hasComprovante ? (
                      <StandardImage
                        source={{
                          uri: selectedService.comprovanteUri!,
                          headers: apiKey ? { 'x-admin-key': apiKey } : { 'x-user-type': 'admin' }
                        }}
                        onPress={() => setZoomedImage(selectedService.comprovanteUri!)}
                        containerStyle={styles.detailPhotoContainer}
                        imageStyle={styles.detailPhoto}
                      />
                    ) : motivoSem ? (
                      <View style={styles.motivoCard}>
                        <Text style={styles.motivoText}>
                          <Text style={{ fontWeight: 'bold' }}>Sem Comprovante</Text>
                          {'\n'}Motivo informado: {motivoSem}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.motivoCard, { borderColor: '#fca5a5', backgroundColor: '#fef2f2', borderLeftColor: '#ef4444' }]}>
                        <Text style={[styles.motivoText, { color: '#991b1b' }]}>
                          Nenhum comprovante de pagamento enviado.
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* Assinatura */}
              <View style={styles.detailSectionHeader}>
                <Feather name="check-circle" size={20} color="#7A1A1A" />
                <Text style={styles.detailSectionTitle}>Assinatura do Cliente</Text>
              </View>

              {selectedService.assinaturaUri ? (
                <View style={styles.signatureBox}>
                  <Image
                    source={{ uri: selectedService.assinaturaUri }}
                    style={styles.signatureImage}
                    contentFit="contain"
                  />
                </View>
              ) : (
                <View style={styles.signatureBox}>
                  <Text style={styles.signaturePlaceholder}>Nenhuma assinatura enviada</Text>
                </View>
              )}
              {selectedService.assinadoPor ? (
                <Text style={styles.signedByText}>Assinado por {selectedService.assinadoPor}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.closeDetailButton}
                activeOpacity={0.9}
                onPress={closeAllDetailModals}
              >
                <Text style={styles.closeDetailButtonText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>
      <ImageZoomModal
        visible={!!zoomedImage}
        imageUri={zoomedImage}
        onClose={() => setZoomedImage(null)}
      />
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
    backgroundColor: '#fff' // Corrigido para fundo branco padrão do app
  },
  header: {
    backgroundColor: '#2a0000',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 22,
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
    marginTop: 22,
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
    backgroundColor: '#fbfbfb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dbe0',
    borderLeftWidth: 3,
    borderLeftColor: '#d69f2f',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: '#c48a00',
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
  imageButton: {
    marginTop: 12,
    backgroundColor: '#7a1818',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22 / 1.5,
  },
  assignButton: {
    marginTop: 10,
    backgroundColor: '#1f2f49',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22 / 1.5,
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
  retryLoadButton: {
    marginTop: 12,
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'center',
  },
  retryLoadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  contextPhotosContainer: {
    marginVertical: 10,
  },
  contextCounter: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  contextPhotosRow: {
    gap: 12,
    paddingRight: 4,
  },
  detailPhotoContainerHorizontal: {
    width: 220,
    height: 150,
    marginRight: 8,
  },
  detailPhotoHorizontal: {
    width: 220,
    height: 150,
  },
  contextPhotoContainerDetail: {
    width: 200,
    height: 150,
    marginRight: 8,
  },
  contextPhotoDetail: {
    width: 200,
    height: 150,
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
  detailPhotoContainer: {
    width: 200,
    height: 150,
    marginBottom: 10,
  },
  detailPhoto: {
    width: 200,
    height: 150,
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
  signatureImage: {
    width: '60%',
    height: 44,
    alignSelf: 'center',
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
  fotoPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 6,
  },
  fotoPickerButton: {
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 9,
    borderBottomLeftRadius: 9,
  },
  fotoPickerButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  fotoPickerFileName: {
    flex: 1,
    paddingHorizontal: 12,
    color: '#374151',
    fontSize: 14,
  },
  fotoPickerHelperText: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 14,
  },
  fotoPreviewContainer: {
    width: '100%',
    height: 200,
    marginBottom: 6,
  },
  fotoPreview: {
    width: '100%',
    height: 200,
  },

  paymentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  paymentInfoLabel: {
    width: 130,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  paymentInfoValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  cardPhotoThumb: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginTop: 10,
    backgroundColor: '#e5e7eb',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    marginTop: 10,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#7A1A1A',
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  clientSearchSection: {
    marginBottom: 20,
  },
  clientSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  clientSearchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0f172a',
  },
  noClientsFound: {
    padding: 16,
    alignItems: 'center',
  },
  noClientsFoundText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#94a3b8',
  },
  clientResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    overflow: 'hidden',
  },
  clientResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  clientResultItemActive: {
    backgroundColor: '#fef2f2',
  },
  clientResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientResultInfo: {
    flex: 1,
  },
  clientResultName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  clientResultDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  selectedClientCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedClientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  selectedClientCardTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#166534',
  },
  clearSelectedClientBtn: {
    padding: 4,
  },
  selectedClientBody: {
    gap: 4,
  },
  selectedClientName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
  },
  selectedClientContact: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#475569',
  },
  selectedClientAddress: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  inputDisabled: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    borderColor: '#cbd5e1',
  },
});

export default AdmHomeScreen;
