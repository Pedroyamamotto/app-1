import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SummaryCard from '../components/shared/SummaryCard';
import { fetchAdminDashboardFromApi } from '../components/shared/admin/adminApi';

const PendentesScreen = () => {
  const [dashboard, setDashboard] = useState(null);
  useEffect(() => {
    fetchAdminDashboardFromApi().then(setDashboard).catch(() => setDashboard(null));
  }, []);
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pendentes</Text>
        </View>
      </View>
      <View style={styles.content}>
        <SummaryCard
          title="Instalações Pendentes"
          items={[
            { label: 'Aguardando', value: dashboard?.resumo?.aguardando ?? 0, color: '#ffb300' },
            { label: 'Atribuídos', value: dashboard?.resumo?.atribuidos ?? 0, color: '#7A1A1A' },
            { label: 'Concluídos', value: dashboard?.resumo?.concluidos ?? 0, color: '#1890ff' },
            { label: 'Total', value: dashboard?.resumo?.total ?? 0, color: '#0f172a' },
          ]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 15,
    paddingVertical: 20,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    marginTop: -30,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});

export default PendentesScreen;
