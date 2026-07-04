import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type SummaryItem = {
  label: string;
  value: number | string;
  color: string;
};

type SummaryCardProps = {
  title: string;
  items: SummaryItem[];
};

export default function SummaryCard({ title, items }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      {title ? <Text style={styles.summaryTitle}>{title}</Text> : null}
      <View style={styles.summaryStats}>
        {items.map((item) => (
          <View 
            key={item.label} 
            style={[
              styles.statBox, 
              { 
                backgroundColor: item.color + '0a', // very subtle color background (approx 4% opacity)
                borderColor: item.color + '25'      // soft colored border
              }
            ]}
          >
            <Text style={[styles.statNumber, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    fontFamily: 'System', // use standard system font for reliability
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%', // 2 columns layout
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
});
