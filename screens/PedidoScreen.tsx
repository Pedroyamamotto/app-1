import { Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChecklistModal from '../components/ChecklistModal';
import NotCompletedModal from '../components/NotCompletedModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SignatureModal from '../components/SignatureModal';
import StandardImage from '../components/StandardImage';
import ImageZoomModal, { PhotoGalleryModal } from '../components/ImageZoomModal';
import Stopwatch from '../components/Stopwatch';
import PauseModal from '../components/PauseModal';
import { getAdminApiKey } from '../components/shared/admin/adminApi';
import { API_BASE_URL, apiFetch } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';
import { useUser } from '../context/UserContext';
import { appendBase64ToForm, appendFileDataToForm, isWeb, cleanText } from '../utils/platformUtils';
import { gerarRelatorioPDF } from '../utils/report';

type ServiceData = {
  _id?: string;
  id?: string | number;
  numero_pedido?: string;
  cliente_id?: string;
  descricao_servico?: string;
  descricao?: string;
  description?: string;
  status?: string;
  data_agendada?: string;
  hora_agendada?: string;
  observacoes?: string;
  valor?: number | string;
  forma_de_pagamento?: string;
  descricao_pagamento?: string;
  chaveDePagamento?: string;
  fotos_contexto?: unknown;
  fotosContexto?: unknown;
  foto_contexto?: unknown;
  fotoContexto?: unknown;
  contexto_fotos?: unknown;
  contextPhotos?: unknown;
  foto_instalacao?: unknown;
  fotoInstalacao?: unknown;
  foto_url?: unknown;
  fotoUrl?: unknown;
  foto_path?: unknown;
  fotoPath?: unknown;
  imagem?: unknown;
  image?: unknown;
  anexo_foto?: unknown;
  anexoFoto?: unknown;
  foto?: unknown;
  updated_at?: string;
  assinaturaUri?: string;
  motivo_sem_comprovante?: string;
  motivoSemComprovante?: string;
  tecnico?: string;
  tempo_trabalhado_ms?: number;
  quantidade_pausas?: number;
  iniciado_em?: string | null;
  checklist?: string[];
  has_comprovante?: boolean;
  comprovante_pagamento?: any;
  assinatura_url?: string;
  assinatura?: string;
  fotos_urls?: string[];
  fotos_servico_uris?: string[];
  fotosServicoUris?: string[];
  fotoUri?: string;
  fotosContextoUris?: string[];
  fotos_contexto_uris?: string[];
};

type UploadedPhoto = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

type ChecklistCompletePayload = {
  items: string[];
  obs?: string;
  receiptPhoto?: UploadedPhoto | null;
};

const normalizeImageUri = (uri: string | null | undefined): string | null => {
  if (!uri) return null;
  const trimmed = uri.trim();
  // Already absolute URL or file path
  if (trimmed.startsWith('http') || trimmed.startsWith('file:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  // Relative API path like /api/uploads/services/...
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/uploads/')) {
    return `${API_BASE_URL}${trimmed}`;
  }
  // Likely base64 signature
  if (trimmed.length > 50) {
    return `data:image/png;base64,${trimmed}`;
  }
  return trimmed;
};

export default function PedidoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = (route.params || {}) as { id?: string };

  const { user } = useUser();
  const tecnicoId = user?.id || user?._id || '';
  const tecnicoNome = user?.nome || user?.name || 'Técnico';

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [service, setService] = useState<ServiceData | null>(null);
  const [client, setClient] = useState<any>(null);
  const [finalizacao, setFinalizacao] = useState<any>(null);
  const [isChecklistVisible, setChecklistVisible] = useState(false);
  const [isPhotoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [isSignatureVisible, setSignatureVisible] = useState(false);
  const [isNotCompletedModalVisible, setNotCompletedModalVisible] = useState(false);
  const [isPauseModalVisible, setPauseModalVisible] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isChecklistDetailVisible, setChecklistDetailVisible] = useState(false);
  const [completionData, setCompletionData] = useState<{ 
    checklist: string[]; 
    checklistObs: string; 
    photos: UploadedPhoto[];
    receiptPhotos: UploadedPhoto[];
    receiptPhoto: UploadedPhoto | null;
    reasonNoReceipt?: string | null;
  }>({ checklist: [], checklistObs: '', photos: [], receiptPhotos: [], receiptPhoto: null, reasonNoReceipt: null });

  const resetCompletionDraft = () => {
    setCompletionData({ checklist: [], checklistObs: '', photos: [], receiptPhotos: [], receiptPhoto: null, reasonNoReceipt: null });
  };

  const closeCompletionFlow = () => {
    setChecklistVisible(false);
    setPhotoUploadVisible(false);
    setSignatureVisible(false);
    resetCompletionDraft();
  };

  const serviceId = id || '';
  const normalizeStatus = (status: unknown) => String(status || '').toLowerCase();
  const isFinalized = ['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(normalizeStatus(service?.status));

  const formatScheduledDate = (value: unknown) => {
    if (!value) return '--/--/----';
    const raw = String(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '--/--/----';
    return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const lockName = useMemo(() => {
    return formatLockDisplayName(service?.descricao_servico || service?.descricao || service?.description || 'Servico');
  }, [service?.descricao_servico, service?.descricao, service?.description]);

  const contextPhotoUrls = useMemo(() => {
    const found = new Set<string>();

    const toAbsoluteUrl = (raw: string) => {
      const normalized = String(raw || '').trim().replace(/\\/g, '/');
      const invalidValues = ['', '/', 'null', 'undefined', '[object object]', 'nan'];
      if (invalidValues.includes(normalized.toLowerCase())) return '';

      if (/^(https?:|data:|file:|content:)/i.test(normalized)) return encodeURI(normalized);
      if (normalized.startsWith('/')) return encodeURI(`${API_BASE_URL}${normalized}`);
      return encodeURI(`${API_BASE_URL}/${normalized}`);
    };

    const walk = (node: unknown) => {
      if (!node) return;

      if (typeof node === 'string') {
        const absolute = toAbsoluteUrl(node);
        if (absolute) found.add(absolute);
        return;
      }

      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      if (typeof node === 'object') {
        const asAny = node as any;
        const candidateKeys = [
          'url',
          'uri',
          'location',
          'secure_url',
          'src',
          'originalUrl',
          'publicUrl',
          'downloadUrl',
          'fotoUrl',
          'foto_url',
        ];
        candidateKeys.forEach((key) => walk(asAny?.[key]));

        const nestedKeys = [
          'data',
          'attributes',
          'asset',
          'foto',
          'imagem',
          'fotos_contexto',
          'fotosContexto',
          'porta_cliente',
          'portaCliente',
          'contexto_fotos',
          'contextPhotos',
        ];
        nestedKeys.forEach((key) => walk(asAny?.[key]));
      }
    };

    walk(
      service?.fotos_contexto ||
      service?.fotosContexto ||
      service?.foto_contexto ||
      service?.fotoContexto ||
      service?.contexto_fotos ||
      service?.contextPhotos
    );

    return Array.from(found);
  }, [service]);

  const completionPhotoUrl = useMemo(() => {
    const toAbsoluteUrl = (raw: string) => {
      const normalized = String(raw || '').trim().replace(/\\/g, '/');
      if (!normalized || normalized === '[object Object]' || normalized === 'null' || normalized === 'undefined' || normalized === '/') return '';
      if (/^(https?:|data:|file:|content:)/i.test(normalized)) return encodeURI(normalized);
      if (normalized.startsWith('/')) return encodeURI(`${API_BASE_URL}${normalized}`);
      return encodeURI(`${API_BASE_URL}/${normalized}`);
    };

    const extractSingleUrl = (node: unknown): string => {
      if (!node) return '';

      if (typeof node === 'string') {
        return toAbsoluteUrl(node);
      }

      if (Array.isArray(node)) {
        for (const item of node) {
          const found = extractSingleUrl(item);
          if (found) return found;
        }
        return '';
      }

      if (typeof node === 'object') {
        const asAny = node as any;
        const candidateKeys = [
          'url',
          'uri',
          'location',
          'secure_url',
          'src',
          'originalUrl',
          'publicUrl',
          'downloadUrl',
          'fotoUrl',
          'foto_url',
        ];

        for (const key of candidateKeys) {
          const found = extractSingleUrl(asAny?.[key]);
          if (found) return found;
        }

        const nestedKeys = ['data', 'attributes', 'asset', 'foto', 'imagem'];
        for (const key of nestedKeys) {
          const found = extractSingleUrl(asAny?.[key]);
          if (found) return found;
        }
      }

      return '';
    };

    return extractSingleUrl(
      service?.foto_instalacao ||
      service?.fotoInstalacao ||
      service?.foto_url ||
      service?.fotoUrl ||
      service?.foto_path ||
      service?.fotoPath ||
      service?.imagem ||
      service?.image ||
      service?.anexo_foto ||
      service?.anexoFoto ||
      service?.foto
    );
  }, [service]);

  const receiptPhotoUrl = useMemo(() => {
    if (isFinalized) {
      const apiKey = getAdminApiKey();
      return {
        uri: encodeURI(`${API_BASE_URL}/api/admin/services/comprovante/${serviceId}`),
        headers: apiKey ? { 'x-admin-key': apiKey } : { 'x-user-type': 'admin' }
      };
    }
    return completionData.receiptPhoto?.uri ? { uri: completionData.receiptPhoto.uri } : null;
  }, [isFinalized, serviceId, completionData.receiptPhoto]);

  const address = useMemo(() => {
    if (!client) return 'Endereço não informado';
    const rua = cleanText(client?.rua || client?.logradouro || client?.endereco || '');
    const numero = cleanText(client?.numero || '');
    const bairro = cleanText(client?.bairro || '');
    const cidade = cleanText(client?.cidade || '');
    const estado = cleanText(client?.estado || client?.uf || '');
    return [
      [rua, numero].filter(Boolean).join(', '),
      [bairro, cidade, estado].filter(Boolean).join(' - '),
    ]
      .filter(Boolean)
      .join(' - ') || 'Endereço não informado';
  }, [client]);

  const servicePhotos: string[] = useMemo(() => {
    const photos: string[] = [];
    // Campo principal do backend
    if (service?.fotos_urls && Array.isArray(service.fotos_urls)) {
      photos.push(...service.fotos_urls);
    }
    if (service?.fotos_servico_uris && Array.isArray(service.fotos_servico_uris)) {
      photos.push(...service.fotos_servico_uris.filter((u: string) => !photos.includes(u)));
    }
    if (finalizacao?.fotosServico && Array.isArray(finalizacao.fotosServico)) {
      photos.push(...(finalizacao.fotosServico as string[]).filter((u: string) => !photos.includes(u)));
    }
    if (finalizacao?.fotos && Array.isArray(finalizacao.fotos)) {
      photos.push(...(finalizacao.fotos as string[]).filter((u: string) => !photos.includes(u)));
    }
    const singlePhoto = service?.fotoUri || (service?.foto_url as string) || (completionPhotoUrl as string);
    if (singlePhoto && !photos.includes(singlePhoto)) {
      photos.push(singlePhoto);
    }
    return photos.filter(Boolean);
  }, [service, finalizacao, completionPhotoUrl]);

  const finalizedContextPhotoUrls: string[] = useMemo(() => {
    const urls: string[] = [];
    if (service?.fotosContextoUris && Array.isArray(service.fotosContextoUris)) {
      urls.push(...service.fotosContextoUris);
    }
    if (finalizacao?.fotosContexto && Array.isArray(finalizacao.fotosContexto)) {
      urls.push(...finalizacao.fotosContexto);
    }
    if (service?.fotos_contexto_uris && Array.isArray(service.fotos_contexto_uris)) {
      urls.push(...service.fotos_contexto_uris);
    }
    return urls.filter(Boolean);
  }, [service, finalizacao]);

  useEffect(() => {
    const loadPedido = async () => {
      if (!serviceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const serviceRes = await apiFetch(`/api/services/${serviceId}`);
        const serviceData = await serviceRes.json().catch(() => ({}));
        const payload = serviceData?.service || serviceData?.data || serviceData;
        setService(payload);

        const clientId = payload?.cliente_id;
        if (clientId) {
          const clientRes = await apiFetch(`/api/clientes/${clientId}`);
          const clientData = await clientRes.json().catch(() => ({}));
          setClient(clientData?.cliente || clientData?.data || clientData);
        }

        const isFinalizedStatus = ['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(String(payload?.status || '').toLowerCase());
        if (isFinalizedStatus) {
          const finRes = await apiFetch(`/api/services/${serviceId}/finalizacao`);
          if (finRes.ok) {
            const finData = await finRes.json().catch(() => null);
            setFinalizacao(finData?.finalizacao || finData?.data || finData);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPedido();
  }, [serviceId]);

  const carregarServico = async (id: string) => {
    try {
      const res = await apiFetch(`/api/services/${id}`);
      const data = await res.json().catch(() => ({}));
      const payload = data?.service || data?.data || data;
      setService(payload);

      const isFinalizedStatus = ['concluido', 'concluida', 'nao_realizado', 'não_realizado', 'cancelado'].includes(String(payload?.status || '').toLowerCase());
      if (isFinalizedStatus) {
        const finRes = await apiFetch(`/api/services/${id}/finalizacao`);
        if (finRes.ok) {
          const finData = await finRes.json().catch(() => null);
          setFinalizacao(finData?.finalizacao || finData?.data || finData);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar', e);
    }
  };

  const formattedDate = formatScheduledDate(service?.data_agendada);

  const clientName = cleanText(client?.cliente || client?.nome || 'Cliente não informado');
  const phone = client?.telefone || client?.phone || '-';

  const handleChecklistComplete = (payload: any) => {
    if (isFinalized) {
      Alert.alert('Serviço já finalizado', 'Este serviço já foi concluído ou marcado como não realizado.');
      return;
    }

    const items = Array.isArray(payload) ? payload : payload?.items || [];
    const checklistObs = Array.isArray(payload) ? '' : String(payload?.obs || '').trim();
    const receiptPhoto = Array.isArray(payload) ? null : payload?.receiptPhoto || null;
    const receiptPhotos = Array.isArray(payload) ? [] : payload?.receiptPhotos || [];
    const reasonNoReceipt = Array.isArray(payload) ? null : payload?.reasonNoReceipt || null;

    setCompletionData((prev) => ({ ...prev, checklist: items, checklistObs, receiptPhoto, receiptPhotos, reasonNoReceipt }));
    setChecklistVisible(false);
    setPhotoUploadVisible(true);
  };

  const handlePhotoUploadBack = () => {
    setPhotoUploadVisible(false);
    setChecklistVisible(true);
    setCompletionData((prev) => ({ ...prev, photos: [] }));
  };

  const handlePhotoUploadNext = (photo: UploadedPhoto) => {
    setCompletionData((prev) => ({ ...prev, photos: [photo] }));
    setPhotoUploadVisible(false);
    setSignatureVisible(true);
  };

  const handlePhotoUploadNextMany = (photos: UploadedPhoto[]) => {
    setCompletionData((prev) => ({ ...prev, photos }));
    setPhotoUploadVisible(false);
    setSignatureVisible(true);
  };

  const inferMimeType = (nameOrUri: string) => {
    const lower = String(nameOrUri || '').toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.heic') || lower.endsWith('.heif')) return 'image/heic';
    return 'image/jpeg';
  };

  const buildPhotoFileName = (photo: UploadedPhoto, mimeType: string) => {
    const fromSource = String(photo.fileName || photo.uri.split('/').pop() || '').trim();
    if (fromSource && /\.[a-z0-9]+$/i.test(fromSource)) {
      return fromSource;
    }

    const extByMime: Record<string, string> = {
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
      'image/heif': 'heif',
      'image/jpeg': 'jpg',
    };

    const ext = extByMime[mimeType] || 'jpg';
    return `foto.${ext}`;
  };

  // Volta para FormData: assinatura como base64
  const buildCompletionFormData = (signature: string, photosToSend: UploadedPhoto[]) => {
    const form = new FormData();
    form.append('status', 'concluido');
    form.append('checklist', JSON.stringify(completionData.checklist));
    if (completionData.checklistObs) {
      form.append('observacoes_checklist', completionData.checklistObs);
    }
    if (completionData.reasonNoReceipt) {
      form.append('motivo_sem_comprovante', completionData.reasonNoReceipt);
    }
    form.append('assinatura', signature); // base64 direto

    if (photosToSend && photosToSend.length > 0) {
      photosToSend.forEach((photo, index) => {
        if (photo?.uri) {
          const mimeType = photo.mimeType || inferMimeType(photo.fileName || photo.uri);
          const fileName = buildPhotoFileName(photo, mimeType);
          (form as any).append('foto', {
            uri: photo.uri,
            type: mimeType,
            name: index === 0 ? fileName : `${index}_${fileName}`,
          });
        }
      });
    }

    return form;
  };

  const handleSignatureBack = () => {
    setSignatureVisible(false);
    setPhotoUploadVisible(true);
  };

  // Volta para fluxo antigo: envia assinatura como base64 no FormData
  const handleSignatureComplete = async (signature: string) => {
    if (isFinalized) {
      Alert.alert('Serviço já finalizado', 'Este serviço já foi concluído ou marcado como não realizado.');
      return;
    }

    setSignatureVisible(false);
    setIsSending(true);

    try {
      const sendConclusion = async (photosToSend: UploadedPhoto[]) => {
        const form = buildCompletionFormData(signature, photosToSend);
        return apiFetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          body: form,
        });
      };

      const res = await sendConclusion(completionData.photos);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ${res.status}`);
      }

      // Se houver comprovante de pagamento, faz o upload separado para o endpoint admin
      if (completionData.receiptPhotos && completionData.receiptPhotos.length > 0) {
        const receiptForm = new FormData();
        completionData.receiptPhotos.forEach((photo, index) => {
          const mimeType = photo.mimeType || inferMimeType(photo.fileName || photo.uri);
          const fileName = buildPhotoFileName(photo, mimeType);
          
          (receiptForm as any).append('comprovante', {
            uri: photo.uri,
            type: mimeType,
            name: index === 0 ? fileName : `${index}_${fileName}`,
          });
        });

        const receiptRes = await apiFetch(`/api/admin/services/${serviceId}/comprovante`, {
          method: 'POST',
          headers: {
            'x-admin-key': getAdminApiKey(),
          },
          body: receiptForm,
        });

        if (!receiptRes.ok) {
          const errData = await receiptRes.json().catch(() => ({}));
          throw new Error(errData?.message || 'Erro ao enviar comprovante de pagamento.');
        }
      }

      setService((prev) => (prev ? { ...prev, status: 'concluido' } : prev));
      resetCompletionDraft();

      Alert.alert(
        'Sucesso!',
        'Serviço concluído com sucesso.',
        [
        { text: 'OK', onPress: () => navigation.goBack() },
        ]
      );
    } catch (error: any) {
      Alert.alert('Erro ao concluir', error?.message || 'Não foi possível concluir o serviço. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleNotCompleted = async (reason: string) => {
    if (isFinalized) {
      Alert.alert('Serviço já finalizado', 'Este serviço já foi concluído ou marcado como não realizado.');
      return;
    }

    const trimmedReason = String(reason || '').trim();
    if (!trimmedReason) {
      Alert.alert('Atenção', 'Informe o motivo para marcar como não realizado.');
      return;
    }

    setNotCompletedModalVisible(false);
    setIsSending(true);

    try {
      const res = await apiFetch(`/api/services/${serviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'nao_realizado',
          motivo_nao_realizacao: trimmedReason,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ${res.status}`);
      }

      setService((prev) => (prev ? { ...prev, status: 'nao_realizado' } : prev));

      Alert.alert('Registrado!', 'Serviço marcado como não realizado.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Erro', error?.message || 'Não foi possível atualizar o serviço.');
    } finally {
      setIsSending(false);
    }
  };

  const handleIniciarServico = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      const isRetomando = normalizeStatus(service?.status) === 'pausado';

      const response = await apiFetch(`/api/services/${serviceId}/iniciar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tecnico_id: tecnicoId,
          tecnico: tecnicoNome,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'Falha ao iniciar o serviço');
      }

      await carregarServico(serviceId as string);
      Alert.alert('Sucesso', isRetomando ? 'Serviço retomado.' : 'Serviço iniciado.');
    } catch (error: any) {
      console.warn('Erro ao iniciar serviço:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível iniciar o serviço.');
    } finally {
      setIsSending(false);
    }
  };

  const handlePausarServico = async () => {
    if (isSending) return;
    setIsSending(true);
    setPauseModalVisible(false);
    try {
      const response = await apiFetch(`/api/services/${serviceId}/pausar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tecnico_id: tecnicoId,
          tecnico: tecnicoNome,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'Falha ao pausar o serviço');
      }

      await carregarServico(serviceId as string);
      Alert.alert('Sucesso', 'Serviço pausado.');
    } catch (error: any) {
      console.warn('Erro ao pausar serviço:', error);
      Alert.alert('Erro', error?.message || 'Não foi possível pausar o serviço.');
    } finally {
      setIsSending(false);
    }
  };

  const renderFinalizedServiceView = () => {
    const isConcluido = normalizeStatus(service?.status) === 'concluido' || normalizeStatus(service?.status) === 'concluida';
    const statusText = isConcluido ? 'Serviço Concluído' : 'Serviço Não Realizado';
    const statusIcon = isConcluido ? 'check-circle' : 'x-circle';
    const statusIconColor = isConcluido ? '#16a34a' : '#ef4444';
    
    const valorFormatado = service?.valor
      ? Number(service.valor).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
      : '-';

    const finalizacaoDateStr = (() => {
      const rawDate = finalizacao?.finalizado_em || service?.updated_at || new Date();
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return '-';
      const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `${formatted} às ${timeFormatted}`;
    })();

    const standardChecklistItems = [
      'Instalação da fechadura digital concluída',
      'Configuração e cadastro de senhas/digitais realizado',
      'Teste de abertura com digital/senha/cartão aprovado',
      'Cobrança feita',
      'Teste de travamento automático funcionando',
      'Orientação ao cliente sobre uso e manutenção',
      'Sincronização com aplicativo (se aplicável)',
      'Entrega de cartões/chaves extras e manual',
      'Limpeza do local de instalação',
    ];

    const normalizedChecklist = (() => {
      if (Array.isArray(service?.checklist) && service.checklist.length > 0) {
        const checkedSet = new Set(service.checklist.map(item => String(item).trim().toLowerCase()));
        return standardChecklistItems.map((item) => ({
          label: item,
          done: checkedSet.has(item.trim().toLowerCase()),
        }));
      }
      const rawCheck = finalizacao?.checklist || finalizacao?.itens_checklist || finalizacao?.itensChecklist;
      if (Array.isArray(rawCheck) && rawCheck.length > 0) {
        if (typeof rawCheck[0] === 'string') {
          const checkedSet = new Set(rawCheck.map(item => String(item).trim().toLowerCase()));
          return standardChecklistItems.map((item) => ({
            label: item,
            done: checkedSet.has(item.trim().toLowerCase()),
          }));
        }
        return rawCheck.map((c: any) => ({
          label: String(c?.item || c?.label || c?.nome || ''),
          done: Boolean(c?.status ?? c?.done ?? c?.checked),
        })).filter(c => c.label);
      }
      if (rawCheck && typeof rawCheck === 'object') {
        const CHECKLIST_KEY_LABELS: Record<string, string> = {
          instalacao_concluida: 'Instalação da fechadura digital concluída',
          cadastro_senhas: 'Configuração e cadastro de senhas/digitais realizado',
          teste_abertura: 'Teste de abertura com digital/senha/cartão aprovado',
          cobranca_feita: 'Cobrança feita',
          cobranca: 'Cobrança feita',
          teste_travamento: 'Teste de travamento automático funcionando',
          orientacao_cliente: 'Orientação ao cliente sobre uso e manutenção',
          sincronizacao_app: 'Sincronização com aplicativo (se aplicável)',
          entrega_cartoes: 'Entrega de cartões/chaves extras e manual',
          limpeza_local: 'Limpeza do local de instalação',
        };
        const mapped: { label: string; done: boolean }[] = [];
        for (const key of Object.keys(rawCheck)) {
          if (key === '_id' || key === 'servico_id' || key === 'created_at' || key === 'updated_at') continue;
          const val = (rawCheck as any)[key];
          if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
            mapped.push({
              label: CHECKLIST_KEY_LABELS[key] || key,
              done: Boolean(val),
            });
          }
        }
        if (mapped.length > 0) return mapped;
      }
      return [];
    })();

    const hasChecklist = normalizedChecklist.length > 0;
    const hasPhotoServico = servicePhotos.length > 0;

    const hasReceiptPhoto = !!(
      service?.has_comprovante ||
      service?.comprovante_pagamento ||
      completionData.receiptPhoto ||
      finalizacao?.comprovanteUri
    );
    const motivoSemComprovante = service?.motivo_sem_comprovante || service?.motivoSemComprovante || finalizacao?.motivoSemComprovante || completionData.reasonNoReceipt;
    
    const signatureUri = service?.assinatura_url || service?.assinaturaUri || finalizacao?.assinatura || service?.assinatura;
    const hasSignature = !!signatureUri;

    const checklistStatus = hasChecklist ? 'Concluído' : 'Não enviado';
    const photoServicoStatus = hasPhotoServico ? `${servicePhotos.length} Enviada(s)` : 'Não enviada';
    const contextPhotoStatus = finalizedContextPhotoUrls.length > 0 ? `${finalizedContextPhotoUrls.length} Enviada(s)` : 'Não enviadas';
    const signatureStatus = hasSignature ? 'Enviada' : 'Não enviada';
    
    let receiptStatus = 'Não enviado';
    if (hasReceiptPhoto) {
      receiptStatus = 'Enviado';
    } else if (motivoSemComprovante) {
      receiptStatus = 'Sem Comprovante';
    }

    const handleGerarRelatorio = async () => {
      const data = {
        numeroPedido: service?.numero_pedido || '-',
        status: isConcluido ? 'Concluído' : 'Não Realizado',
        dataConclusao: finalizacaoDateStr,
        cliente: clientName,
        telefone: phone,
        endereco: address,
        tecnico: service?.tecnico || 'Técnico',
        descricao: lockName,
        formaPagamento: service?.forma_de_pagamento || '-',
        descricaoPagamento: service?.descricao_pagamento?.replace(/pix/gi, '').trim() || '-',
        chavePagamento: service?.chaveDePagamento || '-',
        valor: valorFormatado,
        observacoes: service?.observacoes || '-',
        duracaoAtendimentoMin: Math.round((service?.tempo_trabalhado_ms || 0) / 60000),
        pausas: service?.quantidade_pausas || 0,
        checklist: normalizedChecklist,
        fotosServico: servicePhotos,
        fotosContexto: finalizedContextPhotoUrls,
        comprovanteUri: receiptPhotoUrl ? (typeof receiptPhotoUrl === 'string' ? receiptPhotoUrl : receiptPhotoUrl.uri) : undefined,
        assinaturaUri: signatureUri || undefined,
      };
      await gerarRelatorioPDF(data);
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerInfoRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerIconCircle}>
                <Feather name={statusIcon} size={22} color="#fff" />
              </View>
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>{statusText}</Text>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>BLING-{service?.numero_pedido || '-'}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 }]} showsVerticalScrollIndicator={false}>
            <View style={styles.infoBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.circleIconBg}>
                    <Feather name="user" size={18} color="#64748b" />
                  </View>
                  <Text style={styles.cardSectionTitle}>Informações do Cliente</Text>
                </View>
                <TouchableOpacity 
                  style={styles.callCircleBtn}
                  onPress={() => Alert.alert('Ligar para Cliente', `Deseja efetuar ligação para: ${phone}`)}
                >
                  <Feather name="phone" size={16} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={styles.infoValue}>{clientName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Feather name="phone" size={14} color="#64748b" />
                <Text style={{ fontSize: 14, color: '#475569' }}>{phone}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 }}>
                <Feather name="map-pin" size={14} color="#64748b" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: '#64748b', flex: 1 }}>{address}</Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.circleIconBg}>
                  <Feather name="users" size={18} color="#64748b" />
                </View>
                <Text style={styles.infoValue}>Técnico: <Text style={{ fontWeight: 'normal', color: '#475569' }}>{service?.tecnico || 'Técnico Selecionado'}</Text></Text>
              </View>
            </View>

            <View style={styles.infoBlock}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={styles.circleIconBg}>
                  <Feather name="lock" size={18} color="#64748b" />
                </View>
                <Text style={styles.cardSectionTitle}>Serviço Executado</Text>
              </View>
              <Text style={[styles.infoValue, { fontSize: 16, lineHeight: 22 }]}>{lockName}</Text>
            </View>

            <View style={styles.infoBlock}>
              <Text style={[styles.cardSectionTitle, { marginBottom: 16 }]}>Detalhes do Serviço</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="credit-card" size={16} color="#64748b" />
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>Forma de Pagamento</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '700' }}>{service?.forma_de_pagamento || '-'}</Text>
              </View>
              <View style={styles.divider} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="file-text" size={16} color="#64748b" />
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>Descrição</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '700' }}>
                  {service?.descricao_pagamento?.replace(/pix/gi, '').trim() || '-'}
                </Text>
              </View>
              <View style={styles.divider} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="key" size={16} color="#64748b" />
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>Chave</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '700' }}>{service?.chaveDePagamento || '-'}</Text>
              </View>
              <View style={styles.divider} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="dollar-sign" size={16} color="#64748b" />
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>Valor</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '700' }}>{valorFormatado}</Text>
              </View>
              <View style={styles.divider} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Feather name="edit-3" size={16} color="#64748b" />
                  <Text style={{ fontSize: 14, color: '#475569', fontWeight: '500' }}>Observações</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#1e293b', fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: 20 }} numberOfLines={2}>
                  {service?.observacoes || '-'}
                </Text>
              </View>

              {/* Success Banner nested inside card */}
              <View style={[styles.successBanner, { 
                backgroundColor: isConcluido ? '#eefdf5' : '#fff1f0', 
                borderColor: isConcluido ? '#b7eb8f' : '#ffa39e',
                marginTop: 16,
                marginBottom: 16
              }]}>
                <Feather name={statusIcon} size={16} color={statusIconColor} />
                <Text style={[styles.successBannerText, { color: isConcluido ? '#1e293b' : '#cf1322', fontWeight: '500' }]}>
                  {isConcluido ? 'Concluído em: ' : 'Não realizado em: '}{finalizacaoDateStr}
                </Text>
              </View>

              {/* Stats row nested inside card */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={[styles.statBox, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#e6f7ff', width: 36, height: 36, borderRadius: 18 }]}>
                    <Feather name="clock" size={16} color="#1890ff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { fontSize: 11 }]}>Duração do Atendimento</Text>
                    <Text style={[styles.statValue, { fontSize: 16, marginTop: 0 }]}>{Math.round((service?.tempo_trabalhado_ms || 0) / 60000)} min</Text>
                  </View>
                </View>
                
                <View style={[styles.statBox, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#f9f0ff', width: 36, height: 36, borderRadius: 18 }]}>
                    <Feather name="pause-circle" size={16} color="#722ed1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statLabel, { fontSize: 11 }]}>Pausas Realizadas</Text>
                    <Text style={[styles.statValue, { fontSize: 16, marginTop: 0 }]}>{service?.quantidade_pausas || 0}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 16 }}>
              {/* Card 1: Checklist de Instalação */}
              <TouchableOpacity 
                style={styles.gridCard}
                activeOpacity={hasChecklist ? 0.7 : 1}
                onPress={() => {
                  if (hasChecklist) {
                    setChecklistDetailVisible(true);
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#e6ffed' }]}>
                    <Feather name="clipboard" size={16} color="#389e0d" />
                  </View>
                  <View style={[styles.badgeStyle, { backgroundColor: hasChecklist ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: hasChecklist ? '#15803d' : '#ef4444' }]}>{checklistStatus}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.gridCardTitle}>Checklist de Instalação</Text>
                  <Text style={styles.gridCardSub}>
                    {hasChecklist ? 'Checklist de instalação salvo.' : 'Este serviço ainda não possui checklist salvo no backend.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 2: Foto do Serviço */}
              <TouchableOpacity 
                style={styles.gridCard}
                activeOpacity={hasPhotoServico ? 0.7 : 1}
                onPress={() => {
                  if (hasPhotoServico) {
                    if (servicePhotos.length === 1) {
                      setZoomedImage(servicePhotos[0]);
                    } else {
                      Alert.alert(
                        'Fotos do Serviço',
                        `Deseja visualizar qual das ${servicePhotos.length} fotos do serviço?`,
                        servicePhotos.map((uri, idx) => ({
                          text: `Visualizar Foto ${idx + 1}`,
                          onPress: () => setZoomedImage(uri)
                        })).slice(0, 5).concat([{ text: 'Cancelar', style: 'cancel' } as any])
                      );
                    }
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#eff6ff' }]}>
                    <Feather name="camera" size={16} color="#2563eb" />
                  </View>
                  <View style={[styles.badgeStyle, { backgroundColor: hasPhotoServico ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: hasPhotoServico ? '#15803d' : '#ef4444' }]}>{photoServicoStatus}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.gridCardTitle}>Foto do Serviço</Text>
                  <Text style={styles.gridCardSub}>
                    {hasPhotoServico ? 'Clique para visualizar as fotos do serviço.' : 'Nenhuma foto de serviço enviada.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 3: Fotos de Contexto */}
              <TouchableOpacity 
                style={styles.gridCard}
                activeOpacity={finalizedContextPhotoUrls.length > 0 ? 0.7 : 1}
                onPress={() => {
                  if (finalizedContextPhotoUrls.length > 0) {
                    if (finalizedContextPhotoUrls.length === 1) {
                      setZoomedImage(finalizedContextPhotoUrls[0]);
                    } else {
                      Alert.alert(
                        'Fotos de Contexto',
                        `Deseja visualizar qual das ${finalizedContextPhotoUrls.length} fotos de contexto?`,
                        finalizedContextPhotoUrls.map((uri, idx) => ({
                          text: `Visualizar Foto ${idx + 1}`,
                          onPress: () => setZoomedImage(uri)
                        })).slice(0, 5).concat([{ text: 'Cancelar', style: 'cancel' } as any])
                      );
                    }
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#e0f2fe' }]}>
                    <Feather name="image" size={16} color="#0284c7" />
                  </View>
                  <View style={[styles.badgeStyle, { backgroundColor: finalizedContextPhotoUrls.length > 0 ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: finalizedContextPhotoUrls.length > 0 ? '#15803d' : '#ef4444' }]}>
                      {finalizedContextPhotoUrls.length > 0 ? `${finalizedContextPhotoUrls.length} Enviada(s)` : 'Não enviadas'}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.gridCardTitle}>Fotos de Contexto</Text>
                  <Text style={styles.gridCardSub}>
                    {finalizedContextPhotoUrls.length > 0 ? 'Clique para visualizar as fotos de contexto.' : 'Nenhuma foto de contexto enviada.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 4: Comprovante de Pagamento */}
              <TouchableOpacity 
                style={styles.gridCard}
                activeOpacity={(hasReceiptPhoto || motivoSemComprovante) ? 0.7 : 1}
                onPress={() => {
                  if (hasReceiptPhoto && receiptPhotoUrl) {
                    setZoomedImage(typeof receiptPhotoUrl === 'string' ? receiptPhotoUrl : receiptPhotoUrl.uri);
                  } else if (motivoSemComprovante) {
                    Alert.alert('Sem Comprovante', `Motivo informado pelo técnico:\n\n"${motivoSemComprovante}"`);
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#fdf4ff' }]}>
                    <Feather name="dollar-sign" size={16} color="#c084fc" />
                  </View>
                  <View style={[
                    styles.badgeStyle, 
                    { 
                      backgroundColor: receiptStatus === 'Enviado' 
                        ? '#dcfce7' 
                        : receiptStatus === 'Sem Comprovante' 
                          ? '#fef3c7' 
                          : '#fee2e2' 
                    }
                  ]}>
                    <Text style={[
                      styles.badgeText, 
                      { 
                        color: receiptStatus === 'Enviado' 
                          ? '#15803d' 
                          : receiptStatus === 'Sem Comprovante' 
                            ? '#d97706' 
                            : '#ef4444' 
                      }
                    ]}>{receiptStatus}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.gridCardTitle}>Comprovante de Pagamento</Text>
                  <Text style={styles.gridCardSub} numberOfLines={2}>
                    {receiptStatus === 'Enviado' 
                      ? 'Comprovante de pagamento enviado.' 
                      : receiptStatus === 'Sem Comprovante' 
                        ? `Motivo: "${motivoSemComprovante}"`
                        : 'Nenhum comprovante enviado.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Card 5: Assinatura do Cliente */}
              <TouchableOpacity 
                style={styles.gridCard}
                activeOpacity={hasSignature ? 0.7 : 1}
                onPress={() => {
                  if (signatureUri) setZoomedImage(signatureUri);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <View style={[styles.circleIconBg, { backgroundColor: '#fff7ed' }]}>
                    <Feather name="edit-3" size={16} color="#ea580c" />
                  </View>
                  <View style={[styles.badgeStyle, { backgroundColor: hasSignature ? '#dcfce7' : '#fee2e2' }]}>
                    <Text style={[styles.badgeText, { color: hasSignature ? '#15803d' : '#ef4444' }]}>{signatureStatus}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.gridCardTitle}>Assinatura do Cliente</Text>
                  <Text style={styles.gridCardSub}>
                    {hasSignature ? 'Assinatura do cliente salva.' : 'Nenhuma assinatura enviada.'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.finalizedFooter}>
            <TouchableOpacity 
              style={styles.gerarRelatorioBtn} 
              activeOpacity={0.8}
              onPress={handleGerarRelatorio}
            >
              <Feather name="file-text" size={18} color="#fff" />
              <Text style={styles.gerarRelatorioBtnText}>Gerar Relatório</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.fecharBtn} 
              activeOpacity={0.8}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.fecharBtnText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={isChecklistDetailVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setChecklistDetailVisible(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}>
            <View style={{
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: '80%',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Feather name="check-square" size={20} color="#7A1A1A" />
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1e293b' }}>Checklist de Instalação</Text>
                </View>
                <TouchableOpacity onPress={() => setChecklistDetailVisible(false)}>
                  <Feather name="x" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
                {normalizedChecklist.map((ci: any, idx: number) => (
                  <View
                    key={`${ci.label}-${idx}`}
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

                <View style={[styles.checklistSummaryBox, { marginBottom: 10 }]}>
                  <Feather name="check" size={14} color="#2563eb" />
                  <Text style={styles.checklistSummaryText}>
                    {normalizedChecklist.filter((c: any) => c.done).length} de {normalizedChecklist.length} itens realizados
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={{
                  backgroundColor: '#7A1A1A',
                  height: 48,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 10,
                }}
                onPress={() => setChecklistDetailVisible(false)}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ImageZoomModal
          visible={!!zoomedImage}
          imageUri={normalizeImageUri(zoomedImage)}
          onClose={() => setZoomedImage(null)}
        />
      </SafeAreaView>
    );
  };

  if (isFinalized) {
    return renderFinalizedServiceView();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.container}>

      <View style={styles.header}>
        <View style={styles.headerInfoRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerIconCircle}>
            <FontAwesome name="map-marker" size={22} color="#fff" />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Detalhes da Visita</Text>
            <View style={styles.orderBadge}>
              <Text style={styles.orderBadgeText}>BLING-{service?.numero_pedido || '-'}</Text>
            </View>
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7A1A1A" />
          <Text style={styles.loadingText}>Carregando pedido...</Text>
        </View>
      ) : !service ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Pedido não encontrado.</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.serviceCard}>
              <View style={styles.serviceTitleRow}>
                <Feather name="tool" size={18} color="#7A1A1A" />
                <Text style={styles.serviceCardTitle}>Serviço</Text>
              </View>
              <Text style={styles.serviceCardText}>{lockName}</Text>
            </View>

            <Text style={styles.sectionTitle}>Informações do Cliente:</Text>

            <View style={styles.infoBlock}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nome</Text>
                <Text style={styles.infoValue}>{clientName}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={styles.infoValue}>{phone}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Endereço</Text>
                <Text style={styles.infoValue}>{address}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data Agendada</Text>
                <Text style={styles.infoValue}>{formattedDate} às {service?.hora_agendada || '--:--'}</Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Forma de Pagamento</Text>
                <Text style={styles.infoValue}>{service?.forma_de_pagamento || '-'}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Descrição do Pagamento</Text>
                <Text style={styles.infoValue}>
                {service?.descricao_pagamento
                  ?.replace(/pix/gi, '')
                  .trim() || '-'}
                </Text>
              </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chave de Pagamento</Text>
              <Text style={styles.infoValue}>{service?.chaveDePagamento || '-'}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Valor</Text>
              <Text style={styles.infoValue}>
                {service?.valor
                  ? Number(service.valor).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })
                  : '-'}
              </Text>
            </View>

<View style={styles.divider} />

<View style={styles.infoRow}>
  <Text style={styles.infoLabel}>Observações</Text>
  <Text style={styles.infoValue}>{service?.observacoes || '-'}</Text>
</View>
            </View>

            <Text style={styles.sectionTitle}>Fotos de Contexto:</Text>
            <View style={styles.contextPhotosBlock}>
              {contextPhotoUrls.length > 0 ? (
                <>
                  <Text style={styles.contextCounter}>{contextPhotoUrls.length} foto(s) vinculada(s) ao pedido</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.contextPhotosRow}
                  >
                    {contextPhotoUrls.map((uri, index) => (
                      <StandardImage
                        key={`${uri}-${index}`}
                        source={uri}
                        onPress={() => setZoomedImage(uri)}
                        containerStyle={styles.contextPhotoContainer}
                        imageStyle={styles.contextPhoto}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.contextEmptyText}>Nenhuma foto de contexto enviada.</Text>
              )}
            </View>

            {isFinalized || completionData.receiptPhoto ? (
              <>
                <Text style={styles.sectionTitle}>Comprovante de Pagamento:</Text>
                <View style={styles.contextPhotosBlock}>
                  {receiptPhotoUrl ? (
                    <StandardImage
                      source={receiptPhotoUrl}
                      onPress={() => setZoomedImage(typeof receiptPhotoUrl === 'string' ? receiptPhotoUrl : receiptPhotoUrl.uri)}
                      containerStyle={styles.contextPhotoContainer}
                      imageStyle={styles.contextPhoto}
                    />
                  ) : (
                    <Text style={styles.contextEmptyText}>Nenhum comprovante enviado.</Text>
                  )}
                </View>
              </>
            ) : null}

            {isFinalized ? (
              <>
                <Text style={styles.sectionTitle}>Foto de Conclusão:</Text>
                <View style={styles.contextPhotosBlock}>
                  {completionPhotoUrl ? (
                    <StandardImage
                      source={completionPhotoUrl}
                      onPress={() => setZoomedImage(completionPhotoUrl)}
                      containerStyle={styles.contextPhotoContainer}
                      imageStyle={styles.contextPhoto}
                    />
                  ) : (
                    <Text style={styles.contextEmptyText}>Nenhuma foto de conclusão enviada.</Text>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={[styles.footerActions, { paddingBottom: 15 }]}>
            {!isFinalized && (
              <>
                {(normalizeStatus(service?.status) === 'iniciado' || normalizeStatus(service?.status) === 'pausado') ? (
                  <View style={[styles.actionCard, { backgroundColor: '#fffcfc' }]}>
                    <View style={styles.notStartedHeader}>
                      <View style={[styles.notStartedIcon, { backgroundColor: normalizeStatus(service?.status) === 'pausado' ? '#fff3cd' : '#f5e6e6' }]}>
                        <Feather name={normalizeStatus(service?.status) === 'pausado' ? 'pause-circle' : 'pause'} size={20} color={normalizeStatus(service?.status) === 'pausado' ? '#856404' : '#7A1A1A'} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.notStartedTitle, normalizeStatus(service?.status) === 'pausado' && { color: '#856404' }]}>
                          {normalizeStatus(service?.status) === 'pausado' ? 'Serviço Pausado' : 'Serviço em andamento'}
                        </Text>
                        <Text style={styles.notStartedSub}>
                          {normalizeStatus(service?.status) === 'pausado' ? 'Tempo de trabalho foi pausado.' : 'Tempo decorrido desde o inicio do serviço.'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: normalizeStatus(service?.status) === 'pausado' ? '#fef3c7' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: normalizeStatus(service?.status) === 'pausado' ? '#d97706' : '#ef4444', marginRight: 4 }} />
                        <Text style={{ fontSize: 10, color: normalizeStatus(service?.status) === 'pausado' ? '#92400e' : '#7f1d1d', fontWeight: 'bold' }}>
                          {normalizeStatus(service?.status) === 'pausado' ? 'Pausado' : 'Em andamento'}
                        </Text>
                      </View>
                    </View>

                    <Stopwatch 
                      iniciadoEm={normalizeStatus(service?.status) === 'pausado' ? null : (service?.iniciado_em || null)} 
                      tempoTrabalhadoMs={service?.tempo_trabalhado_ms || 0} 
                    />

                    {normalizeStatus(service?.status) === 'pausado' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: '#eab308' }, isSending && { opacity: 0.6 }]}
                          disabled={isSending}
                          onPress={handleIniciarServico}
                        >
                          {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="play" size={20} color="#fff" />}
                          <Text style={styles.buttonText}>{isSending ? 'Processando...' : 'Retomar Serviço'}</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.outlineButton, { marginBottom: 12, borderColor: '#e11d48' }, isSending && { opacity: 0.6 }]}
                          disabled={isSending}
                          onPress={() => setNotCompletedModalVisible(true)}
                        >
                          <Feather name="x-circle" size={18} color="#e11d48" />
                          <Text style={[styles.outlineButtonText, { color: '#e11d48', fontSize: 13, marginLeft: 4 }]}>Não Realizado</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: '#450a0a' }, isSending && { opacity: 0.6 }]}
                          disabled={isSending}
                          onPress={() => {
                            resetCompletionDraft();
                            setChecklistVisible(true);
                          }}
                        >
                          {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check-circle" size={20} color="#fff" />}
                          <Text style={styles.buttonText}>{isSending ? 'Processando...' : 'Concluir Serviço'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.outlineButton, { marginBottom: 12, borderColor: '#e11d48' }, isSending && { opacity: 0.6 }]}
                          disabled={isSending}
                          onPress={() => setNotCompletedModalVisible(true)}
                        >
                          <Feather name="x-circle" size={18} color="#e11d48" />
                          <Text style={[styles.outlineButtonText, { color: '#e11d48', fontSize: 13, marginLeft: 4 }]}>Não Realizado</Text>
                        </TouchableOpacity>

                        <View style={styles.rowButtons}>
                          <TouchableOpacity
                            style={[styles.outlineButton, isSending && { opacity: 0.6 }, { flex: 1 }]}
                            disabled={isSending}
                            onPress={() => setPauseModalVisible(true)}
                          >
                            <Feather name="pause" size={18} color="#7A1A1A" />
                            <Text style={[styles.outlineButtonText, { fontSize: 13, marginLeft: 4 }]}>Pausar Serviço</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.outlineButton, isSending && { opacity: 0.6 }, { flex: 1 }]}
                            disabled={isSending}
                            onPress={() => setPauseModalVisible(true)}
                          >
                            <Feather name="calendar" size={18} color="#7A1A1A" />
                            <Text style={[styles.outlineButtonText, { fontSize: 13, marginLeft: 4 }]}>Reagendar</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <View style={styles.actionCard}>
                    <View style={styles.notStartedHeader}>
                      <View style={styles.notStartedIcon}>
                        <Feather name="play-circle" size={24} color="#7A1A1A" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notStartedTitle}>Serviço ainda não iniciado</Text>
                        <Text style={styles.notStartedSub}>Inicie o serviço para começar a contagem do tempo.</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: '#7A1A1A' }, isSending && { opacity: 0.6 }]}
                      disabled={isSending}
                      onPress={handleIniciarServico}
                    >
                      {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="play-circle" size={20} color="#fff" />}
                      <Text style={styles.buttonText}>{isSending ? 'Processando...' : 'Iniciar o Serviço'}</Text>
                    </TouchableOpacity>

                    <View style={styles.rowButtons}>
                      <TouchableOpacity
                        style={[styles.outlineButton, isSending && { opacity: 0.6 }, { flex: 1 }]}
                        disabled={isSending}
                        onPress={() => setNotCompletedModalVisible(true)}
                      >
                        <Feather name="x" size={18} color="#7A1A1A" />
                        <Text style={[styles.outlineButtonText, { fontSize: 13, marginLeft: 4 }]}>Não Realizado</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.outlineButton, isSending && { opacity: 0.6 }, { flex: 1 }]}
                        disabled={isSending}
                        onPress={() => setPauseModalVisible(true)}
                      >
                        <Feather name="calendar" size={18} color="#7A1A1A" />
                        <Text style={[styles.outlineButtonText, { fontSize: 13, marginLeft: 4 }]}>Reagendar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </>
      )}

      <ImageZoomModal
        visible={!!zoomedImage}
        imageUri={normalizeImageUri(zoomedImage)}
        onClose={() => setZoomedImage(null)}
      />

      <ChecklistModal
        visible={isChecklistVisible}
        onClose={closeCompletionFlow}
        onComplete={handleChecklistComplete}
        chaveDePagamento={service?.chaveDePagamento}
      />

      <PhotoUploadModal
        visible={isPhotoUploadVisible}
        onClose={closeCompletionFlow}
        onBack={handlePhotoUploadBack}
        onNext={handlePhotoUploadNext}
        onNextMany={handlePhotoUploadNextMany}
        allowMultiple={true}
        maxPhotos={5}
        title="Fotos do Serviço Instalado"
        subtitle="Selecione ou tire até 5 fotos da conclusão do serviço"
        labelText="Fotos da Instalação/Serviço (Máximo 5) *"
      />

      <SignatureModal
        visible={isSignatureVisible}
        onClose={closeCompletionFlow}
        onBack={handleSignatureBack}
        onComplete={handleSignatureComplete}
      />

      <PauseModal
        visible={isPauseModalVisible}
        onClose={() => setPauseModalVisible(false)}
        onConfirm={handlePausarServico}
      />

      <NotCompletedModal
        visible={isNotCompletedModalVisible}
        onClose={() => setNotCompletedModalVisible(false)}
        onConfirm={handleNotCompleted}
      />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7A1A1A' },
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 12,
    paddingTop: 10, // Reduzido pois SafeAreaView já cuida do topo
    paddingBottom: 15, // Reduzido para ficar mais compacto
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  headerInfoRow: { flexDirection: 'row', alignItems: 'center' },
  titleContainer: { justifyContent: 'center', flex: 1 },
  headerIconCircle: {
    width: 44, // Reduzido levemente para caber melhor na linha
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' }, // Reduzido de 20 para 18
  orderBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orderBadgeText: { color: '#e5f7ea', fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 650, marginTop: 22 },
  serviceCard: {
    backgroundColor: '#eef2f7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d8e1ea',
  },
  serviceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  serviceCardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  serviceCardText: { fontSize: 18, color: '#0f172a', lineHeight: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  infoBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 15,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
  },
  infoRow: { paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#0f172a', fontWeight: '600', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  contextPhotosBlock: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  contextCounter: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  contextPhotosRow: { gap: 12, paddingRight: 4 },
  contextPhotoContainer: {
    marginVertical: 6,
    marginRight: 8,
    width: 200,
    height: 150,
  },
  contextPhoto: { width: 200, height: 150 },
  contextEmptyText: { fontSize: 15, color: '#64748b' },
  footerActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 14,
    backgroundColor: '#f0f2f5',
  },
  primaryButton: {
    backgroundColor: '#00a63f',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#e11d48',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 10 },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7A1A1A',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  outlineButtonText: {
    color: '#7A1A1A',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  notStartedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  notStartedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notStartedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  notStartedSub: {
    fontSize: 13,
    color: '#64748b',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#4b5563', fontSize: 15 },
  circleIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  callCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    alignItems: 'center',
  },
  detailRowLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  detailRowValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  successBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  gridCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  gridCardSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 16,
  },
  badgeStyle: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  finalizedFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 12,
  },
  gerarRelatorioBtn: {
    flex: 2,
    backgroundColor: '#7A1A1A',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  gerarRelatorioBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  fecharBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fecharBtnText: {
    color: '#475569',
    fontSize: 15,
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
});
