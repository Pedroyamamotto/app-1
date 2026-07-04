import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminHeaders } from '../../components/shared/admin/adminApi';
import { apiFetch } from '../../constants/api';
import { formatScheduledDate, formatTimeValue } from '../../components/shared/admin/adminApi';

export default function GerServiceHistoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = (route.params || {}) as { id?: string };

  const [isLoading, setIsLoading] = useState(true);
  const [service, setService] = useState<any>(null);

  useEffect(() => {
    const fetchService = async () => {
      if (!id) return;
      try {
        const res = await apiFetch(`/api/services/${id}`);
        const data = await res.json().catch(() => ({}));
        setService(data?.service || data?.data || data);
      } catch (e) {
        console.warn('Erro ao buscar histórico', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchService();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histórico do Serviço</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#7A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  // Montar uma timeline fake com os dados disponíveis, já que o backend não envia array de logs nativo
  const timeline = [];
  
  if (service) {
    const criacaoData = service.Created_et || service.created_at || service.dataCriacao;
    if (criacaoData) {
      timeline.push({
        id: '1',
        title: 'Serviço Criado no Sistema',
        description: 'Ordem de serviço cadastrada',
        date: formatScheduledDate(criacaoData) || 'Data desconhecida',
        time: formatTimeValue(criacaoData) || '',
        icon: 'file-plus',
        color: '#3b82f6'
      });
    }

    const agendaData = service.data_agendada || service.dataAgendada || service.data || service.data_agendamento;
    if (agendaData) {
      const agendaHora = service.hora_agendada || service.horaAgendada || service.hora || service.hora_agendamento;
      timeline.push({
        id: '2',
        title: 'Agendamento Definido',
        description: `Agendado para atendimento`,
        date: formatScheduledDate(agendaData) || agendaData,
        time: agendaHora || '',
        icon: 'calendar',
        color: '#f59e0b'
      });
    }
    
    if (service.tecnico && service.tecnico !== 'Nao atribuido' && service.tecnico !== 'Sem técnico') {
      const atribuidoData = service.updated_at || service.Updated_et || agendaData || criacaoData;
      timeline.push({
        id: '3',
        title: 'Técnico Atribuído',
        description: `Responsável: ${service.tecnico}`,
        date: formatScheduledDate(atribuidoData) || 'Data desconhecida',
        time: formatTimeValue(atribuidoData) || '',
        icon: 'user-check',
        color: '#8b5cf6'
      });
    }

    const modificadoData = service.updated_at || service.Updated_et;
    if (modificadoData && modificadoData !== criacaoData && service.status !== 'concluido') {
      timeline.push({
        id: '4',
        title: `Status atual: ${service.status || 'Atualizado'}`,
        description: 'Última modificação registrada',
        date: formatScheduledDate(modificadoData) || 'Data desconhecida',
        time: formatTimeValue(modificadoData) || '',
        icon: 'edit-2',
        color: '#10b981'
      });
    }
    
    const concluidoData = service.concluido_em || service.data_conclusao;
    if (concluidoData || service.status === 'concluido') {
      const dataFim = concluidoData || modificadoData || new Date();
      timeline.push({
        id: '5',
        title: 'Serviço Concluído',
        description: 'Atendimento finalizado com sucesso',
        date: formatScheduledDate(dataFim) || 'Data desconhecida',
        time: formatTimeValue(dataFim) || '',
        icon: 'check-circle',
        color: '#22c55e'
      });
    }
  }

  if (timeline.length === 0 && service) {
    timeline.push({
      id: '0',
      title: `Status atual: ${service.status || 'Desconhecido'}`,
      description: 'Nenhum histórico detalhado disponível',
      date: '', time: '', icon: 'info', color: '#64748b'
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#7A1A1A" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Histórico do Serviço</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {!service ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Serviço não encontrado.</Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {timeline.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <Text style={styles.timelineDate}>{item.date}</Text>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                </View>
                
                <View style={styles.timelineMiddle}>
                  <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
                    <Feather name={item.icon as any} size={14} color="#fff" />
                  </View>
                  {index < timeline.length - 1 && <View style={styles.timelineLine} />}
                </View>

                <View style={styles.timelineRight}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineDesc}>{item.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#7A1A1A' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A1A1A'
  },
  backButton: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter-Bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  emptyText: { color: '#64748b', fontSize: 16, fontFamily: 'Inter-Medium' },
  
  content: { padding: 20, paddingBottom: 100, backgroundColor: '#f8fafc', flexGrow: 1 },
  
  timelineContainer: { marginTop: 10 },
  timelineItem: { flexDirection: 'row', minHeight: 80 },
  timelineLeft: { width: 80, alignItems: 'flex-end', paddingRight: 16, paddingTop: 4 },
  timelineDate: { fontSize: 12, fontFamily: 'Inter-SemiBold', color: '#334155', textAlign: 'right' },
  timelineTime: { fontSize: 11, color: '#94a3b8', marginTop: 2, textAlign: 'right' },
  
  timelineMiddle: { alignItems: 'center', width: 24 },
  timelineDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: -4, zIndex: 1 },
  
  timelineRight: { flex: 1, paddingLeft: 16, paddingTop: 4, paddingBottom: 24 },
  timelineTitle: { fontSize: 15, fontFamily: 'Inter-Bold', color: '#1e293b' },
  timelineDesc: { fontSize: 13, color: '#64748b', marginTop: 4 },
});
