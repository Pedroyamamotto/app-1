import { apiUrl } from '../../../constants/api';

export type AdminServiceStatus = 'aguardando' | 'atribuido' | 'concluido' | 'nao_realizado';

export type AdminServiceData = {
  id: string;
  tecnicoId?: string;
  numeroPedido: string;
  descricao: string;
  cliente: string;
  tecnico: string;
  endereco: string;
  hora: string;
  data: string;
  status: AdminServiceStatus;
  checklist?: { item: string; status: boolean }[];
  motivo?: string;
  telefone?: string;
};

export type AdminTecnicoUser = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
};

export type AdminTechnicianData = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  area: string;
  cidadeBase?: string;
  especialidade?: string;
  disponibilidade?: string;
  avaliacao?: string;
  total: number;
  ativos: number;
  concluidos: number;
  observacoes: string;
  atendimentos: {
    id: string;
    cliente: string;
    servico: string;
    status: 'Aguardando' | 'Em andamento' | 'Concluido';
    data: string;
    hora: string;
  }[];
};

export type AdminDashboardSummary = {
  aguardando: number;
  atribuidos: number;
  concluidos: number;
  nao_realizados: number;
  total: number;
  taxa_conclusao: number;
  tecnicos_ativos: number;
};

export type AdminDashboardTecnico = {
  tecnico_id: string;
  nome: string;
  concluidos: number;
  nao_realizados: number;
  pendentes: number;
  total: number;
  taxa_conclusao: number;
};

export type AdminDashboardData = {
  resumo: AdminDashboardSummary;
  desempenho_tecnicos: AdminDashboardTecnico[];
};

type AssignAdminServicePayload = {
  tecnicoId: string;
  dataAgendada: string;
  horaAgendada: string;
  observacoes?: string;
};

type AssignAdminServiceMetadata = {
  numeroPedido?: string;
  descricao?: string;
  cliente?: string;
  telefone?: string;
  endereco?: string;
  tecnicoNome?: string;
  tecnicoEmail?: string;
  tecnicoTelefone?: string;
};

const N8N_WEBHOOK_TEST = 'https://yamamotto-dev.app.n8n.cloud/webhook-test/Receber';
const N8N_WEBHOOK_PROD = 'https://yamamotto-dev.app.n8n.cloud/webhook/Receber';

const normalizeServices = (payload: unknown): any[] => {
  const asAny = payload as any;
  if (Array.isArray(asAny)) return asAny;
  if (Array.isArray(asAny?.services)) return asAny.services;
  if (Array.isArray(asAny?.data)) return asAny.data;
  if (Array.isArray(asAny?.results)) return asAny.results;
  return [];
};

const normalizeTecnicos = (payload: unknown): any[] => {
  const asAny = payload as any;
  if (Array.isArray(asAny)) return asAny;
  if (Array.isArray(asAny?.tecnicos)) return asAny.tecnicos;
  if (Array.isArray(asAny?.data)) return asAny.data;
  if (Array.isArray(asAny?.results)) return asAny.results;
  return [];
};

const normalizeStatus = (status: unknown): string => String(status || '').toLowerCase();

let hasWarnedMissingAdminKey = false;

const getAdminApiKey = () => String(process.env.EXPO_PUBLIC_ADMIN_API_KEY || '').trim();

const adminHeaders = () => {
  const adminApiKey = getAdminApiKey();

  if (!adminApiKey && __DEV__ && !hasWarnedMissingAdminKey) {
    hasWarnedMissingAdminKey = true;
    console.warn(
      'EXPO_PUBLIC_ADMIN_API_KEY nao configurada. Em ambiente sem ADMIN_API_KEY no backend, sera enviado fallback x-user-type=admin.'
    );
  }

  return {
    'Content-Type': 'application/json',
    ...(adminApiKey ? { 'x-admin-key': adminApiKey } : { 'x-user-type': 'admin' }),
  };
};

const readJsonSafely = async (res: Response) => res.json().catch(() => ({}));

