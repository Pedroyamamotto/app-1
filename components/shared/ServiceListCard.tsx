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

import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const iconColor = colors.subtext;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} disabled={!onPress}>
      <View style={[styles.card, { borderLeftColor, backgroundColor: colors.card }]}>
        <View style={styles.header}>
          <View style={styles.topAddressRow}>
            <FontAwesome name={headerIconName} size={16} color={iconColor} />
            <Text style={[styles.topAddressText, { color: colors.subtext }]}>Pedido {String(numeroPedido)}</Text>
          </View>
          <Text style={[styles.status, { backgroundColor: statusColor }]}>{statusLabel}</Text>
        </View>

        <Text style={[styles.description, { color: colors.text }]}>{descricao}</Text>
        {clientName ? <Text style={[styles.client, { color: colors.subtext }]}>{clientName}</Text> : null}

        <View style={styles.addressRow}>
          <FontAwesome name="map-marker" size={16} color={iconColor} />
          <Text style={[styles.address, { color: colors.subtext }]}>{endereco}</Text>
        </View>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.timeContainer}>
            <FontAwesome name="clock-o" size={16} color={iconColor} />
            <Text style={[styles.time, { color: colors.subtext }]}>{hora}</Text>
          </View>
          <Text style={[styles.date, { color: colors.subtext }]}>{dataTexto}</Text>
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  topAddressRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
    paddingRight: 10,
  },
  topAddressText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b', // Slate 500
    flexShrink: 1,
  },
  status: {
    color: '#fff',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 0,
    maxWidth: '45%',
  },
  description: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b', // Slate 800
    marginBottom: 6,
  },
  client: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569', // Slate 600
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  address: {
    fontSize: 14,
    color: '#64748b', // Slate 500
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9', // Slate 100
    paddingTop: 12,
    gap: 10,
    flexWrap: 'wrap',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#475569', // Slate 600
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b', // Slate 500
    flexShrink: 1,
    textAlign: 'right',
  },
  actionButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
