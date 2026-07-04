import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ visible, imageUri, onClose }) => {
  const isSignature = React.useMemo(() => {
    if (!imageUri) return false;
    const lower = imageUri.toLowerCase();
    return lower.startsWith('data:image') || lower.includes('assinatura') || lower.includes('signature');
  }, [imageUri]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.zoomContainer}>
        <TouchableOpacity style={styles.zoomCloseButton} onPress={onClose}>
          <Feather name="x" size={34} color="#fff" />
        </TouchableOpacity>
        {imageUri && (
          <View style={isSignature ? styles.signatureCanvasWrapper : styles.photoCanvasWrapper}>
            <Image
              source={imageUri}
              style={styles.zoomImage}
              contentFit="contain"
              transition={300}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  zoomContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  signatureCanvasWrapper: {
    width: '90%',
    height: '40%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCanvasWrapper: {
    width: '100%',
    height: '100%',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
});

export default ImageZoomModal;
