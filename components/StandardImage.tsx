import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { Feather } from '@expo/vector-icons';

interface StandardImageProps extends Omit<ImageProps, 'style'> {
  onPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<any>;
  showZoomLabel?: boolean;
}

const StandardImage: React.FC<StandardImageProps> = ({
  source,
  onPress,
  containerStyle,
  imageStyle,
  showZoomLabel = true,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isSourceValid = (src: any) => {
    if (!src) return false;
    const raw = typeof src === 'string' ? src : src.uri;
    if (typeof raw !== 'string') return !!raw;
    const normalized = raw.trim().toLowerCase();
    const invalidValues = ['', '/', 'null', 'undefined', '[object object]', 'nan'];
    if (invalidValues.includes(normalized)) return false;
    if (normalized.endsWith('/')) return false;
    return true;
  };

  if (!isSourceValid(source)) return null;

  const content = (
    <View style={[styles.container, containerStyle]}>
      {/* Imagem principal */}
      <Image
        source={source}
        style={[styles.image, imageStyle, hasError && { opacity: 0 }]}
        transition={300}
        contentFit="cover"
        onLoadStart={() => { setIsLoading(true); setHasError(false); }}
        onLoad={() => setIsLoading(false)}
        onError={() => { setIsLoading(false); setHasError(true); }}
        {...props}
      />

      {/* Spinner de carregamento */}
      {isLoading && !hasError && (
        <View style={styles.overlay}>
          <ActivityIndicator size="small" color="#7A1A1A" />
        </View>
      )}

      {/* Estado de erro */}
      {hasError && (
        <View style={styles.overlay}>
          <Feather name="image" size={28} color="#cbd5e1" />
          <Text style={styles.errorText}>Foto indisponível</Text>
        </View>
      )}

      {/* Label "Toque para ampliar" */}
      {onPress && showZoomLabel && !hasError && !isLoading && (
        <View style={styles.zoomOverlay}>
          <Text style={styles.zoomText}>Toque para ampliar</Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={hasError}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#7A1A1A',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zoomText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default StandardImage;
