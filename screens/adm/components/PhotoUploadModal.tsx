import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PhotoUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (photos: any[]) => void;
  photos: any[];
  setPhotos: (p: any[]) => void;
}

const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({ visible, onClose, onUpload, photos, setPhotos }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Enviar Fotos</Text>
          {/* Campos de upload de fotos aqui */}
          <TouchableOpacity onPress={() => onUpload(photos)} style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Enviar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default PhotoUploadModal;
