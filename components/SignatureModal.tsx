import React, { useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Signature from 'react-native-signature-canvas';

const SignatureModal = ({ visible, onClose, onBack, onComplete }) => {
  const sigRef = useRef();

  const handleClear = () => {
    sigRef.current.clearSignature();
  };

  const handleConfirm = (signature) => {
    // Here you would normally save the signature
    console.log(signature);
    onComplete();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Assinatura do Cliente</Text>
          <Text style={styles.modalSubtitle}>Solicite a assinatura do cliente</Text>
          
          <View style={styles.infoBox}>
            <Feather name="edit-3" size={18} color="#0050b3" />
            <Text style={styles.infoBoxText}>Solicite ao cliente que assine abaixo com o dedo</Text>
          </View>

          <Text style={styles.signatureLabel}>Assinatura do Cliente *</Text>
          <View style={styles.signatureContainer}>
            <Signature
              ref={sigRef}
              onOK={handleConfirm}
              descriptionText=""
              clearText="Limpar Assinatura"
              confirmText="Confirmar"
              webStyle={`
                .m-signature-pad {
                  box-shadow: none; 
                  border: 1px solid #dee2e6; 
                  border-radius: 8px;
                }
                .m-signature-pad--footer {
                  display: none;
                }
              `}
            />
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Limpar Assinatura</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={onBack}>
              <Text style={styles.buttonSecondaryText}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => sigRef.current.readSignature()}
            >
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>Finalizar Serviço</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalView: { width: '100%', height: '85%', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7ff', borderRadius: 8, padding: 12, marginBottom: 20 },
  infoBoxText: { marginLeft: 10, color: '#0050b3', fontSize: 14 },
  signatureLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  signatureContainer: { height: 200, marginBottom: 15 },
  clearButton: { alignItems: 'center', marginBottom: 15 },
  clearButtonText: { color: '#d9534f', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 25, left: 25, right: 25, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 15 },
  button: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8, marginHorizontal: 5 },
  buttonPrimary: { backgroundColor: '#008000' },
  buttonSecondary: { backgroundColor: '#f1f3f5' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  buttonSecondaryText: { color: '#495057', fontSize: 16, fontWeight: 'bold' },
});

export default SignatureModal;
