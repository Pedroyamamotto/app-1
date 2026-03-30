import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { AdminService } from './types';

interface ServiceListCardProps {
  service: AdminService;
  onPress: (service: AdminService) => void;
}

const ServiceListCard: React.FC<ServiceListCardProps> = ({ service, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(service)}>
      <Text style={styles.title}>{service.descricao}</Text>
      {/* Adicione outros campos relevantes aqui */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7dbe0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ServiceListCard;
