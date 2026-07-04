import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ImageZoomModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
}

interface PhotoGalleryModalProps {
  visible: boolean;
  photos: string[];
  title?: string;
  onClose: () => void;
}

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ visible, imageUri, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
          <Feather name="x" size={28} color="#fff" />
        </TouchableOpacity>
        {imageUri && (
          <View style={isSignature ? styles.signatureCanvasWrapper : styles.photoCanvasWrapper}>
            {isLoading && !hasError && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Carregando imagem...</Text>
              </View>
            )}
            {hasError && (
              <View style={styles.errorOverlay}>
                <Feather name="alert-circle" size={48} color="#ef4444" />
                <Text style={styles.errorText}>Não foi possível carregar a imagem</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => { setHasError(false); setIsLoading(true); }}>
                  <Text style={styles.retryText}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            )}
            <Image
              source={imageUri}
              style={styles.zoomImage}
              contentFit="contain"
              transition={300}
              onLoadStart={() => { setIsLoading(true); setHasError(false); }}
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setHasError(true); }}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

export const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = ({ visible, photos, title = 'Fotos do Serviço', onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelectedIndex(0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [visible]);

  const currentPhoto = photos[selectedIndex] || null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.galleryContainer}>
        {/* Header */}
        <View style={styles.galleryHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.galleryTitle}>{title}</Text>
            <Text style={styles.gallerySubtitle}>{selectedIndex + 1} de {photos.length}</Text>
          </View>
          <TouchableOpacity style={styles.galleryCloseButton} onPress={onClose}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Image */}
        <View style={styles.galleryMainImage}>
          {isLoading && !hasError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Carregando...</Text>
            </View>
          )}
          {hasError && (
            <View style={styles.errorOverlay}>
              <Feather name="alert-circle" size={48} color="#ef4444" />
              <Text style={styles.errorText}>Erro ao carregar foto</Text>
            </View>
          )}
          {currentPhoto && (
            <Image
              source={currentPhoto}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
              transition={200}
              onLoadStart={() => { setIsLoading(true); setHasError(false); }}
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setHasError(true); }}
            />
          )}
        </View>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <View style={styles.thumbnailStrip}>
            <FlatList
              data={photos}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              keyExtractor={(_, idx) => String(idx)}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={[
                    styles.thumbnailItem,
                    selectedIndex === index && styles.thumbnailItemActive,
                  ]}
                  onPress={() => { setSelectedIndex(index); setIsLoading(true); setHasError(false); }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={item}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    transition={100}
                  />
                  <View style={styles.thumbnailLabel}>
                    <Text style={[
                      styles.thumbnailLabelText,
                      selectedIndex === index && styles.thumbnailLabelTextActive,
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // ImageZoomModal styles
  zoomContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    opacity: 0.8,
  },
  errorOverlay: {
    position: 'absolute',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#f87171',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // PhotoGalleryModal styles
  galleryContainer: {
    flex: 1,
    backgroundColor: '#111',
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  gallerySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  galleryCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 8,
  },
  galleryMainImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailStrip: {
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  thumbnailItem: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailItemActive: {
    borderColor: '#fff',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  thumbnailLabelText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '700',
  },
  thumbnailLabelTextActive: {
    color: '#fff',
  },
});

export default ImageZoomModal;
