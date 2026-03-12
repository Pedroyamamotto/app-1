import React from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PendentesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pendentes</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Instalações Pendentes</Text>
          <View style={styles.summaryStats}>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#ff4d4f' }]}>0</Text>
              <Text style={styles.statLabel}>Novos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#7A1A1A' }]}>0</Text>
              <Text style={styles.statLabel}>Agendados</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, { color: '#1890ff' }]}>0</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </View>
          </View>
        </View>
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