const postJson = async (url: string, payload: Record<string, unknown>) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Webhook ${url} respondeu HTTP ${response.status}`);
  }
};

const throwIfNotOk = async (res: Response, fallbackMessage: string) => {
  if (res.ok) return;

  const payload = await readJsonSafely(res);
  const rawMessage = String(
    (payload as any)?.message ||
      (payload as any)?.error ||
      (payload as any)?.detail ||
      `${fallbackMessage} (HTTP ${res.status})`
  );
  const isAdminAuthError =
    (res.status === 401 || res.status === 403) &&
    /(acesso negado|admin_api_key|x-admin-key|x-user-type|admin)/i.test(rawMessage);

  const errorMessage = String(
    isAdminAuthError
      ? `${rawMessage} | Configure EXPO_PUBLIC_ADMIN_API_KEY no app e reinicie o Expo. Em teste local sem chave no backend, use fallback x-user-type=admin.`
      : rawMessage
  );
  throw new Error(errorMessage);
};

const parseBrDateToIso = (value: string) => {
  const parts = String(value || '').split('/');
  if (parts.length !== 3) return null;

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const yearRaw = Number(parts[2]);
  if (!day || !month || !yearRaw) return null;

  const year = yearRaw < 100 ? yearRaw + 2000 : yearRaw;
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const slugify = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');

export const buildClientAddress = (cliente: any) => {
  if (!cliente) return 'Endereco nao informado';

  const rua = cliente?.rua || cliente?.logradouro || cliente?.endereco || '';
  const numero = cliente?.numero || '';
  const bairro = cliente?.bairro || '';
  const cidade = cliente?.cidade || '';
  const estado = cliente?.estado || cliente?.uf || '';

  const line1 = [rua, numero].filter(Boolean).join(', ');
  const line2 = [bairro, cidade, estado].filter(Boolean).join(' - ');

  if (!line1 && !line2) return 'Endereco nao informado';
  if (!line2) return line1;
  if (!line1) return line2;
  return `${line1} - ${line2}`;
};

export const formatScheduledDate = (value: unknown) => {
  if (!value) return '';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1].slice(-2)}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const mapApiStatusToAdmin = (service: any, tecnico: string): AdminServiceStatus => {
  const status = normalizeStatus(service?.status);

  if (['concluido', 'concluida'].includes(status)) return 'concluido';
  if (['nao_realizado', 'não_realizado', 'cancelado'].includes(status)) return 'nao_realizado';
  if (['aceito', 'em_andamento'].includes(status)) return 'atribuido';
  if (['novo', 'pendente', 'agendado'].includes(status)) {
    return tecnico && tecnico !== 'Nao atribuido' ? 'atribuido' : 'aguardando';
  }

  return tecnico && tecnico !== 'Nao atribuido' ? 'atribuido' : 'aguardando';
};

export async function fetchAdminServicesFromApi(): Promise<AdminServiceData[]> {
  const servicesRes = await fetch(apiUrl('/api/admin/services?page=1&limit=100'), {
    headers: adminHeaders(),
  });
  await throwIfNotOk(servicesRes, 'Nao foi possivel carregar os servicos admin');

  const servicesPayload = await readJsonSafely(servicesRes);
  const rawServices = normalizeServices(servicesPayload);

  return rawServices.map((service: any, index: number) => {
    const serviceId = String(service?.id || service?._id || index + 1);
    const clientData = service?.cliente || {};
    const clientName =
      service?.nome_cliente ||
      clientData?.cliente ||
      clientData?.nome ||
      clientData?.name ||
      service?.cliente ||
      `Cliente ${service?.cliente_id || '-'}`;
    const tecnico =
      service?.nome_tecnico ||
      service?.tecnico_nome ||
      service?.tecnicoResponsavel ||
      service?.tecnico ||
      service?.responsavel ||
      'Nao atribuido';

    const checklist = Array.isArray(service?.checklist)
      ? service.checklist.map((item: any) => ({
          item: String(item?.item || item?.label || item || ''),
          status: Boolean(item?.status ?? item?.done ?? true),
        }))
      : [];

    return {
      id: serviceId,
      tecnicoId: service?.tecnico_id ? String(service.tecnico_id) : undefined,
      numeroPedido: String(service?.numero_pedido || service?.pedido_id || service?.numeroPedido || serviceId),
      descricao: String(service?.descricao_servico || service?.descricao || service?.description || 'Servico'),
      cliente: String(clientName),
      tecnico: String(tecnico),
      endereco: String(service?.endereco_cliente || buildClientAddress(clientData)),
      hora: String(service?.hora_agendada || service?.horaInicio || service?.time || '--:--'),
      data: formatScheduledDate(service?.data_agendada || service?.dataAgendada || service?.date) || '--/--/--',
      status: mapApiStatusToAdmin(service, String(tecnico)),
      checklist,
      motivo: service?.motivo || service?.motivo_nao_realizado || service?.reason || undefined,
      telefone:
        service?.telefone_cliente ||
        clientData?.telefone ||
        clientData?.phone ||
        clientData?.celular ||
        undefined,
    };
  });
}

export async function fetchAdminTecnicosFromApi(): Promise<AdminTecnicoUser[]> {
  const res = await fetch(apiUrl('/api/admin/users/tecnicos?page=1&limit=100'), {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar os tecnicos');

  const payload = await readJsonSafely(res);
  const list = normalizeTecnicos(payload);

  return list.map((item: any, index: number) => ({
    id: String(item?._id || item?.id || index + 1),
    nome: String(item?.nome || item?.name || `Tecnico ${index + 1}`),
    email: String(item?.email || 'nao.informado@yamamotto.com.br'),
    telefone: String(item?.telefone || item?.phone || 'Nao informado'),
  }));
}

export async function fetchAdminDashboardFromApi(): Promise<AdminDashboardData> {
  const res = await fetch(apiUrl('/api/admin/dashboard'), {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar o dashboard admin');

  const payload = (await readJsonSafely(res)) as any;
  return {
    resumo: {
      aguardando: Number(payload?.resumo?.aguardando || 0),
      atribuidos: Number(payload?.resumo?.atribuidos || 0),
      concluidos: Number(payload?.resumo?.concluidos || 0),
      nao_realizados: Number(payload?.resumo?.nao_realizados || 0),
      total: Number(payload?.resumo?.total || 0),
      taxa_conclusao: Number(payload?.resumo?.taxa_conclusao || 0),
      tecnicos_ativos: Number(payload?.resumo?.tecnicos_ativos || 0),
    },
    desempenho_tecnicos: Array.isArray(payload?.desempenho_tecnicos)
      ? payload.desempenho_tecnicos.map((item: any) => ({
          tecnico_id: String(item?.tecnico_id || ''),
          nome: String(item?.nome || 'Tecnico'),
          concluidos: Number(item?.concluidos || 0),
          nao_realizados: Number(item?.nao_realizados || 0),
          pendentes: Number(item?.pendentes || 0),
          total: Number(item?.total || 0),
          taxa_conclusao: Number(item?.taxa_conclusao || 0),
        }))
      : [],
  };
}

export async function assignAdminService(
  serviceId: string,
  payload: AssignAdminServicePayload,
  metadata?: AssignAdminServiceMetadata
): Promise<void> {
  const dataAgendadaIso = parseBrDateToIso(payload.dataAgendada) || payload.dataAgendada;

  const res = await fetch(apiUrl(`/api/services/${serviceId}/admin/atribuir`), {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify({
      tecnico_id: payload.tecnicoId,
      data_agendada: dataAgendadaIso,
      hora_agendada: payload.horaAgendada,
      ...(payload.observacoes ? { observacoes: payload.observacoes } : {}),
    }),
  });

  await throwIfNotOk(res, 'Nao foi possivel atribuir tecnico ao servico');

  const n8nPayload = {
    event: 'service_assigned',
    source: 'app-admin',
    serviceId,
    numeroPedido: metadata?.numeroPedido || serviceId,
    descricao: metadata?.descricao || 'Servico',
    cliente: metadata?.cliente || 'Cliente nao informado',
    telefone: metadata?.telefone || null,
    endereco: metadata?.endereco || 'Endereco nao informado',
    tecnicoId: payload.tecnicoId,
    tecnicoNome: metadata?.tecnicoNome || 'Tecnico nao informado',
    tecnicoEmail: metadata?.tecnicoEmail || null,
    tecnicoTelefone: metadata?.tecnicoTelefone || null,
    dataAgendada: payload.dataAgendada,
    dataAgendadaIso,
    horaAgendada: payload.horaAgendada,
    observacoes: payload.observacoes || null,
    status: 'atribuido',
    assignedAt: new Date().toISOString(),
  };

  const webhookResults = await Promise.allSettled([
    postJson(N8N_WEBHOOK_TEST, n8nPayload),
    postJson(N8N_WEBHOOK_PROD, n8nPayload),
  ]);

  const webhookFailures = webhookResults.filter((result) => result.status === 'rejected');
  if (webhookFailures.length > 0) {
    console.warn('Falha ao enviar atribuicao para n8n:', webhookFailures);
  }
}

export function buildTechniciansFromServices(services: AdminServiceData[]): AdminTechnicianData[] {
  const grouped = new Map<string, AdminTechnicianData>();

  services.forEach((service) => {
    const nome = String(service.tecnico || '').trim();
    if (!nome || nome === 'Nao atribuido') return;

    const key = service.tecnicoId || nome;
    const current = grouped.get(key) || {
      id: service.tecnicoId || slugify(nome) || nome,
      nome,
      email: `${slugify(nome)}@yamamotto.com.br`,
      telefone: service.telefone || 'Nao informado',
      cpf: 'Nao informado',
      area: 'Equipe Tecnica',
      total: 0,
      ativos: 0,
      concluidos: 0,
      observacoes: 'Dados consolidados automaticamente a partir dos servicos retornados pela API.',
      atendimentos: [],
    };

    current.total += 1;
    if (service.status === 'concluido') current.concluidos += 1;
    if (service.status === 'aguardando' || service.status === 'atribuido') current.ativos += 1;

    current.atendimentos.push({
      id: service.id,
      cliente: service.cliente,
      servico: service.descricao,
      status:
        service.status === 'concluido'
          ? 'Concluido'
          : service.status === 'nao_realizado'
            ? 'Aguardando'
            : 'Em andamento',
      data: service.data,
      hora: service.hora,
    });

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}
