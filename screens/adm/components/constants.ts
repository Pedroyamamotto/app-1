// Constantes extraídas de AdmHomeScreen

import type { AdminService } from './types';

export const DEFAULT_FILTERS = {
  status: 'Todos os Status',
  tecnico: 'Todos os Tecnicos',
  periodo: 'Todos os Periodos',
};

export const STATUS_OPTIONS = [
  'Todos os Status',
  'Aguardando Atribuicao',
  'Atribuidos',
  'Concluidos',
  'Nao Realizados',
];

export const PERIODO_OPTIONS = [
  'Todos os Periodos',
  'Hoje',
  'Esta Semana',
  'Este Mes',
];

export const statusLabelByCode: Record<string, string> = {
  aguardando: 'Aguardando',
  atribuido: 'Atribuido',
  iniciado: 'Iniciado',
  pausado: 'Pausado',
  concluido: 'Concluido',
  nao_realizado: 'Nao Realizado',
};

export const statusFilterToCode: Record<string, AdminService['status'] | null> = {
  'Todos os Status': null,
  'Aguardando Atribuicao': 'aguardando',
  Atribuidos: 'atribuido',
  Concluidos: 'concluido',
  'Nao Realizados': 'nao_realizado',
};

export const statusBadgeColorByCode: Record<string, string> = {
  aguardando: '#f15a00',
  atribuido: '#0ea5a4',
  iniciado: '#00a63f',
  pausado: '#eab308',
  concluido: '#2563eb',
  nao_realizado: '#6b7280',
};

export const REAGENDAR_HOURS = ['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21'];
export const REAGENDAR_MINUTES = ['00','15','30','45'];
