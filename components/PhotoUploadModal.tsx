import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const PhotoUploadModal = ({ visible, onClose, onBack, onNext }) => {
  const [photo, setPhoto] = useState(null);

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
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });

            if (!result.canceled) {
              setPhoto(result.assets[0].uri);
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
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });

            if (!result.canceled) {
              setPhoto(result.assets[0].uri);
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
          <Text style={styles.modalTitle}>Foto do Produto Instalado</Text>
          <Text style={styles.modalSubtitle}>Tire uma foto da fechadura digital instalada</Text>

          <View style={styles.infoBox}>
            <Feather name="camera" size={18} color="#0050b3" />
            <Text style={styles.infoBoxText}>Tire uma foto clara da fechadura digital instalada</Text>
          </View>

          <Text style={styles.uploadLabel}>Foto da Fechadura *</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleChoosePhoto}>
            <Text style={styles.uploadButtonText}>{photo ? 'Alterar arquivo' : 'Escolher arquivo'}</Text>
            {photo && <Text style={styles.fileName}>1 arquivo escolhido</Text>}
          </TouchableOpacity>

          {photo && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: photo }} style={styles.previewImage} />
            </View>
          )}
          
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onBack}>
              <Text style={styles.buttonSecondaryText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, photo ? styles.buttonPrimary : styles.buttonDisabled]}
              onPress={onNext}
              disabled={!photo}
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
  fileName: { color: '#008000', fontSize: 12 },
  previewContainer: { marginTop: 15, alignItems: 'center' },
  previewImage: { width: 200, height: 150, borderRadius: 8 },
  footer: { position: 'absolute', bottom: 25, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15 },
  button: { flex: 1, padding: 15, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  buttonPrimary: { backgroundColor: '#008000' },
  buttonDisabled: { backgroundColor: '#ced4da' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default PhotoUploadModal;
