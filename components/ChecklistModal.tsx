import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';

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

type ChecklistModalProps = {
  visible: boolean;
  onClose: () => void;
  onComplete: (payload: {
    items: string[];
    obs?: string;
    receiptPhoto?: any;
    receiptPhotos?: any[];
    reasonNoReceipt?: string;
  }) => void;
  chaveDePagamento?: string | null;
};

const COBRANCA_ITEM = 'Cobrança feita';

const checklistItemsData = [
  'Instalação da fechadura digital concluída',
  'Configuração e cadastro de senhas/digitais realizado',
  'Teste de abertura com digital/senha/cartão aprovado',
  COBRANCA_ITEM,
  'Teste de travamento automático funcionando',
  'Orientação ao cliente sobre uso e manutenção',
  'Sincronização com aplicativo (se aplicável)',
  'Entrega de cartões/chaves extras e manual',
  'Limpeza do local de instalação',
];

const ChecklistModal = ({
  visible,
  onClose,
  onComplete,
  chaveDePagamento,
}: ChecklistModalProps) => {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [receiptPhotos, setReceiptPhotos] = useState<any[]>([]);
  const [obs, setObs] = useState('');
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [tempReason, setTempReason] = useState('');
  const [selectedReasonModal, setSelectedReasonModal] = useState('');
  const [reasonNoReceipt, setReasonNoReceipt] = useState('');

  const cobrancaObrigatoria =
    !chaveDePagamento || String(chaveDePagamento).trim() === '';

  useEffect(() => {
    if (!visible) {
      setCheckedItems(new Set());
      setReceiptPhotos([]);
      setObs('');
      setReasonNoReceipt('');
      setTempReason('');
      setSelectedReasonModal('');
      return;
    }

    if (cobrancaObrigatoria) {
      setCheckedItems(new Set([COBRANCA_ITEM]));
    }
  }, [visible, cobrancaObrigatoria]);

  const handleCheck = (item: string) => {
    if (item === COBRANCA_ITEM && cobrancaObrigatoria) {
      return;
    }

    const newCheckedItems = new Set(checkedItems);

    if (newCheckedItems.has(item)) {
      newCheckedItems.delete(item);

      if (item === COBRANCA_ITEM) {
        setReceiptPhotos([]);
      }
    } else {
      newCheckedItems.add(item);
    }

    setCheckedItems(newCheckedItems);
  };

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à galeria para anexar o comprovante.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selected = await Promise.all(
        result.assets.map(async (asset) => {
          const compressedUri = await compressImage(asset.uri);
          return {
            uri: compressedUri,
            mimeType: asset.mimeType || 'image/jpeg',
            fileName: asset.fileName || 'comprovante.jpg',
          };
        })
      );
      setReceiptPhotos(prev => [...prev, ...selected].slice(0, 5));
    }
  };

  const handleTakeReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de acesso à câmera para anexar o comprovante.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const compressedUri = await compressImage(asset.uri);
      const newPhoto = {
        uri: compressedUri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'comprovante.jpg',
      };
      setReceiptPhotos(prev => [...prev, newPhoto].slice(0, 5));
    }
  };

  const trimmedObs = obs.trim();
  const cobrancaMarcada = checkedItems.has(COBRANCA_ITEM);
  const checklistMinimo = checkedItems.size >= 4 || trimmedObs.length > 0;

  const comprovanteObrigatorioOk = cobrancaObrigatoria ? (receiptPhotos.length > 0 || !!reasonNoReceipt) : true;

  const canProceed = cobrancaObrigatoria
    ? checklistMinimo && cobrancaMarcada && comprovanteObrigatorioOk
    : checklistMinimo;

  const needsObs = checkedItems.size < 4;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Checklist de Instalação</Text>

          <Text style={styles.modalSubtitle}>
            Marque os itens que foram realizados durante a instalação
          </Text>

          <View style={styles.infoBox}>
            <Feather name="info" size={18} color="#0050b3" />
            <Text style={styles.infoBoxText}>
              Marque pelo menos 4 itens ou informe em Obs por que não concluiu o restante
            </Text>
          </View>

          {cobrancaObrigatoria && (
            <View style={styles.paymentWarningBox}>
              <Feather name="alert-circle" size={18} color="#9a3412" />
              <Text style={styles.paymentWarningText}>
                Cobrança no local obrigatória. O item "Cobrança feita" já está marcado e não pode ser desmarcado. Anexe o comprovante para continuar.
              </Text>
            </View>
          )}

          <ScrollView style={styles.checklistContainer}>
            {checklistItemsData.map((item, index) => {
              const isChecked = checkedItems.has(item);
              const isCobranca = item === COBRANCA_ITEM;

              return (
                <View key={index}>
                  <TouchableOpacity
                    style={[
                      styles.checklistItem,
                      isChecked && styles.checklistItemChecked,
                      isCobranca && isChecked && styles.checklistItemWithSubContent,
                      isCobranca && cobrancaObrigatoria && styles.lockedChecklistItem,
                    ]}
                    onPress={() => handleCheck(item)}
                    activeOpacity={isCobranca && cobrancaObrigatoria ? 1 : 0.7}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Feather name="check" size={14} color="#fff" />}
                    </View>

                    <Text style={[styles.checklistLabel, isChecked && styles.checklistLabelChecked]}>
                      {item}
                      {isCobranca && cobrancaObrigatoria ? ' *' : ''}
                    </Text>

                    {isCobranca && cobrancaObrigatoria && (
                      <Feather name="lock" size={16} color="#9a3412" />
                    )}
                  </TouchableOpacity>

                  {isCobranca && isChecked && (
                    <View style={styles.receiptContainer}>
                      <Text style={styles.receiptTitle}>
                        Anexar Comprovante de Pagamento
                        {cobrancaObrigatoria ? ' *' : ''}
                      </Text>

                      <View style={styles.receiptActions}>
                        <TouchableOpacity
                          style={styles.receiptButton}
                          onPress={handleTakeReceipt}
                        >
                          <Feather name="camera" size={18} color="#7A1A1A" />
                          <Text style={styles.receiptButtonText}>Câmera</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.receiptButton}
                          onPress={handlePickReceipt}
                        >
                          <Feather name="image" size={18} color="#7A1A1A" />
                          <Text style={styles.receiptButtonText}>Galeria</Text>
                        </TouchableOpacity>
                      </View>

                      {cobrancaObrigatoria && receiptPhotos.length === 0 && !reasonNoReceipt && (
                        <TouchableOpacity
                          style={styles.sendWithoutReceiptButton}
                          onPress={() => {
                            setTempReason('');
                            setSelectedReasonModal('');
                            setReasonModalVisible(true);
                          }}
                        >
                          <Feather name="upload" size={18} color="#7A1A1A" />
                          <Text style={styles.sendWithoutReceiptText}>
                            Enviar sem comprovante
                          </Text>
                        </TouchableOpacity>
                      )}

                      {reasonNoReceipt ? (
                        <View style={styles.receiptPreview}>
                          <Feather name="file-text" size={16} color="#00a63f" />
                          <Text style={styles.receiptFileName} numberOfLines={1}>
                            Sem comprovante: {reasonNoReceipt}
                          </Text>
                          <TouchableOpacity onPress={() => setReasonNoReceipt('')}>
                            <Feather name="x-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ) : receiptPhotos.length > 0 ? (
                        <View style={{ gap: 6 }}>
                          {receiptPhotos.map((photo, idx) => (
                            <View key={idx} style={styles.receiptPreview}>
                              <Feather name="file-text" size={16} color="#00a63f" />
                              <Text style={styles.receiptFileName} numberOfLines={1}>
                                {photo.fileName || `comprovante_${idx + 1}.jpg`}
                              </Text>
                              <TouchableOpacity onPress={() => setReceiptPhotos(prev => prev.filter((_, i) => i !== idx))}>
                                <Feather name="x-circle" size={18} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : cobrancaObrigatoria ? (
                        <Text style={styles.requiredReceiptText}>
                          O comprovante é obrigatório para continuar.
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.obsContainer}>
              <Text style={styles.obsLabel}>
                Obs {needsObs ? '*' : '(opcional)'}
              </Text>

              <TextInput
                style={[
                  styles.obsInput,
                  needsObs && !trimmedObs && styles.obsInputRequired,
                ]}
                value={obs}
                onChangeText={setObs}
                placeholder="Informe observações se necessário..."
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.counter}>
              Itens marcados: {checkedItems.size} / {checklistItemsData.length}
            </Text>

            <TouchableOpacity
              style={[
                styles.button,
                canProceed ? styles.buttonPrimary : styles.buttonDisabled,
              ]}
              onPress={() =>
                onComplete({
                  items: Array.from(checkedItems),
                  obs: trimmedObs,
                  receiptPhoto: receiptPhotos[0] || null,
                  receiptPhotos,
                  reasonNoReceipt,
                })
              }
              disabled={!canProceed}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
            >
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={reasonModalVisible}
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.reasonModalView}>
            <Text style={styles.modalTitle}>Motivo</Text>
            <Text style={styles.modalSubtitle}>
              Por que não irá anexar o comprovante de pagamento?
            </Text>
            <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
              {['Cliente não está em casa', 'Atraso', 'Outros'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    selectedReasonModal === reason && styles.reasonChipSelected
                  ]}
                  onPress={() => setSelectedReasonModal(reason)}
                >
                  <Text style={[
                    styles.reasonChipText,
                    selectedReasonModal === reason && styles.reasonChipTextSelected
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReasonModal === 'Outros' && (
              <TextInput
                style={styles.obsInput}
                value={tempReason}
                onChangeText={setTempReason}
                placeholder="Digite o motivo..."
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
                autoFocus
              />
            )}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { flex: 1, marginBottom: 0 }]}
                onPress={() => setReasonModalVisible(false)}
              >
                <Text style={styles.buttonSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonPrimary,
                  { flex: 1, marginBottom: 0 },
                  (!selectedReasonModal || (selectedReasonModal === 'Outros' && !tempReason.trim())) && styles.buttonDisabled,
                ]}
                onPress={() => {
                  let finalR = selectedReasonModal;
                  if (selectedReasonModal === 'Outros') {
                    finalR = tempReason.trim();
                  }
                  if (finalR) {
                    setReasonNoReceipt(finalR);
                    setReasonModalVisible(false);
                    // Automaticamente marca o item de cobrança para poder continuar
                    const newChecked = new Set(checkedItems);
                    newChecked.add(COBRANCA_ITEM);
                    setCheckedItems(newChecked);
                  }
                }}
                disabled={!selectedReasonModal || (selectedReasonModal === 'Outros' && !tempReason.trim())}
              >
                <Text style={styles.buttonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reasonModalView: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalView: {
    width: '100%',
    height: '85%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  infoBoxText: {
    marginLeft: 10,
    color: '#0050b3',
    fontSize: 14,
    flex: 1,
  },
  paymentWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  paymentWarningText: {
    marginLeft: 10,
    color: '#9a3412',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  checklistContainer: {
    flex: 1,
    marginBottom: 15,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checklistItemChecked: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bcf0da',
  },
  lockedChecklistItem: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
  },
  checklistItemWithSubContent: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  receiptContainer: {
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f8f9fa',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    padding: 15,
    marginBottom: 10,
    marginTop: -2,
  },
  receiptTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sendWithoutReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: 10,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginTop: 10,
  },
  sendWithoutReceiptText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A1A1A',
  },
  receiptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    padding: 10,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  receiptButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A1A1A',
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f6ffed',
    borderWidth: 1,
    borderColor: '#b7eb8f',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
    gap: 8,
  },
  receiptFileName: {
    flex: 1,
    fontSize: 12,
    color: '#31c27c',
  },
  requiredReceiptText: {
    marginTop: 10,
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#adb5bd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  checkboxChecked: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  checklistLabel: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  checklistLabelChecked: {
    color: '#15803d',
    fontWeight: '600',
  },
  obsContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  obsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  obsInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  obsInputRequired: {
    borderColor: '#ef4444',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  counter: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: '#7A1A1A',
  },
  buttonDisabled: {
    backgroundColor: '#ced4da',
  },
  buttonSecondary: {
    backgroundColor: '#f1f3f5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonSecondaryText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: 'bold',
  },
  reasonChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  reasonChipSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1'
  },
  reasonChipText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500'
  },
  reasonChipTextSelected: {
    color: '#4f46e5',
    fontWeight: 'bold'
  },
});

export default ChecklistModal;