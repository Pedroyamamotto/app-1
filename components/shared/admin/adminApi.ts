import { API_BASE_URL, apiFetch } from '../../../constants/api';
import { appendFileDataToForm } from '../../../utils/platformUtils';

export type AdminServiceStatus = 'aguardando' | 'atribuido' | 'concluido' | 'nao_realizado';

export type AdminServiceData = {
  id: string;
  tecnicoId?: string;
  pedidoId?: string;
  numeroPedido: string;
  numeroOrdemServico?: string;
  descricao: string;
  cliente: string;
  tecnico: string;
  endereco: string;
  hora: string;
  data: string;
  status: AdminServiceStatus;
  checklist?: { item: string; status: boolean }[];
  fotoUri?: string;
  fotosContextoUris?: string[];
  assinaturaUri?: string;
  assinadoPor?: string;
  horaConclusao?: string;
  dataConclusao?: string;
  motivo?: string;
  telefone?: string;
  clienteId?: string;
  comprovanteUri?: string;
  tempoTrabalhadoMs?: number;
  quantidadePausas?: number;
  iniciadoEm?: string;
  rawClientData?: any;
  motivoSemComprovante?: string;
};

export type AdminTecnicoUser = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  gerenteId?: string;
  criadoEm?: string;
  lastLocation?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
};

export type AdminGerenteUser = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  tecnicosVinculados: number;
  lastLocation?: {
    latitude: number;
    longitude: number;
    updated_at: string;
  };
  total?: number;
  ativos?: number;
  concluidos?: number;
  tempoMedioMs?: number;
  atendimentos?: {
    id: string;
    cliente: string;
    servico: string;
    status: AdminServiceStatus;
    data: string;
    hora: string;
    telefone?: string;
    endereco?: string;
    dataConclusao?: string;
    horaConclusao?: string;
    numeroPedido?: string;
    numeroOrdemServico?: string;
  }[];
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
  tempoTotalMs?: number;
  tempoMedioMs?: number;
  observacoes: string;
  atendimentos: {
    id: string;
    cliente: string;
    servico: string;
    status: AdminServiceStatus;
    data: string;
    hora: string;
    telefone?: string;
    endereco?: string;
    dataConclusao?: string;
    horaConclusao?: string;
    numeroPedido?: string;
    numeroOrdemServico?: string;
  }[];
  endereco?: string;
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
  tempo_total_ms?: number;
  tempo_medio_ms?: number;
};

export type AdminDashboardData = {
  resumo: AdminDashboardSummary;
  desempenho_tecnicos: AdminDashboardTecnico[];
};

