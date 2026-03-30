import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FilterBarProps {
  filters: any;
  setFilters: (f: any) => void;
  onOpenModal: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, onOpenModal }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Filtros:</Text>
      {/* Adicione campos de filtro aqui */}
      <TouchableOpacity onPress={onOpenModal} style={styles.button}>
        <Text style={styles.buttonText}>Abrir Filtros</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  label: {
    fontWeight: '700',
    color: '#1e293b',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#7A1A1A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default FilterBar;
