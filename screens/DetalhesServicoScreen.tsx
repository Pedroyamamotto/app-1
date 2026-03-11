import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { FontAwesome, Feather } from '@expo/vector-icons';
import ChecklistModal from '../components/ChecklistModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SignatureModal from '../components/SignatureModal';
import NotCompletedModal from '../components/NotCompletedModal';

// Agregando todos os dados de serviços em um único lugar para simular uma busca
const allServices = [
  { id: 1, description: 'Manutenção preventiva de ar condicionado', address: 'Av. Paulista, 1000 - Apto 504', time: '14:00', date: '2026-03-05', status: 'Aceito', clientName: 'Ana Paula Souza', email: 'ana.souza@email.com', cep: '01310-100', phone: '(11) 97654-3210' },
  { id: 2, description: 'Instalação de novo ar condicionado Split', address: 'Rua Augusta, 500 - Loja 3', time: '10:00', date: '2026-03-05', status: 'Agendado', clientName: 'Carlos Silva', email: 'carlos.silva@email.com', cep: '01301-000', phone: '(11) 98877-6655' },
  { id: 3, description: 'Limpeza de filtros e dutos', address: 'Alameda Santos, 123 - Sala 8', time: '09:00', date: '2026-03-10', status: 'Concluído', clientName: 'Beatriz Costa', email: 'beatriz.costa@email.com', cep: '01419-001', phone: '(11) 91122-3344' },
  { id: 4, description: 'Reparo em sistema de climatização', address: 'Rua dos Pinheiros, 789 - São Paulo', time: '16:00', date: '2026-03-02', status: 'Não Realizado', clientName: 'Daniel Martins', email: 'daniel.martins@email.com', cep: '05422-010', phone: '(11) 94455-6677' },
  { id: 5, description: 'Instalação de ar condicionado', address: 'Rua das Flores, 123 - Apto 101', time: '09:00', date: '2026-03-20', status: 'Novo', clientName: 'Fernanda Lima', email: 'fernanda.lima@email.com', cep: '01001-000', phone: '(11) 93322-1100' },
];

const ServiceDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { id } = route.params;

  const [isChecklistVisible, setChecklistVisible] = useState(false);
  const [isPhotoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [isSignatureVisible, setSignatureVisible] = useState(false);
  const [isNotCompletedModalVisible, setNotCompletedModalVisible] = useState(false);

  const service = allServices.find(s => s.id.toString() === id);

  const handleChecklistComplete = () => {
    setChecklistVisible(false);
    setPhotoUploadVisible(true);
  };

  const handlePhotoUploadBack = () => {
    setPhotoUploadVisible(false);
    setChecklistVisible(true);
  };

  const handlePhotoUploadNext = () => {
    setPhotoUploadVisible(false);
    setSignatureVisible(true);
  };

  const handleSignatureBack = () => {
    setSignatureVisible(false);
    setPhotoUploadVisible(true);
  };

  const handleSignatureComplete = () => {
    setSignatureVisible(false);
    navigation.goBack();
  };

  const handleNotCompleted = (reason) => {
    console.log('Serviço não realizado pelo motivo:', reason);
    setNotCompletedModalVisible(false);
    navigation.goBack();
  };

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Serviço não encontrado</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <Text>O serviço que você está procurando não foi encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(service.date + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <FontAwesome name="map-marker" size={20} color="#fff" style={{ marginRight: 10 }} />
        <Text style={styles.headerTitle}>Detalhes da Instalação</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            Verifique os detalhes da instalação abaixo. Por favor, confirme se todas as informações estão corretas antes de aceitar o serviço.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Descrição do Serviço:</Text>
          <Text style={styles.cardContent}>{service.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações do Cliente:</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Nome</Text><Text style={styles.infoValue}>{service.clientName}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Endereço</Text><Text style={styles.infoValue}>{service.address}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{service.email}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>CEP</Text><Text style={styles.infoValue}>{service.cep}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefone</Text><Text style={styles.infoValue}>{service.phone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Data Agendada</Text><Text style={styles.infoValue}>{formattedDate} às {service.time}</Text></View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={() => setChecklistVisible(true)}>
          <Feather name="camera" size={20} color="#fff" />
          <Text style={styles.buttonText}>Concluir Serviço</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setNotCompletedModalVisible(true)}>
          <Feather name="x" size={20} color="#fff" />
          <Text style={styles.buttonText}>Marcar como Não Realizado</Text>
        </TouchableOpacity>
      </View>

      <ChecklistModal 
        visible={isChecklistVisible} 
        onClose={() => setChecklistVisible(false)} 
        onComplete={handleChecklistComplete} 
      />

      <PhotoUploadModal
        visible={isPhotoUploadVisible}
        onClose={() => setPhotoUploadVisible(false)}
        onBack={handlePhotoUploadBack}
        onNext={handlePhotoUploadNext}
      />

      <SignatureModal
        visible={isSignatureVisible}
        onClose={() => setSignatureVisible(false)}
        onBack={handleSignatureBack}
        onComplete={handleSignatureComplete}
      />

      <NotCompletedModal
        visible={isNotCompletedModalVisible}
        onClose={() => setNotCompletedModalVisible(false)}
        onConfirm={handleNotCompleted}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#008000', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  backButton: { marginRight: 15, padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  contentContainer: { padding: 20, paddingBottom: 160 },
  infoBox: { backgroundColor: '#e6f7ff', borderColor: '#91d5ff', borderWidth: 1, borderRadius: 8, padding: 15, marginBottom: 20 },
  infoBoxText: { color: '#0050b3', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 20, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  cardContent: { fontSize: 16, color: '#555' },
  infoRow: { marginBottom: 15 },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f0f2f5', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 25, borderTopWidth: 1, borderTopColor: '#e8e8e8' },
  primaryButton: { backgroundColor: '#008000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8, marginBottom: 10 },
  secondaryButton: { backgroundColor: '#d9534f', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default ServiceDetailScreen;
