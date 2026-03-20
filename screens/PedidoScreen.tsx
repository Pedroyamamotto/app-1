import { Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChecklistModal from '../components/ChecklistModal';
import NotCompletedModal from '../components/NotCompletedModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SignatureModal from '../components/SignatureModal';
import { API_BASE_URL, apiFetch } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';

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
};

type UploadedPhoto = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

type ChecklistCompletePayload = {
  items: string[];
  obs?: string;
};

export default function PedidoScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = (route.params || {}) as { id?: string };

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [service, setService] = useState<ServiceData | null>(null);
  const [client, setClient] = useState<any>(null);
  const [isChecklistVisible, setChecklistVisible] = useState(false);
  const [isPhotoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [isSignatureVisible, setSignatureVisible] = useState(false);
  const [isNotCompletedModalVisible, setNotCompletedModalVisible] = useState(false);
  const [completionData, setCompletionData] = useState<{ checklist: string[]; checklistObs: string; photo: UploadedPhoto | null }>({ checklist: [], checklistObs: '', photo: null });

  const resetCompletionDraft = () => {
    setCompletionData({ checklist: [], checklistObs: '', photo: null });
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
      if (!normalized || normalized === '[object Object]') return '';
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
          'path',
          'filePath',
          'filepath',
          'location',
          'secure_url',
          'src',
          'originalUrl',
          'publicUrl',
          'downloadUrl',
          'fotoUrl',
          'foto_url',
          'imagem',
          'image',
          'file',
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
      if (!normalized || normalized === '[object Object]') return '';
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
          'path',
          'filePath',
          'filepath',
          'location',
          'secure_url',
          'src',
          'originalUrl',
          'publicUrl',
          'downloadUrl',
          'fotoUrl',
          'foto_url',
          'imagem',
          'image',
          'file',
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

  const address = useMemo(() => {
    if (!client) return 'Endereço não informado';
    const rua = client?.rua || client?.logradouro || client?.endereco || '';
    const numero = client?.numero || '';
    const bairro = client?.bairro || '';
    const cidade = client?.cidade || '';
    const estado = client?.estado || client?.uf || '';
    return [
      [rua, numero].filter(Boolean).join(', '),
      [bairro, cidade, estado].filter(Boolean).join(' - '),
    ]
      .filter(Boolean)
      .join(' - ') || 'Endereço não informado';
  }, [client]);

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
      } catch (error) {
        console.error('Erro ao carregar pedido:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPedido();
  }, [serviceId]);

  const formattedDate = formatScheduledDate(service?.data_agendada);

  const clientName = client?.cliente || client?.nome || 'Cliente não informado';
  const phone = client?.telefone || client?.phone || '-';

  const handleChecklistComplete = (payload: ChecklistCompletePayload | string[]) => {
    if (isFinalized) {
      Alert.alert('Serviço já finalizado', 'Este serviço já foi concluído ou marcado como não realizado.');
      return;
    }

    const items = Array.isArray(payload) ? payload : payload?.items || [];
    const checklistObs = Array.isArray(payload) ? '' : String(payload?.obs || '').trim();

    setCompletionData((prev) => ({ ...prev, checklist: items, checklistObs }));
    setChecklistVisible(false);
    setPhotoUploadVisible(true);
  };

  const handlePhotoUploadBack = () => {
    setPhotoUploadVisible(false);
    setChecklistVisible(true);
    setCompletionData((prev) => ({ ...prev, photo: null }));
  };

  const handlePhotoUploadNext = (photo: UploadedPhoto) => {
    setCompletionData((prev) => ({ ...prev, photo }));
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

  const buildCompletionFormData = (signature: string, photoToSend: UploadedPhoto | null) => {
    const form = new FormData();
    form.append('status', 'concluido');
    form.append('checklist', JSON.stringify(completionData.checklist));
    if (completionData.checklistObs) {
      form.append('observacoes_checklist', completionData.checklistObs);
    }
    form.append('assinatura', signature);

    if (photoToSend?.uri) {
      const mimeType = photoToSend.mimeType || inferMimeType(photoToSend.fileName || photoToSend.uri);
      const fileName = buildPhotoFileName(photoToSend, mimeType);
      (form as any).append('foto', {
        uri: photoToSend.uri,
        type: mimeType,
        name: fileName,
      });
    }

    return form;
  };

  const handleSignatureBack = () => {
    setSignatureVisible(false);
    setPhotoUploadVisible(true);
  };

  const handleSignatureComplete = async (signature: string) => {
    if (isFinalized) {
      Alert.alert('Serviço já finalizado', 'Este serviço já foi concluído ou marcado como não realizado.');
      return;
    }

    setSignatureVisible(false);
    setIsSending(true);

    try {
      const sendConclusion = async (photoToSend: UploadedPhoto | null) => {
        const form = buildCompletionFormData(signature, photoToSend);
        return apiFetch(`/api/services/${serviceId}`, {
          method: 'PATCH',
          body: form,
        });
      };

      const res = await sendConclusion(completionData.photo);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.message || `Erro ${res.status}`);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfoRow}>
          <View style={styles.headerIconCircle}>
            <FontAwesome name="map-marker" size={22} color="#fff" />
          </View>
          <View>
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
                      <Image key={`${uri}-${index}`} source={{ uri }} style={styles.contextPhoto} resizeMode="cover" />
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.contextEmptyText}>Nenhuma foto de contexto enviada.</Text>
              )}
            </View>

            {isFinalized ? (
              <>
                <Text style={styles.sectionTitle}>Foto de Conclusão:</Text>
                <View style={styles.contextPhotosBlock}>
                  {completionPhotoUrl ? (
                    <Image source={{ uri: completionPhotoUrl }} style={styles.contextPhoto} resizeMode="cover" />
                  ) : (
                    <Text style={styles.contextEmptyText}>Nenhuma foto de conclusão enviada.</Text>
                  )}
                </View>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.primaryButton, (isSending || isFinalized) && { opacity: 0.6 }]}
              disabled={isSending || isFinalized}
              onPress={() => {
                resetCompletionDraft();
                setChecklistVisible(true);
              }}
            >
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="camera" size={20} color="#fff" />}
              <Text style={styles.buttonText}>{isSending ? 'Enviando...' : isFinalized ? 'Serviço Finalizado' : 'Concluir Serviço'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, (isSending || isFinalized) && { opacity: 0.6 }]}
              disabled={isSending || isFinalized}
              onPress={() => setNotCompletedModalVisible(true)}
            >
              <Feather name="x" size={20} color="#fff" />
              <Text style={styles.buttonText}>Marcar como Não Realizado</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <ChecklistModal
        visible={isChecklistVisible}
        onClose={closeCompletionFlow}
        onComplete={handleChecklistComplete}
      />

      <PhotoUploadModal
        visible={isPhotoUploadVisible}
        onClose={closeCompletionFlow}
        onBack={handlePhotoUploadBack}
        onNext={handlePhotoUploadNext}
      />

      <SignatureModal
        visible={isSignatureVisible}
        onClose={closeCompletionFlow}
        onBack={handleSignatureBack}
        onComplete={handleSignatureComplete}
      />

      <NotCompletedModal
        visible={isNotCompletedModalVisible}
        onClose={() => setNotCompletedModalVisible(false)}
        onConfirm={handleNotCompleted}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: {
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 18,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', marginBottom: 6 },
  headerInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  headerIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  orderBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  orderBadgeText: { color: '#e5f7ea', fontSize: 14, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 240 },
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
    paddingTop: 8,
    paddingBottom: 8,
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
  contextPhotosRow: { gap: 10, paddingRight: 4 },
  contextPhoto: { width: 280, height: 190, borderRadius: 10, backgroundColor: '#e5e7eb' },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#4b5563', fontSize: 15 },
});
