/**
 * Teste E2E de atribuição de técnico com webhook n8n
 * Cria dados de teste, atribui técnico, valida resposta e limpa tudo.
 */

const BASE = 'https://api-bling-990709313938.us-central1.run.app';
const ADMIN_KEY = 'ak_live_2026_Yama_9rT4mN7qX2pL6vK1';
const EXPECTED_WEBHOOK_URL = 'https://yamamotto-dev.app.n8n.cloud/webhook/Conclusao';
const TS = Date.now();

const baseHeaders = {
  'Content-Type': 'application/json',
  'x-admin-key': ADMIN_KEY,
};

const assignHeaders = {
  ...baseHeaders,
  'x-user-email': 'admin-teste@yamamotto.com',
  'x-user-name': 'Admin E2E',
  'x-user-id': 'test-e2e-runner',
};

const post = async (path, body, hdrs = baseHeaders) => {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
};

const patch = async (path, body, hdrs = assignHeaders) => {
  const res = await fetch(`${BASE}${path}`, { method: 'PATCH', headers: hdrs, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
};

const del = async (path) => {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: baseHeaders });
  return res.status;
};

const testWebhookDirect = async () => {
  const res = await fetch(EXPECTED_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teste: 'ok', origem: 'script_e2e_atribuicao' }),
  });

  const text = await res.text().catch(() => '');
  return { status: res.status, ok: res.ok, bodyPreview: text.slice(0, 240) };
};

const log = (icon, msg, data) => {
  console.log(`${icon} ${msg}`);
  if (data !== undefined) console.log('   ' + JSON.stringify(data, null, 2).replace(/\n/g, '\n   '));
};

let hasFailure = false;

// ─── Criação de dados ────────────────────────────────────────────────────────

log('🚀', 'Iniciando teste E2E de atribuição com webhook n8n...\n');

// 0. Validar webhook diretamente
log('0️⃣ ', 'Validando endpoint do webhook direto no n8n...');
const webhookDirect = await testWebhookDirect();
log('   ℹ️', `Webhook direto retornou HTTP ${webhookDirect.status}`, {
  ok: webhookDirect.ok,
  preview: webhookDirect.bodyPreview,
});

// 1. Criar técnico de teste
log('1️⃣ ', 'Criando técnico de teste...');
const tecnicoRes = await post('/api/users', {
  nome: 'Técnico E2E Test',
  email: `tecnico-e2e-${TS}@yamamotto.com`,
  password: 'Teste@1234',
  typeUser: 'tecnico',
  telefone: '11999990001',
});
const tecnicoId = tecnicoRes.userId;
log('   ✅', `ID: ${tecnicoId}`);

// 2. Criar cliente de teste
log('2️⃣ ', 'Criando cliente de teste...');
const clienteRes = await post('/api/clientes', {
  nome: 'Cliente E2E Test',
  email: `cliente-e2e-${TS}@yamamotto.com`,
  telefone: '11999990002',
  cpf: `${String(TS).slice(-3)}.${String(TS).slice(-6,-3)}.${String(TS).slice(-9,-6)}-${String(TS).slice(-2)}`,
  rua: 'Rua Teste E2E',
  numero: '100',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01310-100',
});
const clienteId = clienteRes.clienteId;
log('   ✅', `ID: ${clienteId}`);

// 3. Criar pedido de teste
log('3️⃣ ', 'Criando pedido de teste...');
const pedidoRes = await post('/api/pedidos', {
  bling_pv_id: `E2E-PV-${TS}`,
  cliente_id: clienteId,
  modelo_produto: 'Camera IP E2E',
  tipo_servico: 'instalacao',
  tem_instalacao: true,
  descricao: 'Pedido E2E Test',
  status: 'pendente',
  observacoes: 'Pedido criado automaticamente pelo teste E2E',
  numero_pedido: `E2E-${TS}`,
});
const pedidoId = pedidoRes.pedidoId ?? pedidoRes._id ?? pedidoRes.id;
log('   ✅', `ID: ${pedidoId}`);

// 4. Criar OS de teste
log('4️⃣ ', 'Criando ordem de serviço de teste...');
const tomorrow = new Date(Date.now() + 86400000).toISOString();
const serviceRes = await post('/api/services', {
  numero_pedido: `E2E-${TS}`,
  pedido_id: pedidoId,
  cliente_id: clienteId,
  descricao_servico: 'OS E2E Test – Instalação de câmera',
  data_agendada: tomorrow,
  hora_agendada: '09:00',
  status: 'aguardando',
});
const serviceId = serviceRes.serviceId ?? serviceRes._id ?? serviceRes.id;
log('   ✅', `ID: ${serviceId}`);

// ─── Atribuição ──────────────────────────────────────────────────────────────

console.log('');
log('🎯 ', 'Atribuindo técnico à OS...');
const atribuirRes = await patch(
  `/api/services/${serviceId}/admin/atribuir`,
  {
    tecnico_id: tecnicoId,
    data_agendada: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    hora_agendada: '09:00',
    observacoes: 'Atribuição via teste E2E',
  }
);

console.log('');
log('📬 ', `Resposta da atribuição (HTTP ${atribuirRes.status}):`, {
  success: atribuirRes.json.success,
  message: atribuirRes.json.message,
  service_status: atribuirRes.json.service?.status,
  webhook: atribuirRes.json.webhook,
});

if (atribuirRes.ok) {
  const webhookSent = atribuirRes.json?.webhook?.sent === true;
  const webhookUrl = String(atribuirRes.json?.webhook?.url || '');
  const expectedEncoded = encodeURI(EXPECTED_WEBHOOK_URL);
  const urlMatches = webhookUrl === EXPECTED_WEBHOOK_URL || webhookUrl === expectedEncoded;

  if (!webhookSent) {
    hasFailure = true;
    log('\n❌ ', 'Atribuição OK, mas webhook NÃO foi enviado.', {
      webhookSent,
      webhookUrl,
      expected: EXPECTED_WEBHOOK_URL,
      error: atribuirRes.json?.webhook?.error || null,
    });
  } else if (!urlMatches) {
    hasFailure = true;
    log('\n⚠️ ', 'Webhook enviado, mas URL retornada pelo backend não bate com a URL esperada.', {
      webhookUrl,
      expected: EXPECTED_WEBHOOK_URL,
    });
  } else {
    log('\n✅ ', 'SUCESSO REAL! Webhook enviado para a URL esperada. Verifique a aba Executions no n8n.');
  }
} else {
  hasFailure = true;
  log('\n❌ ', `FALHA (HTTP ${atribuirRes.status}): ${atribuirRes.json.message}`);
  if (atribuirRes.json.webhook?.error) {
    log('   ⚠️ ', `Detalhe webhook: ${atribuirRes.json.webhook.error}`);
  }
}

// ─── Limpeza ─────────────────────────────────────────────────────────────────

console.log('');
log('🧹 ', 'Limpando dados de teste...');
const s1 = await del(`/api/services/${serviceId}`);   log('   🗑️', `OS deletada (${s1})`);
const s2 = await del(`/api/pedidos/${pedidoId}`);     log('   🗑️', `Pedido deletado (${s2})`);
const s3 = await del(`/api/clientes/${clienteId}`);   log('   🗑️', `Cliente deletado (${s3})`);
const s4 = await del(`/api/users/${tecnicoId}`);      log('   🗑️', `Técnico deletado (${s4})`);

console.log('');
log('🏁 ', 'Teste concluído.');

if (hasFailure) {
  process.exitCode = 1;
}
