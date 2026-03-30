import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { AdminService } from './types';

interface EditServiceModalProps {
  visible: boolean;
  service: AdminService | null;
  onClose: () => void;
  onSave: (form: any) => void;
  form: any;
  setForm: (f: any) => void;
  isSaving: boolean;
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({ visible, service, onClose, onSave, form, setForm, isSaving }) => {
  if (!service) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Editar Serviço</Text>
          {/* Campos do formulário aqui */}
          <TouchableOpacity onPress={() => onSave(form)} disabled={isSaving} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{isSaving ? 'Salvando...' : 'Salvar'}</Text>
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
  saveButton: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
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

export default EditServiceModal;
