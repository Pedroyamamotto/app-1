import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export interface ReportData {
  numeroPedido: string;
  status: string;
  dataConclusao: string;
  cliente: string;
  telefone: string;
  endereco: string;
  tecnico: string;
  descricao: string;
  formaPagamento: string;
  descricaoPagamento: string;
  chavePagamento: string;
  valor: string;
  observacoes: string;
  duracaoAtendimentoMin: number;
  pausas: number;
  checklist: { label: string; done: boolean }[];
  fotosServico: string[];
  fotosContexto: string[];
  comprovanteUri?: string;
  assinaturaUri?: string;
}

const normalizeSignatureUri = (uri: string | null | undefined) => {
  if (!uri) return '';
  const trimmed = uri.trim();
  if (trimmed.startsWith('http') || trimmed.startsWith('file:') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.length > 50) {
    return `data:image/png;base64,${trimmed}`;
  }
  return trimmed;
};

const buildReportHtml = (data: ReportData): string => {
  const checklistHtml = data.checklist.map(item => `
    <div class="checklist-item ${item.done ? 'done' : 'pending'}">
      <span class="checkbox">${item.done ? '✓' : '○'}</span>
      <span class="label">${item.label}</span>
    </div>
  `).join('');

  const servicePhotosHtml = data.fotosServico.map((uri, idx) => {
    const norm = normalizeSignatureUri(uri);
    return `
      <div class="photo-card">
        <img src="${norm}" alt="Foto Serviço ${idx + 1}" />
        <p>Foto do Serviço ${idx + 1}</p>
      </div>
    `;
  }).join('');

  const contextPhotosHtml = data.fotosContexto.map((uri, idx) => {
    const norm = normalizeSignatureUri(uri);
    return `
      <div class="photo-card">
        <img src="${norm}" alt="Foto Contexto ${idx + 1}" />
        <p>Foto de Contexto ${idx + 1}</p>
      </div>
    `;
  }).join('');

  // Signature image
  let signatureHtml = '';
  if (data.assinaturaUri) {
    const normSig = normalizeSignatureUri(data.assinaturaUri);
    signatureHtml = `
      <div class="signature-section">
        <h3>Assinatura do Cliente</h3>
        <img class="signature-img" src="${normSig}" alt="Assinatura" />
      </div>
    `;
  }

  // Comprovante image
  let comprovanteHtml = '';
  if (data.comprovanteUri) {
    const normComp = normalizeSignatureUri(data.comprovanteUri);
    comprovanteHtml = `
      <div class="comprovante-section">
        <h3>Comprovante de Pagamento</h3>
        <img class="comprovante-img" src="${normComp}" alt="Comprovante" />
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #334155;
      margin: 0;
      padding: 30px;
      background-color: #ffffff;
    }
    .header {
      border-bottom: 2px solid #7A1A1A;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 {
      font-size: 24px;
      color: #7A1A1A;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .order-no {
      font-size: 16px;
      font-weight: bold;
      background-color: #fee2e2;
      color: #7A1A1A;
      padding: 6px 12px;
      border-radius: 6px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1e293b;
      border-left: 4px solid #7A1A1A;
      padding-left: 10px;
      margin-top: 30px;
      margin-bottom: 15px;
      text-transform: uppercase;
      page-break-after: avoid;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 500;
      color: #64748b;
    }
    .info-value {
      font-weight: bold;
      color: #0f172a;
    }
    .checklist-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .checklist-item {
      display: flex;
      align-items: center;
      padding: 10px 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .checklist-item.done {
      background-color: #f0fdf4;
      border-color: #bcf0da;
    }
    .checklist-item.pending {
      background-color: #f8fafc;
    }
    .checklist-item .checkbox {
      margin-right: 12px;
      font-weight: bold;
      font-size: 16px;
    }
    .checklist-item.done .checkbox {
      color: #16a34a;
    }
    .checklist-item.pending .checkbox {
      color: #cbd5e1;
    }
    .checklist-item .label {
      font-size: 14px;
    }
    .photos-container {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 15px;
    }
    .photo-card {
      width: 48%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
      background-color: #f8fafc;
      page-break-inside: avoid;
    }
    .photo-card img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-radius: 6px;
    }
    .photo-card p {
      margin: 8px 0 0 0;
      font-size: 12px;
      color: #64748b;
    }
    .signature-section, .comprovante-section {
      text-align: center;
      margin-top: 30px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background-color: #f8fafc;
      width: 60%;
      margin-left: auto;
      margin-right: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .info-card, .checklist-item, .photo-card {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-img, .comprovante-img {
      max-width: 100%;
      max-height: 120px;
      object-fit: contain;
      margin-top: 10px;
    }
    .footer {
      text-align: center;
      margin-top: 50px;
      font-size: 11px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Yama Serviços</h1>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Relatório de Atendimento Concluído</p>
    </div>
    <div class="order-no">BLING-${data.numeroPedido}</div>
  </div>

  <div class="grid">
    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Cliente</span>
        <span class="info-value">${data.cliente}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Telefone</span>
        <span class="info-value">${data.telefone}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Endereço</span>
        <span class="info-value">${data.endereco}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Técnico</span>
        <span class="info-value">${data.tecnico}</span>
      </div>
    </div>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Serviço</span>
        <span class="info-value">${data.descricao}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Duração</span>
        <span class="info-value">${data.duracaoAtendimentoMin} min</span>
      </div>
      <div class="info-row">
        <span class="info-label">Pausas</span>
        <span class="info-value">${data.pausas}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Finalizado em</span>
        <span class="info-value">${data.dataConclusao}</span>
      </div>
    </div>
  </div>

  <div class="section-title">Detalhes do Pagamento</div>
  <div class="info-card" style="margin-bottom: 20px;">
    <div class="grid">
      <div>
        <div class="info-row">
          <span class="info-label">Forma de Pagamento</span>
          <span class="info-value">${data.formaPagamento}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Descrição</span>
          <span class="info-value">${data.descricaoPagamento}</span>
        </div>
      </div>
      <div>
        <div class="info-row">
          <span class="info-label">Chave de Pagamento</span>
          <span class="info-value">${data.chavePagamento}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Valor Cobrado</span>
          <span class="info-value" style="color: #15803d;">${data.valor}</span>
        </div>
      </div>
    </div>
    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
      <span class="info-label" style="display: block; margin-bottom: 4px;">Observações de Finalização</span>
      <p style="margin: 0; font-size: 13px; color: #475569; font-style: italic;">${data.observacoes || 'Nenhuma observação informada.'}</p>
    </div>
  </div>

  <div class="section-title">Checklist de Instalação</div>
  <div class="checklist-container">
    ${checklistHtml}
  </div>

  ${servicePhotosHtml || contextPhotosHtml ? '<div class="section-title" style="page-break-before: always;">Fotos Registradas</div>' : ''}
  <div class="photos-container">
    ${servicePhotosHtml}
    ${contextPhotosHtml}
  </div>

  ${comprovanteHtml}

  ${signatureHtml}

  <div class="footer">
    Relatório gerado automaticamente pelo aplicativo Yama Gestão de Serviços em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}.
  </div>
</body>
</html>
  `;
};

export const gerarRelatorioPDF = async (data: ReportData) => {
  try {
    const html = buildReportHtml(data);
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Relatório de Atendimento BLING-${data.numeroPedido}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Erro', 'O compartilhamento de arquivos não está disponível neste dispositivo.');
    }
  } catch (error: any) {
    console.warn('Erro ao gerar relatório:', error);
    Alert.alert('Erro', 'Não foi possível gerar e compartilhar o relatório em PDF.');
  }
};
