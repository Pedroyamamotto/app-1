import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import StandardImage from './StandardImage';

const compressImage = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) {
    return uri;
  }
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.warn('Erro ao comprimir imagem:', error);
    return uri;
  }
};

type UploadedPhoto = {
  uri: string;
  mimeType?: string;
  fileName?: string;
  width?: number;
  height?: number;
};

type PhotoUploadModalProps = {
  visible: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: (photo: UploadedPhoto) => void;
  onNextMany?: (photos: UploadedPhoto[]) => void;
  allowMultiple?: boolean;
  maxPhotos?: number;
  title?: string;
  subtitle?: string;
  labelText?: string;
};

const PhotoUploadModal = ({ visible, onClose, onBack, onNext, onNextMany, allowMultiple = false, maxPhotos = 4, title = 'Foto do Produto Instalado', subtitle = 'Tire uma foto da fechadura digital instalada', labelText = 'Foto da Fechadura *' }: PhotoUploadModalProps) => {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const isWeb = Platform.OS === 'web';

  const pickImageWeb = async (captureFromCamera: boolean) => {
    const doc = (globalThis as any)?.document;
    if (!doc?.createElement) {
      alert('Seu navegador nao suporta envio de imagem.');
      return [] as UploadedPhoto[];
    }

    return await new Promise<UploadedPhoto[]>((resolve) => {
      const input = doc.createElement('input') as any;
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = allowMultiple && !captureFromCamera;
      if (captureFromCamera) {
        input.setAttribute('capture', 'environment');
      }

      input.onchange = () => {
        const files = Array.from(input.files || []);
        const mapped = files.map((file: any) => ({
          uri: URL.createObjectURL(file),
          mimeType: file.type || undefined,
          fileName: file.name || undefined,
        }));
        resolve(mapped);
      };

      input.click();
    });
  };

  useEffect(() => {
    if (!visible) {
      setPhotos([]);
    }
  }, [visible]);

  const handleTakePhoto = async () => {
    if (isWeb) {
      const mapped = await pickImageWeb(true);
      if (mapped.length > 0) {
        if (allowMultiple) {
          setPhotos((prev) => [...prev, ...mapped]);
        } else {
          setPhotos([mapped[0]]);
        }
      }
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Desculpe, precisamos da permissão da câmera para fazer isso funcionar!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const compressedUri = await compressImage(asset.uri);
      const newPhoto: UploadedPhoto = {
        uri: compressedUri,
        mimeType: 'image/jpeg',
        fileName: asset.fileName || 'photo.jpg',
        width: asset.width,
        height: asset.height,
      };
      
      if (allowMultiple) {
        setPhotos((prev) => {
          if (prev.length >= maxPhotos) {
            alert(`Você só pode enviar até ${maxPhotos} fotos.`);
            return prev;
          }
          return [...prev, newPhoto];
        });
      } else {
        setPhotos([newPhoto]);
      }
    }
  };

  const handlePickImage = async () => {
    if (isWeb) {
      const mapped = await pickImageWeb(false);
      if (mapped.length > 0) {
        if (allowMultiple) {
          setPhotos(mapped);
        } else {
          setPhotos([mapped[0]]);
        }
      }
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Desculpe, precisamos da permissão da galeria para fazer isso funcionar!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowMultiple,
      selectionLimit: allowMultiple ? maxPhotos - photos.length : 1,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled) {
      const mapped: UploadedPhoto[] = await Promise.all(
        result.assets.map(async (asset) => {
          const compressedUri = await compressImage(asset.uri);
          return {
            uri: compressedUri,
            mimeType: 'image/jpeg',
            fileName: asset.fileName || 'photo.jpg',
            width: asset.width,
            height: asset.height,
          };
        })
      );
      if (allowMultiple) {
        setPhotos(prev => {
          const combined = [...prev, ...mapped];
          return combined.slice(0, maxPhotos);
        });
      } else {
        setPhotos([mapped[0]]);
      }
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{subtitle}</Text>

          <View style={styles.infoBox}>
            <Feather name="camera" size={18} color="#0050b3" />
            <Text style={styles.infoBoxText}>Aceita fotos em retrato ou paisagem, sem corte obrigatório</Text>
          </View>

          <Text style={styles.uploadLabel}>{labelText}</Text>
          
          <View style={styles.selectionRow}>
            <TouchableOpacity 
              style={[styles.selectionButton, (allowMultiple && photos.length >= maxPhotos) && { opacity: 0.5 }]} 
              onPress={handleTakePhoto}
              disabled={allowMultiple && photos.length >= maxPhotos}
            >
              <Feather name="camera" size={24} color="#7A1A1A" />
              <Text style={styles.selectionButtonText}>Tirar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.selectionButton, (allowMultiple && photos.length >= maxPhotos) && { opacity: 0.5 }]} 
              onPress={handlePickImage}
              disabled={allowMultiple && photos.length >= maxPhotos}
            >
              <Feather name="image" size={24} color="#7A1A1A" />
              <Text style={styles.selectionButtonText}>Galeria</Text>
            </TouchableOpacity>
          </View>

          {photos.length > 0 && (
            <View style={styles.previewContainer}>
              {allowMultiple ? (
                <View style={{ width: '100%', alignItems: 'center' }}>
                  <Text style={[styles.fileName, { marginBottom: 10 }]}>{photos.length} de {maxPhotos} arquivo(s) selecionado(s)</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                    {photos.map((photo, index) => (
                      <View key={index} style={{ position: 'relative' }}>
                        <StandardImage
                          source={photo.uri}
                          containerStyle={{ width: 100, height: 100, borderRadius: 8, overflow: 'hidden' }}
                          imageStyle={{ width: '100%', height: '100%' }}
                          showZoomLabel={false}
                        />
                        <TouchableOpacity
                          style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#fff', borderRadius: 12, padding: 2, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.3 }}
                          onPress={() => setPhotos(prev => prev.filter((_, i) => i !== index))}
                        >
                          <Feather name="x-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <>
                  <StandardImage
                    source={photos[0].uri}
                    containerStyle={styles.previewImageContainer}
                    imageStyle={styles.previewImage}
                    showZoomLabel={false}
                  />
                  <View style={styles.previewInfo}>
                    <Text style={styles.fileName}>{photos.length} arquivo(s) selecionado(s)</Text>
                    {photos[0].width && photos[0].height ? (
                      <Text style={styles.previewMeta}>{photos[0].width}x{photos[0].height}</Text>
                    ) : null}
                  </View>
                </>
              )}
            </View>
          )}
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                setPhotos([]);
                onBack();
              }}
            >
              <Text style={styles.buttonSecondaryText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, photos.length > 0 ? styles.buttonPrimary : styles.buttonDisabled]}
              onPress={() => {
                if (photos.length === 0) return;
                if (allowMultiple) {
                  if (onNextMany) {
                    onNextMany(photos);
                    return;
                  }
                  onNext(photos[0]);
                  return;
                }
                onNext(photos[0]);
              }}
              disabled={photos.length === 0}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '100%', height: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7ff', borderRadius: 8, padding: 12, marginBottom: 20 },
  infoBoxText: { marginLeft: 10, color: '#0050b3', fontSize: 14 },
  uploadLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  selectionRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  selectionButton: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#dee2e6', alignItems: 'center', justifyContent: 'center', gap: 8 },
  selectionButtonText: { color: '#495057', fontWeight: 'bold', fontSize: 14 },
  fileName: { color: '#7A1A1A', fontSize: 14, fontWeight: '600' },
  previewContainer: { marginTop: 10, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  previewImageContainer: { width: '100%', height: 200 },
  previewImage: { width: '100%', height: 200 },
  previewInfo: { marginTop: 10, alignItems: 'center' },
  previewMeta: { marginTop: 4, fontSize: 12, color: '#64748b' },
  footer: { position: 'absolute', bottom: 25, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15, backgroundColor: 'white' },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonPrimary: { backgroundColor: '#7A1A1A' },
  buttonDisabled: { backgroundColor: '#ced4da' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default PhotoUploadModal;
