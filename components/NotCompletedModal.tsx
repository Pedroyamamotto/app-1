import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const PREDEFINED_REASONS = [
  'Não tinha ninguém em casa',
  'Cliente cancelou',
  'Falta de material',
  'Equipamento quebrado',
  'Problema técnico',
  'Outro'
];

const NotCompletedModal = ({ visible, onClose, onConfirm }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    let finalReason = selectedReason;
    if (selectedReason === 'Outro') {
      finalReason = customReason;
    }
    if (!String(finalReason || '').trim()) return;
    
    onConfirm(finalReason);
    
    // Reset state
    setSelectedReason('');
    setCustomReason('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.centeredView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Serviço Não Realizado</Text>
            <Text style={styles.modalSubtitle}>Selecione o motivo pelo qual não foi possível realizar o serviço:</Text>

            <View style={styles.reasonsContainer}>
              {PREDEFINED_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonChip,
                    selectedReason === reason && styles.reasonChipSelected
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text style={[
                    styles.reasonChipText,
                    selectedReason === reason && styles.reasonChipTextSelected
                  ]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReason === 'Outro' && (
              <View style={{ width: '100%', marginTop: 10 }}>
                <Text style={styles.inputLabel}>Descreva o motivo *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Choveu muito e não foi possível..."
                  value={customReason}
                  onChangeText={setCustomReason}
                  multiline
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.confirmButton, !selectedReason && { opacity: 0.5 }]} 
              onPress={handleConfirm}
              disabled={!selectedReason || (selectedReason === 'Outro' && !customReason.trim())}
            >
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  reasonsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center'
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
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  confirmButton: {
    backgroundColor: '#d9534f',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6'
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default NotCompletedModal;