export function formatTimeDuration(ms?: number | null): string {
  if (ms == null || ms <= 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin === 0) return '< 1m';
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m}m`;
}

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
  assignedByEmail?: string;
  assignedByName?: string;
  assignedById?: string;
};

type UploadServiceContextPhotoPayload = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

export type SmartAssignmentSuggestion = {
  tecnicoId: string;
  nome: string;
  email: string;
  telefone: string;
  role: 'tecnico' | 'gerente';
  distanceKm: number | null;
  activeCount: number;
};

export type CreateAdminServiceRequestPayload = {
  nomeCompleto: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  descricao: string;
  observacoes?: string;
  dataAgendadaIso: string;
  horaAgendada: string;
  tecnicoId?: string;
  clienteId?: string;
};

export type AdminServiceFinalizacao = {
  checklist?: { item: string; status: boolean }[];
  fotos?: string[];
  assinatura?: string;
  observacoes?: string;
  motivoSemComprovante?: string;
};

const normalizeFinalizacaoChecklist = (value: unknown): { item: string; status: boolean }[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((entry: any, index: number) => {
        if (typeof entry === 'string') {
          const item = entry.trim();
          return item ? { item, status: true } : null;
        }

        const item = String(entry?.item || entry?.label || entry?.nome || entry?.descricao || `Item ${index + 1}`).trim();
        return item
          ? {
              item,
              status: Boolean(entry?.status ?? entry?.done ?? entry?.checked ?? true),
            }
          : null;
      })
      .filter(Boolean) as { item: string; status: boolean }[];
  }

  if (typeof value === 'object') {
    const CHECKLIST_KEY_LABELS: Record<string, string> = {
      instalacao_concluida: 'Instalação da fechadura digital concluída',
      cadastro_senhas: 'Configuração e cadastro de senhas/digitais realizado',
      teste_abertura: 'Teste de abertura com digital/senha/cartão aprovado',
      cobranca_feita: 'Cobrança feita',
      cobranca: 'Cobrança feita',
      teste_travamento: 'Teste de travamento automático funcionando',
      orientacao_cliente: 'Orientação ao cliente sobre uso e manutenção',
      sincronizacao_app: 'Sincronização com aplicativo (se aplicável)',
      entrega_cartoes: 'Entrega de cartões/chaves extras e manual',
      limpeza_local: 'Limpeza do local de instalação',
    };

    const list: { item: string; status: boolean }[] = [];
    const keys = Object.keys(value);
    for (const key of keys) {
      if (key === '_id' || key === 'servico_id' || key === 'created_at' || key === 'updated_at') {
        continue;
      }
      const val = (value as any)[key];
      if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
        const label = CHECKLIST_KEY_LABELS[key] || key;
        list.push({ item: label, status: Boolean(val) });
      }
    }
    return list;
  }

  return [];
};

const normalizeAdminServiceFinalizacao = (payload: unknown): AdminServiceFinalizacao | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const asAny = payload as any;
  const servico = asAny?.servico || asAny?.service || asAny?.data?.servico || asAny?.data?.service || null;
  const base = asAny?.finalizacao || asAny?.data?.finalizacao || servico || asAny?.data || asAny;

  return {
    checklist: normalizeFinalizacaoChecklist(
      base?.checklist ||
        base?.itens_checklist ||
        base?.itensChecklist ||
        base?.check_list ||
        servico?.checklist
    ),
    fotos: resolveAssetUrls(
      base?.fotos ||
        base?.fotos_contexto ||
        base?.fotosContexto ||
        base?.imagens ||
        base?.fotos_urls ||
        servico?.fotos_urls ||
        servico?.fotos ||
        servico?.foto_url,
      API_BASE_URL
    ),
    assinatura: resolveAssetUrl(
      base?.assinatura || base?.assinatura_url || base?.assinaturaUrl || servico?.assinatura_url || servico?.assinatura,
      API_BASE_URL
    ),
    observacoes: base?.observacoes || base?.observacao || base?.notes || servico?.observacoes || undefined,
    motivoSemComprovante: base?.motivo_sem_comprovante || base?.motivoSemComprovante || servico?.motivo_sem_comprovante || undefined,
  };
};

const normalizeServices = (payload: unknown): any[] => {
  const asAny = payload as any;
  const nestedServices = asAny?.services;
  const nestedData = asAny?.data;
  if (Array.isArray(asAny)) return asAny;
  if (Array.isArray(asAny?.services)) return asAny.services;
  if (Array.isArray(nestedServices?.data)) return nestedServices.data;
  if (Array.isArray(nestedServices?.items)) return nestedServices.items;
  if (Array.isArray(nestedServices?.docs)) return nestedServices.docs;
  if (Array.isArray(asAny?.pedidos)) return asAny.pedidos;
  if (Array.isArray(asAny?.data)) return asAny.data;
  if (Array.isArray(nestedData?.data)) return nestedData.data;
  if (Array.isArray(asAny?.data?.services)) return asAny.data.services;
  if (Array.isArray(asAny?.data?.pedidos)) return asAny.data.pedidos;
  if (Array.isArray(asAny?.data?.items)) return asAny.data.items;
  if (Array.isArray(asAny?.data?.docs)) return asAny.data.docs;
  if (Array.isArray(asAny?.items)) return asAny.items;
  if (Array.isArray(asAny?.docs)) return asAny.docs;
  if (Array.isArray(asAny?.rows)) return asAny.rows;
  if (Array.isArray(asAny?.results)) return asAny.results;
  return [];
};

const normalizeTecnicos = (payload: unknown): any[] => {
  const asAny = payload as any;
  const nestedUsers = asAny?.users;
  const nestedTecnicos = asAny?.tecnicos;
  const nestedData = asAny?.data;
  if (Array.isArray(asAny)) return asAny;
  if (Array.isArray(asAny?.tecnicos)) return asAny.tecnicos;
  if (Array.isArray(nestedTecnicos?.data)) return nestedTecnicos.data;
  if (Array.isArray(nestedTecnicos?.items)) return nestedTecnicos.items;
  if (Array.isArray(nestedTecnicos?.docs)) return nestedTecnicos.docs;
  if (Array.isArray(asAny?.users)) return asAny.users;
  if (Array.isArray(nestedUsers?.data)) return nestedUsers.data;
  if (Array.isArray(nestedUsers?.items)) return nestedUsers.items;
  if (Array.isArray(nestedUsers?.docs)) return nestedUsers.docs;
  if (Array.isArray(asAny?.data)) return asAny.data;
  if (Array.isArray(nestedData?.data)) return nestedData.data;
  if (Array.isArray(asAny?.data?.tecnicos)) return asAny.data.tecnicos;
  if (Array.isArray(asAny?.data?.users)) return asAny.data.users;
  if (Array.isArray(asAny?.data?.items)) return asAny.data.items;
  if (Array.isArray(asAny?.data?.docs)) return asAny.data.docs;
  if (Array.isArray(asAny?.items)) return asAny.items;
  if (Array.isArray(asAny?.docs)) return asAny.docs;
  if (Array.isArray(asAny?.rows)) return asAny.rows;
  if (Array.isArray(asAny?.results)) return asAny.results;
  return [];
};

const normalizeStatus = (status: unknown): string => 
  String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]/g, '_')
    .replace(/_+/g, '_');


let hasWarnedMissingAdminKey = false;
const DEFAULT_EMBEDDED_ADMIN_API_KEY = 'ak_live_2026_Yama_9rT4mN7qX2pL6vK1';

export const getAdminApiKey = () =>
  String(process.env.EXPO_PUBLIC_ADMIN_API_KEY || process.env.ADMIN_API_KEY || DEFAULT_EMBEDDED_ADMIN_API_KEY || '').trim();

export const adminHeaders = () => {
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
      ? `${rawMessage} | Configure EXPO_PUBLIC_ADMIN_API_KEY no build EAS e reinstale o app.`
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

  // Se já estiver no formato DD/MM/YYYY, retorna como está
  if (raw.match(/^\d{2}\/\d{2}\/\d{4}$/)) return raw;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const formatTimeValue = (value: unknown) => {
  if (!value) return '';

  const raw = String(value).trim();
  const hhmmMatch = raw.match(/^(\d{2}:\d{2})/);
  if (hhmmMatch) return hhmmMatch[1];

  const isoMatch = raw.match(/T(\d{2}:\d{2})/);
  if (isoMatch) return isoMatch[1];

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const extractAssetPath = (value: unknown): string => {
  if (!value) return '';

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractAssetPath(item);
      if (found) return found;
    }
    return '';
  }

  if (typeof value === 'object') {
    const asAny = value as any;
    const candidateKeys = [
      'url',
      'uri',
      'location',
      'secure_url',
      'src',
      'originalUrl',
      'publicUrl',
      'downloadUrl',
      'fotoUrl',
      'foto_url',
    ];

    for (const key of candidateKeys) {
      const found = extractAssetPath(asAny?.[key]);
      if (found) return found;
    }

    const nestedKeys = [
      'data',
      'attributes',
      'asset',
      'foto',
      'imagem',
      'fotos_contexto',
      'fotosContexto',
      'porta_cliente',
      'portaCliente',
      'contexto_fotos',
      'contextPhotos',
    ];
    for (const key of nestedKeys) {
      const found = extractAssetPath(asAny?.[key]);
      if (found) return found;
    }
  }

  return '';
};

const resolveAssetUrl = (value: unknown, originBase = API_BASE_URL) => {
  const rawSource = extractAssetPath(value);
  const raw = String(rawSource || '').trim();
  if (!raw || raw === '[object Object]') return undefined;

  const normalized = raw.replace(/\\/g, '/');

  if (/^(https?:|data:|file:|content:)/i.test(normalized)) return encodeURI(normalized);
  if (normalized.startsWith('/')) return encodeURI(`${originBase}${normalized}`);
  return encodeURI(`${originBase}/${normalized}`);
};

const extractAssetPaths = (value: unknown): string[] => {
  const found = new Set<string>();

  const walk = (node: unknown) => {
    if (!node) return;

    if (typeof node === 'string') {
      const raw = String(node).trim();
      if (raw && raw !== '[object Object]') found.add(raw);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (typeof node === 'object') {
      const asAny = node as any;
      const candidateKeys = [
        'url',
        'uri',
        'location',
        'secure_url',
        'src',
        'originalUrl',
        'publicUrl',
        'downloadUrl',
        'fotoUrl',
        'foto_url',
      ];

      candidateKeys.forEach((key) => walk(asAny?.[key]));

      const nestedKeys = [
        'data',
        'attributes',
        'asset',
        'foto',
        'imagem',
        'fotos_contexto',
        'fotosContexto',
        'porta_cliente',
        'portaCliente',
        'contexto_fotos',
        'contextPhotos',
      ];
      nestedKeys.forEach((key) => walk(asAny?.[key]));
    }
  };

  walk(value);
  return Array.from(found);
};

const resolveAssetUrls = (value: unknown, originBase = API_BASE_URL): string[] => {
  return extractAssetPaths(value)
    .map((raw) => {
      const normalized = String(raw).replace(/\\/g, '/');
      if (/^(https?:|data:|file:|content:)/i.test(normalized)) return encodeURI(normalized);
      if (normalized.startsWith('/')) return encodeURI(`${originBase}${normalized}`);
      return encodeURI(`${originBase}/${normalized}`);
    })
    .filter((url, index, array) => array.indexOf(url) === index);
};

const normalizeMongoId = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    const raw = String(value).trim();
    const objectIdMatch = raw.match(/ObjectId\(['\"]?([a-fA-F0-9]{24})['\"]?\)/i);
    if (objectIdMatch) return objectIdMatch[1];
    return raw;
  }

  if (typeof value === 'object') {
    const asAny = value as any;
    return (
      normalizeMongoId(asAny?._id) ||
      normalizeMongoId(asAny?.id) ||
      normalizeMongoId(asAny?.$oid) ||
      normalizeMongoId(asAny?.oid) ||
      ''
    );
  }

  return '';
};

const mapApiStatusToAdmin = (service: any, tecnico: string): AdminServiceStatus => {
  const status = normalizeStatus(service?.status);
  const hasTech = (tecnico && tecnico !== 'Nao atribuido') || !!(normalizeMongoId(service?.tecnico_id || service?.tecnicoId || service?.tecnico?._id || service?.tecnico?.id));

  if (['concluido', 'concluida'].includes(status)) return 'concluido';
  if (['nao_realizado', 'não_realizado', 'cancelado'].includes(status)) return 'nao_realizado';
  if (['aceito', 'em_andamento', 'atribuido', 'atribuida'].includes(status)) return 'atribuido';
  
  if (['novo', 'pendente', 'agendado', 'aguardando'].includes(status)) {
    return hasTech ? 'atribuido' : 'aguardando';
  }

  return hasTech ? 'atribuido' : 'aguardando';
};

async function enrichServicesWithClientData(rawServices: any[], assetOriginBase: string): Promise<AdminServiceData[]> {
  // Mapeamento inicial para pegar os IDs de cliente
  const baseServices = rawServices.map((service: any, index: number) => {
    const rawCliente = service?.cliente;
    const clientData = typeof rawCliente === 'object' && rawCliente !== null ? rawCliente : {};
    const serviceId = String(service?.id || service?._id || index + 1);
    
    const rawTecnico =
      service?.nome_tecnico ||
      service?.tecnico_nome ||
      service?.tecnico?.nome ||
      service?.tecnico?.name ||
      service?.tecnicoResponsavel ||
      (typeof service?.tecnico === 'string' ? service.tecnico : undefined) ||
      service?.responsavel;

    const tecnicoId = normalizeMongoId(service?.tecnico_id || service?.tecnicoId || service?.tecnico?.id || service?.tecnico?._id);
    const tecnico = (typeof rawTecnico === 'string' && rawTecnico.trim()) ? rawTecnico.trim() : (tecnicoId ? 'Tecnico Selecionado' : 'Nao atribuido');

    const checklist = Array.isArray(service?.checklist)
      ? service.checklist.map((item: any) => ({
          item: String(item?.item || item?.label || item || ''),
          status: Boolean(item?.status ?? item?.done ?? true),
        }))
      : [];

    const fotosContextoUris = resolveAssetUrls(
      service?.fotos_contexto ||
        service?.fotosContexto ||
        service?.foto_contexto ||
        service?.fotoContexto ||
        service?.fotosContextoUrls ||
        service?.fotos_contexto_urls ||
        service?.contexto_fotos ||
        service?.contextPhotos,
      assetOriginBase
    );

    const clienteNomeFallback = 
      service?.nome_cliente || 
      service?.cliente_nome || 
      service?.clienteNome || 
      service?.contato ||
      clientData?.nome || 
      clientData?.cliente || 
      clientData?.name ||
      (typeof rawCliente === 'string' && rawCliente.length > 5 && !/^[a-f0-9]{24}$/i.test(rawCliente) ? rawCliente : '');

    const telefoneFallback = 
      service?.telefone_cliente || 
      service?.telefone_contato || 
      service?.telefone || 
      clientData?.telefone ||
      clientData?.phone ||
      '';

    const enderecoFallback = 
      service?.endereco_cliente || 
      service?.endereco_completo || 
      service?.endereco || 
      clientData?.endereco ||
      buildClientAddress(clientData);

    return {
      id: serviceId,
      tecnicoId:
        service?.tecnico_id || service?.tecnicoId || service?.tecnico?.id || service?.tecnico?._id
          ? String(service?.tecnico_id || service?.tecnicoId || service?.tecnico?.id || service?.tecnico?._id)
          : undefined,
      pedidoId: service?.pedido_id || service?._id || service?.id ? String(service?.pedido_id || service?._id || service?.id) : undefined,
      numeroPedido: String(service?.numero_pedido || service?.pedido_id || service?.numeroPedido || serviceId),
      clienteId: normalizeMongoId(
        service?.cliente_id ||
          service?.clienteId ||
          (typeof service?.cliente === 'string' && service.cliente.length > 5 && /^[a-f0-9]{24}$/i.test(service.cliente) ? service.cliente : '') ||
          clientData?._id ||
          clientData?.id
      ),
      numeroOrdemServico:
        service?.ordem_de_servico ||
        service?.ordemDeServico ||
        service?.ordem_servico ||
        service?.ordemServico ||
        service?.numero_os ||
        service?.numeroOS ||
        service?.os_numero ||
        service?.osNumero ||
        service?.numero_ordem_servico ||
        service?.numeroOrdemServico ||
        service?.os?.numero
          ? String(
              service?.ordem_de_servico ||
                service?.ordemDeServico ||
                service?.ordem_servico ||
                service?.ordemServico ||
                service?.numero_os ||
                service?.numeroOS ||
                service?.os_numero ||
                service?.osNumero ||
                service?.numero_ordem_servico ||
                service?.numeroOrdemServico ||
                service?.os?.numero
            )
          : undefined,
      descricao: String(service?.descricao_servico || service?.descricao || service?.description || 'Servico'),
      cliente: String(clienteNomeFallback),
      tecnico: String(tecnico),
      endereco: String(enderecoFallback),
      hora: String(service?.hora || service?.hora_agendada || service?.horaInicio || service?.time || '--:--'),
      data: formatScheduledDate(service?.data || service?.data_agendada || service?.dataAgendada || service?.date) || '--/--/--',
      status: mapApiStatusToAdmin(service, String(tecnico)),
      checklist,
      comprovanteUri: (service?.has_comprovante || service?.hasComprovante)
        ? encodeURI(`${assetOriginBase}/api/admin/services/comprovante/${serviceId}`)
        : undefined,
      fotoUri: (() => {
        const resolved = resolveAssetUrl(
          service?.foto_instalacao ||
            service?.fotoInstalacao ||
            service?.fotoInstalacaoObj ||
            service?.foto_url ||
            service?.fotoUrl ||
            service?.foto_path ||
            service?.fotoPath,
          assetOriginBase
        );
        // Se a foto de instalação resolver para a mesma URL do comprovante, ignorar
        const comprovanteUrl = encodeURI(`${assetOriginBase}/api/admin/services/comprovante/${serviceId}`);
        if (resolved && resolved === comprovanteUrl) return undefined;
        return resolved;
      })(),
      fotosContextoUris,
      assinaturaUri: resolveAssetUrl(
        service?.assinatura_url ||
          service?.assinaturaUrl ||
          service?.assinatura_path ||
          service?.assinaturaPath ||
          service?.assinatura_imagem ||
          service?.assinaturaImagem ||
          service?.assinatura,
        assetOriginBase
      ),
      assinadoPor:
        service?.assinado_por || service?.assinadoPor || service?.nome_assinante || service?.nomeAssinante || undefined,
      motivoSemComprovante: service?.motivo_sem_comprovante || service?.motivoSemComprovante || undefined,
      horaConclusao:
        formatTimeValue(
          service?.hora_conclusao || service?.horaConclusao || service?.finalizado_em || service?.finalizadoEm || service?.updated_at
        ) || undefined,
      dataConclusao:
        formatScheduledDate(
          service?.data_conclusao || service?.dataConclusao || service?.finalizado_em || service?.finalizadoEm || service?.updated_at
        ) || undefined,
      motivo: service?.motivo || service?.motivo_nao_realizado || service?.reason || undefined,
      telefone: String(telefoneFallback),
      // Guardamos o objeto original do cliente se existir para fallback
      rawClientData: clientData,
      tempoTrabalhadoMs: Number(service?.tempo_trabalhado_ms || service?.tempoTrabalhadoMs || 0),
      quantidadePausas: Number(service?.quantidade_pausas || service?.quantidadePausas || 0),
    };
  });

  // Busca informações detalhadas de cada cliente único via /api/clientes/id
  const uniqueClientIds = [...new Set(baseServices.map((s) => s.clienteId).filter(Boolean))];
  const clientsMap = new Map<string, any>();

  if (uniqueClientIds.length > 0) {
    const clientPromises = uniqueClientIds.map(async (cid) => {
      try {
        const res = await apiFetch(`/api/clientes/${cid}`, { headers: adminHeaders() });
        if (res.ok) {
          const data = await readJsonSafely(res);
          return { id: cid, data: data?.cliente || data?.data || data };
        }
      } catch (e) {
        console.warn(`[adminApi] Erro ao buscar cliente ${cid} usando /api/clientes:`, e);
      }
      return { id: cid, data: null };
    });

    const results = await Promise.all(clientPromises);
    results.forEach((r) => {
      if (r.data) clientsMap.set(r.id, r.data);
    });
  }

  // Refina os serviços com os dados reais dos clientes
  return baseServices.map((s) => {
    const clientInfo = s.clienteId ? clientsMap.get(s.clienteId) : null;
    
    // Priorizamos o que veio da busca detalhada, mas se falhar, usamos o fallback que já tínhamos no 's'
    const clientName =
      clientInfo?.cliente ||
      clientInfo?.nome ||
      clientInfo?.name ||
      clientInfo?.nome_completo ||
      clientInfo?.razao_social ||
      s.cliente ||
      (s.clienteId && !/^[a-f0-9]{24}$/i.test(s.clienteId) ? s.clienteId : '') ||
      '';

    const clientLabel = clientName ? clientName : (s.pedidoId ? `Pedido ${s.pedidoId.slice(-6)}` : 'Cliente -');

    const enderecoEnrich = clientInfo ? buildClientAddress(clientInfo) : '';
    const endereco = (enderecoEnrich && !enderecoEnrich.includes('não informado')) ? enderecoEnrich : s.endereco;
    
    const telefoneEnrich = clientInfo?.telefone || clientInfo?.phone || clientInfo?.celular || '';
    const telefone = (telefoneEnrich && telefoneEnrich.trim()) ? telefoneEnrich.trim() : s.telefone;

    return {
      ...s,
      cliente: String(clientLabel),
      endereco: String(endereco),
      telefone: String(telefone),
    };
  });
}

export async function fetchAdminServicesFromApi(): Promise<AdminServiceData[]> {
  const res = await apiFetch('/api/services?limit=200', { headers: adminHeaders() });
  await throwIfNotOk(res, 'Nao foi possivel carregar os servicos');

  let assetOriginBase = API_BASE_URL;
  try {
    if (res.url) assetOriginBase = new URL(res.url).origin;
  } catch {
    assetOriginBase = API_BASE_URL;
  }

  const payload = await readJsonSafely(res);
  const rawServices = normalizeServices(payload);

  return enrichServicesWithClientData(rawServices, assetOriginBase);
}

export async function fetchAdminServicesAllFromApi(): Promise<AdminServiceData[]> {
  const res = await apiFetch('/api/admin/services?limit=200', { headers: adminHeaders() });
  await throwIfNotOk(res, 'Nao foi possivel carregar os servicos admin');

  let assetOriginBase = API_BASE_URL;
  try {
    if (res.url) assetOriginBase = new URL(res.url).origin;
  } catch {
    assetOriginBase = API_BASE_URL;
  }

  const payload = await readJsonSafely(res);
  const rawServices = normalizeServices(payload);

  return enrichServicesWithClientData(rawServices, assetOriginBase);
}

export async function fetchAdminTecnicosFromApi(): Promise<AdminTecnicoUser[]> {
  const res = await apiFetch('/api/admin/users/tecnicos?page=1&limit=100', {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar os tecnicos');

  const payload = await readJsonSafely(res);
  const list = normalizeTecnicos(payload);

  return list.map((item: any, index: number) => ({
    id: normalizeMongoId(item?._id || item?.id) || String(index + 1),
    nome: String(item?.nome || item?.name || `Tecnico ${index + 1}`),
    email: String(item?.email || 'nao.informado@yamamotto.com.br'),
    telefone: String(item?.telefone || item?.phone || 'Nao informado'),
    gerenteId: item?.gerente_id || item?.gerenteId ? String(item?.gerente_id || item?.gerenteId) : undefined,
    criadoEm: item?.Created_et || item?.created_at || item?.Created_at || undefined,
    lastLocation: item?.lastLocation || undefined,
  }));
}

export async function fetchAdminDashboardFromApi(): Promise<AdminDashboardData> {
  const res = await apiFetch('/api/relatorios', {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar o dashboard admin');

  const payload = (await readJsonSafely(res)) as any;
  
  return {
    resumo: {
      aguardando: Number(payload?.aguardando || 0),
      atribuidos: Number(payload?.atribuidos || 0),
      concluidos: Number(payload?.concluidos || 0),
      nao_realizados: Number(payload?.naoRealizados || payload?.nao_realizados || 0),
      total: Number(payload?.total || payload?.pedidosTotais || 0),
      taxa_conclusao: Number(payload?.taxaConclusao || payload?.taxa_conclusao || 0),
      tecnicos_ativos: Number(payload?.tecnicosAtivos || payload?.tecnicos_ativos || 0),
    },
    desempenho_tecnicos: Array.isArray(payload?.servicosConcluidosPorTecnico)
      ? payload.servicosConcluidosPorTecnico.map((item: any) => ({
          tecnico_id: normalizeMongoId(item?._id || item?.tecnico_id || item?.tecnicoId),
          nome: String(item?.nome || ''),
          concluidos: Number(item?.concluidos || 0),
          nao_realizados: 0,
          pendentes: Number(item?.ativos || item?.pendentes || 0),
          total: Number(item?.total_tecnico || item?.total || 0),
          taxa_conclusao: 0,
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
  const assignedByEmail = String(metadata?.assignedByEmail || '').trim();
  const assignedByName = String(metadata?.assignedByName || '').trim();
  const assignedById = String(metadata?.assignedById || '').trim();

  const res = await apiFetch(`/api/services/${serviceId}/admin/atribuir`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(),
      ...(assignedByEmail ? { 'x-user-email': assignedByEmail } : {}),
      ...(assignedByName ? { 'x-user-name': assignedByName } : {}),
      ...(assignedById ? { 'x-user-id': assignedById } : {}),
    },
    body: JSON.stringify({
      tecnico_id: payload.tecnicoId,
      data_agendada: dataAgendadaIso,
      hora_agendada: payload.horaAgendada,
      ...(payload.observacoes ? { observacoes: payload.observacoes } : {}),
    }),
  });

  await throwIfNotOk(res, 'Nao foi possivel atribuir tecnico ao servico');
}

export async function fetchNearestTechnicianSuggestion(
  serviceId: string
): Promise<SmartAssignmentSuggestion | null> {
  const res = await apiFetch(`/api/services/${serviceId}/admin/atribuir/sugestao`, {
    headers: adminHeaders(),
  });

  await throwIfNotOk(res, 'Nao foi possivel calcular sugestao de atribuicao');

  const payload = await readJsonSafely(res);
  const suggestion = (payload as any)?.suggestion;
  if (!suggestion) {
    return null;
  }

  return {
    tecnicoId: normalizeMongoId(suggestion?.tecnico_id || suggestion?.tecnicoId || suggestion?.id),
    nome: String(suggestion?.nome || ''),
    email: String(suggestion?.email || ''),
    telefone: String(suggestion?.telefone || ''),
    role: String(suggestion?.typeUser || 'tecnico') === 'gerente' ? 'gerente' : 'tecnico',
    distanceKm: Number.isFinite(Number(suggestion?.distance_km)) ? Number(suggestion?.distance_km) : null,
    activeCount: Number(suggestion?.active_count || 0),
  };
}

const extractAddressParts = (enderecoCompleto: string) => {
  const raw = String(enderecoCompleto || '').trim();
  const semCep = raw.replace(/\b\d{5}-?\d{3}\b/g, '').trim();
  const principal = semCep.split('-')[0]?.trim() || semCep;
  const sufixo = semCep.includes('-') ? semCep.split('-').slice(1).join('-').trim() : '';

  const ruaNumero = principal.split(',').map((p) => p.trim()).filter(Boolean);
  const rua = ruaNumero[0] || principal || 'Endereco nao informado';
  const numeroEncontrado = principal.match(/\b\d+[a-zA-Z]?\b/)?.[0] || '';
  const numero = ruaNumero[1] || numeroEncontrado || 'S/N';

  const bairroCidade = sufixo.split(',').map((p) => p.trim()).filter(Boolean);
  const bairro = bairroCidade[0] || 'Nao informado';
  const cidade = bairroCidade[1] || 'Sao Paulo';
  const estado = bairroCidade[2] || 'SP';

  return { rua, numero, bairro, cidade, estado };
};

const safeDigits = (value: string) => String(value || '').replace(/\D/g, '');

export async function createAdminServiceRequest(payload: CreateAdminServiceRequestPayload): Promise<{ serviceId: string }> {
  const nowSeed = Date.now();
  const uniqueSeed = String(nowSeed).slice(-8);
  const numeroPedido = `APP-${uniqueSeed}`;
  const blingPvId = `APP-PV-${uniqueSeed}`;

  let clienteId = payload.clienteId;

  if (!clienteId) {
    const enderecoParts = extractAddressParts(payload.endereco);
    const cepDigits = safeDigits(payload.cep);
    const cpfDigits = String(nowSeed).padStart(11, '0').slice(-11);

    const clienteRes = await apiFetch('/api/clientes', {
      method: 'POST',
      headers: adminHeaders(),
      body: JSON.stringify({
        nome: payload.nomeCompleto,
        telefone: payload.telefone,
        email: payload.email,
        cpf: cpfDigits,
        cep: cepDigits || payload.cep,
        rua: enderecoParts.rua,
        numero: enderecoParts.numero,
        bairro: enderecoParts.bairro,
        cidade: enderecoParts.cidade,
        estado: enderecoParts.estado,
      }),
    });
    await throwIfNotOk(clienteRes, 'Nao foi possivel criar cliente');
    const clientePayload = await readJsonSafely(clienteRes);
    clienteId = normalizeMongoId((clientePayload as any)?.clienteId || (clientePayload as any)?._id || (clientePayload as any)?.id);
  }

  if (!clienteId) {
    throw new Error('API nao retornou clienteId ao criar cliente');
  }

  const pedidoRes = await apiFetch('/api/pedidos', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      bling_pv_id: blingPvId,
      cliente_id: clienteId,
      modelo_produto: payload.descricao,
      tipo_servico: 'instalacao',
      tem_instalacao: true,
      observacoes: payload.observacoes || undefined,
    }),
  });
  await throwIfNotOk(pedidoRes, 'Nao foi possivel criar pedido');
  const pedidoPayload = await readJsonSafely(pedidoRes);
  const pedidoId = normalizeMongoId((pedidoPayload as any)?.pedidoId || (pedidoPayload as any)?._id || (pedidoPayload as any)?.id);

  if (!pedidoId) {
    throw new Error('API nao retornou pedidoId ao criar pedido');
  }

  const servicoRes = await apiFetch('/api/services', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      numero_pedido: numeroPedido,
      pedido_id: pedidoId,
      cliente_id: clienteId,
      descricao_servico: payload.descricao,
      observacoes: payload.observacoes || undefined,
      data_agendada: payload.dataAgendadaIso,
      hora_agendada: payload.horaAgendada,
      status: 'aguardando',
    }),
  });
  await throwIfNotOk(servicoRes, 'Nao foi possivel criar servico');
  const servicoPayload = await readJsonSafely(servicoRes);
  const serviceId = normalizeMongoId((servicoPayload as any)?.serviceId || (servicoPayload as any)?._id || (servicoPayload as any)?.id);

  if (!serviceId) {
    throw new Error('API nao retornou serviceId ao criar servico');
  }

  if (payload.tecnicoId) {
    await assignAdminService(
      serviceId,
      {
        tecnicoId: payload.tecnicoId,
        dataAgendada: payload.dataAgendadaIso,
        horaAgendada: payload.horaAgendada,
        observacoes: payload.observacoes,
      },
      undefined
    );
  }

  return { serviceId };
}

export async function uploadAdminServiceContextPhoto(
  serviceId: string,
  payload: UploadServiceContextPhotoPayload
): Promise<void> {
  if (!payload.uri || typeof payload.uri !== 'string' || payload.uri.trim() === '' || payload.uri === 'null' || payload.uri === 'undefined') {
    throw new Error('URI da foto inválida ou não definida.');
  }
  const form = new FormData();
  await appendFileDataToForm(form, 'foto', {
    uri: payload.uri,
    mimeType: payload.mimeType || 'image/jpeg',
    fileName: payload.fileName || 'foto.jpg',
  });

  // DEBUG: logar conteúdo do form (apenas para desenvolvimento)
  if (__DEV__) {
    // No React Native, não é possível iterar FormData diretamente, mas podemos logar os dados principais
    console.log('[uploadAdminServiceContextPhoto] Enviando foto:', {
      serviceId,
      uri: payload.uri,
      mimeType: payload.mimeType,
      fileName: payload.fileName,
    });
  }

  const adminApiKey = getAdminApiKey();
  const res = await apiFetch(`/api/admin/services/${serviceId}/fotos-contexto`, {
    method: 'POST',
    headers: adminApiKey ? { 'x-admin-key': adminApiKey } : { 'x-user-type': 'admin' },
    body: form,
  });

  await throwIfNotOk(res, 'Nao foi possivel enviar foto de contexto');
}

export async function updateAdminService(
  serviceId: string,
  payload: Record<string, any>
): Promise<void> {
  const res = await apiFetch(`/api/servicos/editar-completo/${serviceId}`, {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });

  await throwIfNotOk(res, 'Nao foi possivel atualizar o servico');
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
      tempoTotalMs: 0,
      tempoMedioMs: 0,
      observacoes: 'Dados consolidados automaticamente a partir dos servicos retornados pela API.',
      atendimentos: [],
    };

    current.total += 1;
    if (service.status === 'concluido') {
      current.concluidos += 1;
      const workedMs = Number(service.tempoTrabalhadoMs || (service as any).tempo_trabalhado_ms || 0);
      if (workedMs > 0) {
        current.tempoTotalMs = (current.tempoTotalMs || 0) + workedMs;
      }
    }
    if (service.status === 'aguardando' || service.status === 'atribuido') {
      current.ativos += 1;
    }

    current.tempoMedioMs = current.concluidos > 0 && current.tempoTotalMs
      ? Math.round(current.tempoTotalMs / current.concluidos)
      : 0;

    current.atendimentos.push({
      id: service.id,
      cliente: service.cliente,
      servico: service.descricao,
      status: service.status,
      data: service.data,
      hora: service.hora,
      telefone: service.telefone,
      endereco: service.endereco,
      dataConclusao: service.dataConclusao,
      horaConclusao: service.horaConclusao,
      numeroPedido: service.numeroPedido,
      numeroOrdemServico: service.numeroOrdemServico,
    });

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

export const fetchAdminServiceFinalizacao = async (
  serviceId: string
): Promise<AdminServiceFinalizacao | null> => {
  const res = await apiFetch(`/api/services/${serviceId}/finalizacao`);

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Erro ao buscar Dados: ${res.status}`);
  }

  const payload = await res.json().catch(() => null);
  return normalizeAdminServiceFinalizacao(payload);
};

