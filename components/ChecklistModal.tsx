import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';

const checklistItemsData = [
  'Instalação da fechadura digital concluída',
  'Configuração e cadastro de senhas/digitais realizado',
  'Teste de abertura com digital/senha/cartão aprovado',
  'Cobrança feita',
  'Teste de travamento automático funcionando',
  'Orientação ao cliente sobre uso e manutenção',
  'Sincronização com aplicativo (se aplicável)',
  'Entrega de cartões/chaves extras e manual',
  'Limpeza do local de instalação',
];

const ChecklistModal = ({ visible, onClose, onComplete }) => {
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [receiptPhoto, setReceiptPhoto] = useState<any>(null);
  const [obs, setObs] = useState('');

  useEffect(() => {
    if (!visible) {
      setCheckedItems(new Set());
      setReceiptPhoto(null);
      setObs('');
    }
  }, [visible]);

  const handleCheck = (item) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(item)) {
      newCheckedItems.delete(item);
      if (item === 'Cobrança feita') {
        setReceiptPhoto(null);
      }
    } else {
      newCheckedItems.add(item);
    }
    setCheckedItems(newCheckedItems);
  };

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para anexar o comprovante.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setReceiptPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'comprovante.jpg',
      });
    }
  };

  const handleTakeReceipt = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para anexar o comprovante.');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setReceiptPhoto({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'comprovante.jpg',
      });
    }
  };

  const trimmedObs = obs.trim();
  const canProceed = checkedItems.size >= 4 || trimmedObs.length > 0;
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
          <Text style={styles.modalSubtitle}>Marque os itens que foram realizados durante a instalação</Text>
          
          <View style={styles.infoBox}>
            <Feather name="info" size={18} color="#0050b3" />
            <Text style={styles.infoBoxText}>Marque pelo menos 4 itens ou informe em Obs por que não concluiu o restante</Text>
          </View>

          <ScrollView style={styles.checklistContainer}>
            {checklistItemsData.map((item, index) => {
              const isChecked = checkedItems.has(item);
              const isCobranca = item === 'Cobrança feita';

              return (
                <View key={index}>
                  <TouchableOpacity 
                    style={[styles.checklistItem, isCobranca && isChecked && styles.checklistItemWithSubContent]} 
                    onPress={() => handleCheck(item)}
                  >
                    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                      {isChecked && <Feather name="check" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checklistLabel}>{item}</Text>
                  </TouchableOpacity>

                  {isCobranca && isChecked && (
                    <View style={styles.receiptContainer}>
                      <Text style={styles.receiptTitle}>Anexar Comprovante de Pagamento:</Text>
                      <View style={styles.receiptActions}>
                        <TouchableOpacity style={styles.receiptButton} onPress={handleTakeReceipt}>
                          <Feather name="camera" size={18} color="#7A1A1A" />
                          <Text style={styles.receiptButtonText}>Câmera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.receiptButton} onPress={handlePickReceipt}>
                          <Feather name="image" size={18} color="#7A1A1A" />
                          <Text style={styles.receiptButtonText}>Galeria</Text>
                        </TouchableOpacity>
                      </View>
                      {receiptPhoto && (
                        <View style={styles.receiptPreview}>
                          <Feather name="file-text" size={16} color="#00a63f" />
                          <Text style={styles.receiptFileName} numberOfLines={1}>
                            {receiptPhoto.fileName || 'comprovante_selecionado.jpg'}
                          </Text>
                          <TouchableOpacity onPress={() => setReceiptPhoto(null)}>
                            <Feather name="x-circle" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            <View style={styles.obsContainer}>
              <Text style={styles.obsLabel}>Obs {needsObs ? '*' : '(opcional)'}</Text>
              <TextInput
                style={[styles.obsInput, needsObs && !trimmedObs && styles.obsInputRequired]}
                value={obs}
                onChangeText={setObs}
                placeholder="Ex: Cliente não autorizou os itens restantes"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.counter}>Itens marcados: {checkedItems.size} / {checklistItemsData.length}</Text>
            <TouchableOpacity 
              style={[styles.button, canProceed ? styles.buttonPrimary : styles.buttonDisabled]}
              onPress={() => onComplete({ 
                items: Array.from(checkedItems), 
                obs: trimmedObs,
                receiptPhoto: receiptPhoto 
              })}
              disabled={!canProceed}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onClose}>
              <Text style={styles.buttonSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '100%', height: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7ff', borderRadius: 8, padding: 12, marginBottom: 15 },
  infoBoxText: { marginLeft: 10, color: '#0050b3', fontSize: 14 },
  checklistContainer: { flex: 1, marginBottom: 15 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 10 },
  checklistItemWithSubContent: { marginBottom: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  receiptContainer: { backgroundColor: '#fff', borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: '#f8f9fa', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, padding: 15, marginBottom: 10, marginTop: -2 },
  receiptTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10 },
  receiptActions: { flexDirection: 'row', gap: 10 },
  receiptButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5', padding: 10, borderRadius: 6, gap: 8, borderWidth: 1, borderColor: '#dee2e6' },
  receiptButtonText: { fontSize: 13, fontWeight: '700', color: '#7A1A1A' },
  receiptPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f6ffed', borderWidth: 1, borderColor: '#b7eb8f', borderRadius: 6, padding: 8, marginTop: 10, gap: 8 },
  receiptFileName: { flex: 1, fontSize: 12, color: '#31c27c' },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#adb5bd', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  checkboxChecked: { backgroundColor: '#7A1A1A', borderColor: '#7A1A1A' },
  checklistLabel: { flex: 1, fontSize: 14, color: '#495057' },
  obsContainer: { marginTop: 4, marginBottom: 8 },
  obsLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
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
  footer: { borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 15 },
  counter: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 15 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonPrimary: { backgroundColor: '#7A1A1A' },
  buttonDisabled: { backgroundColor: '#ced4da' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default ChecklistModal;
