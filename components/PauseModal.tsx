import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

type PauseModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string, dataAgendada: string, turnoAgendado: string) => void;
};

export default function PauseModal({ visible, onClose, onConfirm }: PauseModalProps) {
  const [expanded, setExpanded] = useState<'remarcar' | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [turno, setTurno] = useState<string>('Manhã');
  const [showTurnoPicker, setShowTurnoPicker] = useState(false);

  const turnos = ['Manhã', 'Tarde', 'Noite'];

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
            <Text style={styles.title}>Pausar serviço</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeIcon}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>Escolha o motivo da pausa:</Text>

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {/* Pausa Rápida */}
            {!expanded && (
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

            {/* Formulário de remarcação (expandido) */}
            {expanded === 'remarcar' && (
              <View style={styles.datePickerContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nova Data</Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.dateText}>{date.toLocaleDateString('pt-BR')}</Text>
                    <Feather name="calendar" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Novo Turno</Text>
                  <TouchableOpacity style={styles.dateInput} onPress={() => setShowTurnoPicker(!showTurnoPicker)}>
                    <Text style={styles.dateText}>{turno}</Text>
                    <Feather name="chevron-down" size={18} color="#64748b" />
                  </TouchableOpacity>
                  
                  {showTurnoPicker && (
                    <View style={styles.turnoDropdown}>
                      {turnos.map((t) => (
                        <TouchableOpacity 
                          key={t} 
                          style={styles.turnoOption}
                          onPress={() => {
                            setTurno(t);
                            setShowTurnoPicker(false);
                          }}
                        >
                          <Text style={[styles.turnoText, turno === t && styles.turnoSelected]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </ScrollView>

          <View style={styles.actions}>
            {expanded === 'remarcar' ? (
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
  datePickerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  inputGroup: {
    flex: 1,
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
  turnoDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    zIndex: 10,
    elevation: 5,
  },
  turnoOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  turnoText: {
    fontSize: 15,
    color: '#334155',
  },
  turnoSelected: {
    fontWeight: '700',
    color: '#1d4ed8',
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
