import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type PauseModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, dataAgendada: string, turnoAgendado: string) => void;
  mode?: 'pausar' | 'reagendar';
};

export default function PauseModal({ visible, onClose, onConfirm, mode = 'pausar' }: PauseModalProps) {
  const [expanded, setExpanded] = useState<'remarcar' | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [turno, setTurno] = useState<string>('Manhã');
  const [showTurnoPicker, setShowTurnoPicker] = useState(false);

  const turnos = ['Manhã', 'Tarde', 'Noite'];

  React.useEffect(() => {
    if (visible) {
      setExpanded(mode === 'reagendar' ? 'remarcar' : null);
    }
  }, [visible, mode]);

  const handlePausaRapida = () => {
    onConfirm('Pausa rápida', '', '');
  };

  const handleConfirmRemarcar = () => {
    const formattedDate = date.toISOString().split('T')[0];
    onConfirm('Remarcar o atendimento', formattedDate, turno);
  };

  const handleClose = () => {
    setExpanded(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {mode === 'reagendar' ? 'Reagendar serviço' : 'Pausar serviço'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            {mode === 'reagendar' 
              ? 'Defina a nova data e turno para a realização do serviço:' 
              : 'Escolha o motivo da pausa:'}
          </Text>

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {/* Pausa Rápida */}
            {mode !== 'reagendar' && !expanded && (
              <TouchableOpacity style={styles.cardYellow} onPress={handlePausaRapida}>
                <View style={styles.iconCircleYellow}>
                  <Feather name="clock" size={22} color="#b45309" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Pausa rápida</Text>
                  <Text style={styles.cardSub}>Utilize para pequenas pausas, como espera por entrega de equipamentos ou produtos.</Text>
                </View>
                <Feather name="chevron-right" size={20} color="#b45309" />
              </TouchableOpacity>
            )}

            {/* Remarcar Atendimento */}
            {mode !== 'reagendar' && (
              <TouchableOpacity 
                style={[styles.cardBlue, expanded === 'remarcar' && { borderColor: '#3b82f6' }]} 
                onPress={() => setExpanded('remarcar')}
              >
                <View style={styles.iconCircleBlue}>
                  <Feather name="calendar" size={22} color="#1d4ed8" />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>Remarcar o atendimento</Text>
                  <Text style={styles.cardSub}>Reagende o atendimento para outra data e horário.</Text>
                </View>
                {!expanded && <Feather name="chevron-right" size={20} color="#1d4ed8" />}
              </TouchableOpacity>
            )}

            {/* Formulário de remarcação (expandido ou no modo reagendar) */}
            {(expanded === 'remarcar' || mode === 'reagendar') && (
              <View style={styles.formContainer}>
                <View style={styles.inputGroupFull}>
                  <Text style={styles.inputLabel}>Nova Data</Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR')}</Text>
                    <Feather name="calendar" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroupFull}>
                  <Text style={styles.inputLabel}>Novo Turno</Text>
                  <View style={styles.turnoChipsContainer}>
                    {turnos.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.turnoChip,
                          turno === t && styles.turnoChipActive
                        ]}
                        onPress={() => setTurno(t)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.turnoChipText,
                          turno === t && styles.turnoChipTextActive
                        ]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onValueChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </ScrollView>

          <View style={styles.actions}>
            {(expanded === 'remarcar' || mode === 'reagendar') ? (
              <TouchableOpacity style={styles.confirmButtonPrimary} onPress={handleConfirmRemarcar}>
                <Text style={styles.confirmButtonTextPrimary}>Confirmar Remarcação</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#7A1A1A',
  },
  closeIcon: {
    padding: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 24,
  },
  optionsContainer: {
    marginBottom: 10,
  },
  
  // Card Yellow
  cardYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconCircleYellow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fde047',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },

  // Card Blue
  cardBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconCircleBlue: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#93c5fd',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },

  cardTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  // Date Picker
  formContainer: {
    gap: 16,
    marginTop: 8,
    marginBottom: 10,
    width: '100%',
  },
  inputGroupFull: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  dateText: {
    fontSize: 15,
    color: '#334155',
  },
  turnoChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  turnoChip: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnoChipActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eff6ff',
  },
  turnoChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  turnoChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },

  // Actions
  actions: {
    gap: 12,
    marginTop: 10,
  },
  confirmButtonPrimary: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7A1A1A',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7A1A1A',
  },
});
