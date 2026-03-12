import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type AdminOverviewTone = 'pending' | 'assigned' | 'finished' | 'total';

type AdminOverviewStat = {
  label: string;
  value: number | string;
  tone: AdminOverviewTone;
};

type Props = {
  title: string;
  stats: AdminOverviewStat[];
  actionIcon?: React.ComponentProps<typeof Feather>['name'];
  onActionPress?: () => void;
};

const toneStyles: Record<AdminOverviewTone, { container: object; text: object }> = {
  pending: {
    container: { backgroundColor: '#f6f0d9', borderColor: '#f3d97a' },
    text: { color: '#c07a00' },
  },
  assigned: {
    container: { backgroundColor: '#d9f3e6', borderColor: '#95ddb9' },
    text: { color: '#008a5c' },
  },
  finished: {
    container: { backgroundColor: '#dbe9f8', borderColor: '#9ec0e6' },
    text: { color: '#2563eb' },
  },
  total: {
    container: { backgroundColor: '#eef2f6', borderColor: '#d5dce5' },
    text: { color: '#334155' },
  },
};

export default function AdminOverviewCard({ title, stats, actionIcon, onActionPress }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actionIcon && onActionPress ? (
          <TouchableOpacity style={styles.actionButton} activeOpacity={0.9} onPress={onActionPress}>
            <Feather name={actionIcon} size={20} color="#fff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.grid}>
        {stats.map((stat) => (
          <View key={`${stat.label}-${stat.tone}`} style={[styles.item, toneStyles[stat.tone].container]}>
            <Text style={[styles.value, toneStyles[stat.tone].text]}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 33 / 1.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionButton: {
    backgroundColor: '#7A1A1A',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  item: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    color: '#334155',
  },
});