export async function fetchAdminGerentesFromApi(): Promise<AdminGerenteUser[]> {
  const res = await apiFetch('/api/admin/users/gerentes', {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar os gerentes');

  const payload = await readJsonSafely(res);
  const list = Array.isArray(payload?.gerentes) ? payload.gerentes : [];

  return list.map((item: any) => ({
    id: normalizeMongoId(item?._id || item?.id || ''),
    nome: String(item?.nome || item?.name || 'Gerente'),
    email: String(item?.email || ''),
    telefone: String(item?.telefone || item?.phone || ''),
    tecnicosVinculados: Number(item?.tecnicosVinculados || 0),
    lastLocation: item?.lastLocation || undefined,
  }));
}

export async function updateAdminUser(userId: string, data: any): Promise<void> {
  const res = await apiFetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: {
      ...adminHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res, 'Nao foi possivel atualizar o usuario');
}

export type AdminCliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

export async function fetchAdminClientesFromApi(): Promise<AdminCliente[]> {
  const res = await apiFetch('/api/clientes', {
    headers: adminHeaders(),
  });
  await throwIfNotOk(res, 'Nao foi possivel carregar os clientes');

  const payload = await readJsonSafely(res);
  const list = Array.isArray(payload?.clientes) ? payload.clientes : [];

  return list.map((item: any) => ({
    id: normalizeMongoId(item?._id || item?.id || ''),
    nome: String(item?.nome || item?.name || 'Cliente'),
    telefone: String(item?.telefone || item?.celular || ''),
    email: String(item?.email || ''),
    cpf: item?.cpf ? String(item.cpf) : undefined,
    cep: item?.cep ? String(item.cep) : undefined,
    rua: item?.rua ? String(item.rua) : undefined,
    numero: item?.numero ? String(item.numero) : undefined,
    bairro: item?.bairro ? String(item.bairro) : undefined,
    cidade: item?.cidade ? String(item.cidade) : undefined,
    estado: item?.estado ? String(item.estado) : undefined,
  }));
}

