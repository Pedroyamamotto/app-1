import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PhotoUploadModal from '../../components/PhotoUploadModal';
import { uploadAdminServiceContextPhoto } from '../../components/shared/admin/adminApi';

type RouteParams = {
  serviceId?: string;
  numeroPedido?: string;
  cliente?: string;
  descricao?: string;
  endereco?: string;
  fotoUri?: string;
};

type UploadedPhoto = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

export default function AdmAdicionarImagemScreen({ navigation, route }: any) {
  const params = (route?.params || {}) as RouteParams;
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isPhotoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mergePhotos = (incoming: UploadedPhoto[]) => {
    setPhotos((prev) => [...prev, ...incoming]);
  };

  const orderCode = useMemo(() => {
    const value = String(params.numeroPedido || '-');
    if (value.startsWith('PV-')) return value;
    if (value.startsWith('BLING-')) return value.replace(/^BLING-/, 'PV-');
    return `PV-${value}`;
  }, [params.numeroPedido]);

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

  const handlePhotoUploadBack = () => {
    setPhotoUploadVisible(false);
  };

  const handlePhotoUploadNext = (nextPhoto: UploadedPhoto) => {
    mergePhotos([nextPhoto]);
    setPhotoUploadVisible(false);
  };

  const handlePhotoUploadNextMany = (nextPhotos: UploadedPhoto[]) => {
    mergePhotos(nextPhotos);
    setPhotoUploadVisible(false);
  };

  const handleSavePhoto = async () => {
    if (!params.serviceId || photos.length === 0) {
      Alert.alert('Atenção', 'Selecione uma imagem antes de salvar.');
      return;
    }

    setIsSending(true);
    try {
      let successCount = 0;
      const failedPhotos: UploadedPhoto[] = [];

      for (const photo of photos) {
        try {
          const mimeType = photo.mimeType || inferMimeType(photo.fileName || photo.uri);
          const fileName = buildPhotoFileName(photo, mimeType);
          await uploadAdminServiceContextPhoto(params.serviceId, {
            uri: photo.uri,
            mimeType,
            fileName,
          });
          successCount += 1;
        } catch {
          failedPhotos.push(photo);
        }
      }

      if (failedPhotos.length === 0) {
        Alert.alert('Sucesso', `${successCount} foto(s) enviada(s) com sucesso.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        setPhotos(failedPhotos);
        Alert.alert(
          'Envio parcial',
          `${successCount} foto(s) enviada(s) e ${failedPhotos.length} falharam. Tente novamente as restantes.`
        );
      }
    } catch (error: any) {
      Alert.alert('Erro ao salvar', error?.message || 'Nao foi possivel salvar a imagem.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.85}>
          <Feather name="arrow-left" size={20} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adicionar Imagem</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.card}>
        <Text style={styles.orderCode}>{orderCode}</Text>
        <Text style={styles.clientName}>{params.cliente || 'Cliente nao informado'}</Text>
        <Text style={styles.serviceDescription}>{params.descricao || 'Servico nao informado'}</Text>
        <Text style={styles.serviceAddress}>{params.endereco || 'Endereco nao informado'}</Text>

        <View style={styles.previewBox}>
          {(photos[0]?.uri || params.fotoUri) ? (
            <Image source={{ uri: photos[0]?.uri || params.fotoUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.emptyPreview}>
              <Feather name="image" size={28} color="#9ca3af" />
              <Text style={styles.emptyPreviewText}>Nenhuma imagem selecionada</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.9}
            onPress={() => setPhotoUploadVisible(true)}
            disabled={isSending}
          >
            <Feather name="camera" size={16} color="#7a1818" />
            <Text style={styles.secondaryButtonText}>{photos.length > 0 ? 'Adicionar Mais Imagens' : 'Adicionar Imagens'}</Text>
          </TouchableOpacity>

          <View style={[styles.secondaryButton, styles.secondaryButtonInfo]}>
            <Feather name="check-circle" size={16} color="#7a1818" />
            <Text style={styles.secondaryButtonText}>Metodo do Tecnico</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (photos.length === 0 || isSending) && styles.primaryButtonDisabled]}
          activeOpacity={0.9}
          disabled={photos.length === 0 || isSending}
          onPress={handleSavePhoto}
        >
          {isSending ? <ActivityIndicator size="small" color="#fff" /> : null}
          <Text style={styles.primaryButtonText}>{isSending ? 'Enviando...' : 'Enviar Imagens'}</Text>
        </TouchableOpacity>
      </View>

      <PhotoUploadModal
        visible={isPhotoUploadVisible}
        onClose={() => setPhotoUploadVisible(false)}
        onBack={handlePhotoUploadBack}
        allowMultiple
        onNext={handlePhotoUploadNext}
        onNextMany={handlePhotoUploadNextMany}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    width: 38,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d9dee6',
    padding: 14,
  },
  orderCode: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8e9de',
    color: '#5b1111',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  clientName: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  serviceDescription: {
    color: '#1e293b',
    fontSize: 14,
    marginBottom: 4,
  },
  serviceAddress: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
  },
  previewBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    minHeight: 220,
    overflow: 'hidden',
    marginBottom: 12,
  },
  previewImage: {
    width: '100%',
    height: 240,
  },
  emptyPreview: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyPreviewText: {
    color: '#64748b',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f1d2c7',
    backgroundColor: '#fff6f2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  secondaryButtonInfo: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: '#7a1818',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#1f2f49',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
