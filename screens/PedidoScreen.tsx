import { Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChecklistModal from '../components/ChecklistModal';
import NotCompletedModal from '../components/NotCompletedModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SignatureModal from '../components/SignatureModal';
import { apiFetch } from '../constants/api';
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
  }, [service?.descricao_servico]);

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
              <Text style={styles.serviceCardTitle}>Serviço:</Text>
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
  content: { padding: 20, paddingBottom: 180 },
  serviceCard: { backgroundColor: '#eef2f7', borderRadius: 12, padding: 16, marginBottom: 20 },
  serviceCardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  serviceCardText: { fontSize: 18, color: '#0f172a', lineHeight: 28 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  infoBlock: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8 },
  infoRow: { paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  infoValue: { fontSize: 16, color: '#0f172a', fontWeight: '600', lineHeight: 22 },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
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
