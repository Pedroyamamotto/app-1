import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ServiceListCardProps = {
  numeroPedido: string | number;
  descricao: string;
  endereco: string;
  hora: string;
  dataTexto: string;
  statusLabel: string;
  statusColor: string;
  borderLeftColor?: string;
  clientName?: string;
  onPress?: () => void;
  headerIconName?: 'file-text-o' | 'map-marker';
  actionText?: string;
  actionColor?: string;
  onActionPress?: () => void;
};

export default function ServiceListCard({
  numeroPedido,
  descricao,
  endereco,
  hora,
  dataTexto,
  statusLabel,
  statusColor,
  borderLeftColor = '#ff4d4f',
  clientName,
  onPress,
  headerIconName = 'file-text-o',
  actionText,
  actionColor = '#f15a00',
  onActionPress,
}: ServiceListCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={!onPress}>
      <View style={[styles.card, { borderLeftColor }]}>
        <View style={styles.header}>
          <View style={styles.topAddressRow}>
            <FontAwesome name={headerIconName} size={16} color="#666" />
            <Text style={styles.topAddressText}>Pedido {String(numeroPedido)}</Text>
          </View>
          <Text style={[styles.status, { backgroundColor: statusColor }]}>{statusLabel}</Text>
        </View>

        <Text style={styles.description}>{descricao}</Text>
        {clientName ? <Text style={styles.client}>{clientName}</Text> : null}

        <View style={styles.addressRow}>
          <FontAwesome name="map-marker" size={16} color="#666" />
          <Text style={styles.address}>{endereco}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeContainer}>
            <FontAwesome name="clock-o" size={16} color="#666" />
            <Text style={styles.time}>{hora}</Text>
          </View>
          <Text style={styles.date}>{dataTexto}</Text>
        </View>

        {actionText ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: actionColor }]}
            activeOpacity={0.9}
            onPress={onActionPress}
          >
            <Text style={styles.actionText}>{actionText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  topAddressRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingRight: 10,
  },
  topAddressText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
    flexShrink: 1,
  },
  status: {
    color: '#fff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  client: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  date: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
