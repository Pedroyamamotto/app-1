import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

const checklistItemsData = [
  'Instalação da fechadura digital concluída',
  'Configuração e cadastro de senhas/digitais realizado',
  'Teste de abertura com digital/senha/cartão aprovado',
  'Verificação de bateria e autonomia',
  'Teste de travamento automático funcionando',
  'Orientação ao cliente sobre uso e manutenção',
  'Sincronização com aplicativo (se aplicável)',
  'Entrega de cartões/chaves extras e manual',
  'Limpeza do local de instalação',
];

const ChecklistModal = ({ visible, onClose, onComplete }) => {
  const [checkedItems, setCheckedItems] = useState(new Set());

  const handleCheck = (item) => {
    const newCheckedItems = new Set(checkedItems);
    if (newCheckedItems.has(item)) {
      newCheckedItems.delete(item);
    } else {
      newCheckedItems.add(item);
    }
    setCheckedItems(newCheckedItems);
  };

  const canProceed = checkedItems.size >= 4;

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
            <Text style={styles.infoBoxText}>Marque pelo menos 4 itens para continuar</Text>
          </View>

          <ScrollView style={styles.checklistContainer}>
            {checklistItemsData.map((item, index) => (
              <TouchableOpacity key={index} style={styles.checklistItem} onPress={() => handleCheck(item)}>
                <View style={[styles.checkbox, checkedItems.has(item) && styles.checkboxChecked]}>
                  {checkedItems.has(item) && <Feather name="check" size={14} color="#fff" />}
                </View>
                <Text style={styles.checklistLabel}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.counter}>Itens marcados: {checkedItems.size} / {checklistItemsData.length}</Text>
            <TouchableOpacity 
              style={[styles.button, canProceed ? styles.buttonPrimary : styles.buttonDisabled]}
              onPress={onComplete}
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
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#adb5bd', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  checkboxChecked: { backgroundColor: '#008000', borderColor: '#008000' },
  checklistLabel: { flex: 1, fontSize: 14, color: '#495057' },
  footer: { borderTopWidth: 1, borderTopColor: '#e9ecef', paddingTop: 15 },
  counter: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 15 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonPrimary: { backgroundColor: '#008000' },
  buttonDisabled: { backgroundColor: '#ced4da' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default ChecklistModal;
