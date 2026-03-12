import { Feather, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChecklistModal from '../components/ChecklistModal';
import NotCompletedModal from '../components/NotCompletedModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import SignatureModal from '../components/SignatureModal';
import { apiUrl } from '../constants/api';
import { formatLockDisplayName } from '../constants/serviceDisplay';

const ServiceDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = (route.params || {}) as { id?: string };
  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState(null);
  const [client, setClient] = useState(null);

  const [isChecklistVisible, setChecklistVisible] = useState(false);
  const [isPhotoUploadVisible, setPhotoUploadVisible] = useState(false);
  const [isSignatureVisible, setSignatureVisible] = useState(false);
  const [isNotCompletedModalVisible, setNotCompletedModalVisible] = useState(false);

  const serviceId = String(id || '');

  const serviceDescription = useMemo(() => {
    const raw = service?.descricao_servico || service?.descricao || service?.description || 'Serviço não informado';
    return formatLockDisplayName(raw);
  }, [service]);

  const clientName = client?.cliente || client?.nome || client?.name || 'Cliente não informado';
  const email = client?.email || '-';
  const cep = client?.cep || '-';
  const phone = client?.telefone || client?.phone || '-';

  const address = useMemo(() => {
    if (!client) return 'Endereço não informado';

    const rua = client?.rua || client?.logradouro || client?.endereco || '';
    const numero = client?.numero || '';
    const bairro = client?.bairro || '';
    const cidade = client?.cidade || '';
    const estado = client?.estado || client?.uf || '';

    const line1 = [rua, numero].filter(Boolean).join(', ');
    const line2 = [bairro, cidade, estado].filter(Boolean).join(' - ');
    return [line1, line2].filter(Boolean).join(' - ') || 'Endereço não informado';
  }, [client]);

  useEffect(() => {
    const loadServiceDetail = async () => {
      if (!serviceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const serviceRes = await fetch(apiUrl(`/api/services/${serviceId}`));
        const serviceData = await serviceRes.json().catch(() => ({}));
        const servicePayload = serviceData?.service || serviceData?.data || serviceData;

        if (!servicePayload || (typeof servicePayload === 'object' && Object.keys(servicePayload).length === 0)) {
          setService(null);
          setClient(null);
          return;
        }

        setService(servicePayload);

        const clientId = servicePayload?.cliente_id;
        if (clientId) {
          const clientRes = await fetch(apiUrl(`/api/clientes/${clientId}`));
          const clientData = await clientRes.json().catch(() => ({}));
          setClient(clientData?.cliente || clientData?.data || clientData);
        } else {
          setClient(null);
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do serviço:', error);
        setService(null);
        setClient(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceDetail();
  }, [serviceId]);

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carregando...</Text>
        </View>
        <View style={styles.notFoundContainer}>
          <ActivityIndicator size="large" color="#7A1A1A" />
          <Text style={styles.loadingText}>Buscando serviço...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

  const scheduledDate = service?.data_agendada || service?.dataAgendada || service?.date;
  const scheduledTime = service?.hora_agendada || service?.horaInicio || service?.time || '--:--';
  const formattedDate = (() => {
    if (!scheduledDate) return '--/--/----';
    const raw = String(scheduledDate);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '--/--/----';
    return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  })();

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
          <Text style={styles.cardContent}>{serviceDescription}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Informações do Cliente:</Text>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Nome</Text><Text style={styles.infoValue}>{clientName}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Endereço</Text><Text style={styles.infoValue}>{address}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{email}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>CEP</Text><Text style={styles.infoValue}>{cep}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Telefone</Text><Text style={styles.infoValue}>{phone}</Text></View>
          <View style={styles.infoRow}><Text style={styles.infoLabel}>Data Agendada</Text><Text style={styles.infoValue}>{formattedDate} às {scheduledTime}</Text></View>
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
  header: { backgroundColor: '#7A1A1A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
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
  primaryButton: { backgroundColor: '#7A1A1A', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8, marginBottom: 10 },
  secondaryButton: { backgroundColor: '#d9534f', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  notFoundContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#4b5563' },
});

export default ServiceDetailScreen;
