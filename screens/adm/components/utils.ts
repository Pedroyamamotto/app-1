// Funções utilitárias extraídas de AdmHomeScreen

export const normalizeSearchValue = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const normalizeDigits = (value: unknown) => String(value || '').replace(/\D/g, '');

export const formatPedidoLabel = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('PV-')) return raw;
  if (raw.startsWith('BLING-')) return raw;
  return `PV-${raw}`;
};

export const formatOrdemServicoLabel = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return `OS-${raw}`;
};

export function parseShortDate(value: string) {
  const parts = value.split('/');
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const fullYear = year < 100 ? 2000 + year : year;
  const parsed = new Date(fullYear, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function matchesPeriodo(dateText: string, periodo: string) {
  if (periodo === 'Todos os Periodos') return true;
  const date = parseShortDate(dateText);
  if (!date) return false;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (periodo === 'Hoje') return dateStart.getTime() === todayStart.getTime();
  if (periodo === 'Esta Semana') {
    const dayOfWeek = todayStart.getDay();
    const shift = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(todayStart);
    weekStart.setDate(todayStart.getDate() - shift);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return dateStart >= weekStart && dateStart <= weekEnd;
  }
  if (periodo === 'Este Mes') {
    return (
      dateStart.getMonth() === todayStart.getMonth() &&
      dateStart.getFullYear() === todayStart.getFullYear()
    );
  }
  return true;
}

export function toCalendarDate(ddmmyy: string): string {
  const p = ddmmyy.split('/');
  if (p.length !== 3) return '';
  const year = Number(p[2]) < 100 ? `20${p[2].padStart(2,'0')}` : p[2];
  return `${year}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
}

export function fromCalendarDate(yyyymmdd: string): string {
  const p = yyyymmdd.split('-');
  if (p.length !== 3) return '';
  return `${p[2]}/${p[1]}/${p[0].slice(-2)}`;
}

export function getTodayCalendarDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
