import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Alert, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  title?: string;
  subtitle?: string;
  labelText?: string;
};

const PhotoUploadModal = ({ visible, onClose, onBack, onNext, onNextMany, allowMultiple = false, title = 'Foto do Produto Instalado', subtitle = 'Tire uma foto da fechadura digital instalada', labelText = 'Foto da Fechadura *' }: PhotoUploadModalProps) => {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  useEffect(() => {
    if (!visible) {
      setPhotos([]);
    }
  }, [visible]);

  const mapAssetToPhoto = (asset: ImagePicker.ImagePickerAsset): UploadedPhoto => ({
    uri: asset.uri,
    mimeType: asset.mimeType || undefined,
    fileName: asset.fileName || undefined,
    width: asset.width,
    height: asset.height,
  });

  const handleChoosePhoto = () => {
    Alert.alert(
      "Selecionar Foto",
      "Escolha uma opção",
      [
        {
          text: "Tirar Foto",
          onPress: async () => {
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
              const newPhoto = mapAssetToPhoto(result.assets[0]);
              if (allowMultiple) {
                setPhotos((prev) => [...prev, newPhoto]);
              } else {
                setPhotos([newPhoto]);
              }
            }
          }
        },
        {
          text: "Escolher da Galeria",
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              alert('Desculpe, precisamos da permissão da galeria para fazer isso funcionar!');
              return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsMultipleSelection: allowMultiple,
              allowsEditing: false,
              quality: 0.9,
            });

            if (!result.canceled) {
              const mapped = result.assets.map(mapAssetToPhoto);
              setPhotos(mapped);
            }
          }
        },
        {
          text: "Cancelar",
          style: "cancel"
        }
      ]
    );
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
            <Text style={styles.infoBoxText}>Aceita fotos em retrato ou paisagem, sem corte obrigatorio</Text>
          </View>

          <Text style={styles.uploadLabel}>{labelText}</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleChoosePhoto}>
            <Text style={styles.uploadButtonText}>{photos.length > 0 ? 'Alterar arquivo' : 'Escolher arquivo'}</Text>
            {photos.length > 0 ? <Text style={styles.fileName}>{photos.length} arquivo(s) escolhido(s)</Text> : null}
          </TouchableOpacity>

          {photos[0] && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: photos[0].uri }} style={styles.previewImage} resizeMode="contain" />
              {photos.length > 1 ? <Text style={styles.previewMeta}>+{photos.length - 1} foto(s)</Text> : null}
              {photos[0].width && photos[0].height ? (
                <Text style={styles.previewMeta}>{photos[0].width}x{photos[0].height}</Text>
              ) : null}
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
  uploadLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  uploadButton: { backgroundColor: '#f8f9fa', borderRadius: 8, padding: 15, borderWidth: 1, borderColor: '#dee2e6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  uploadButtonText: { color: '#495057', fontWeight: '500' },
  fileName: { color: '#7A1A1A', fontSize: 12 },
  previewContainer: { marginTop: 15, alignItems: 'center' },
  previewImage: { width: 260, height: 180, borderRadius: 8, backgroundColor: '#f8fafc' },
  previewMeta: { marginTop: 8, fontSize: 12, color: '#64748b' },
  footer: { position: 'absolute', bottom: 25, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15 },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonPrimary: { backgroundColor: '#7A1A1A' },
  buttonDisabled: { backgroundColor: '#ced4da' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default PhotoUploadModal;
