import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../../../context/UserContext';

export default function AdminHeader() {
  const { logout, user } = useUser() as unknown as { logout: () => void; user: { name?: string } | null };

  return (
    <View style={styles.header}>
      <View style={styles.brandBlock}>
        <Text style={styles.headerTitle}>ServiYama</Text>
        <Text style={styles.headerSubtitle}>Gestao de Servicos</Text>
        <Text style={styles.headerSubtitle}>Gerente: {user?.name ?? 'Admin'}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.9}>
        <Text style={styles.logoutButtonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#2a0000',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  headerSubtitle: {
    color: '#fff',
    fontSize: 16,
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});