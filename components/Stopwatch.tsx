import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

type StopwatchProps = {
  iniciadoEm: string | Date | null;
  tempoTrabalhadoMs: number;
};

export default function Stopwatch({ iniciadoEm, tempoTrabalhadoMs }: StopwatchProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateTimer = () => {
      let currentSessionMs = 0;
      if (iniciadoEm) {
        const start = new Date(iniciadoEm).getTime();
        const now = new Date().getTime();
        currentSessionMs = Math.max(0, now - start);
      }
      setElapsedTime(tempoTrabalhadoMs + currentSessionMs);
    };

    updateTimer();
    
    if (iniciadoEm) {
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [iniciadoEm, tempoTrabalhadoMs]);

  const totalSeconds = Math.floor(elapsedTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  return (
    <View style={styles.container}>
      <Text style={styles.timeText}>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </Text>
      <View style={styles.labelsRow}>
        <Text style={styles.labelText}>Horas</Text>
        <Text style={styles.labelText}>Minutos</Text>
        <Text style={styles.labelText}>Segundos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  timeText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#7A1A1A',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  labelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: -2,
  },
  labelText: {
    fontSize: 12,
    color: '#64748b',
    width: 60,
    textAlign: 'center',
  }
});
