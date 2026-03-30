import React from 'react';
import { Image, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ visible, imageUri, onClose }) => {
  if (!imageUri) return null;
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '80%',
  },
});

export default ImageZoomModal;
