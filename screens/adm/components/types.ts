// Tipos extraídos de AdmHomeScreen

export type AdminService = any; // Substitua pelo tipo real se disponível

export type UploadedPhoto = {
  uri: string;
  mimeType?: string;
  fileName?: string;
};

export type FilterState = {
  status: string;
  tecnico: string;
  periodo: string;
};

export type NewServiceForm = {
  // Config
  clientMode: 'new' | 'existing';
  clienteId: string;
  
  // Client new fields
  nomeCompleto: string;
  cpf: string;
  ie: string;
  tipo: string;
  telefone: string;
  celular: string;
  email: string;
  bling_pedido_id: string;
  
  // Endereco
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  
  // Old string that might still be used or ignored
  endereco: string;

  // Service
  observacoes: string;
  descricao: string;
  valor: string;
  forma_de_pagamento: string;
  descricao_pagamento: string;
  chaveDePagamento: string;
  tecnicoResponsavel: string;
  dataHoraVisita: string;
};

export type DropdownKey = 'status' | 'tecnico' | 'periodo' | null;

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ServiceDetail = Omit<AdminService, 'checklist'> & {
  horaConclusao?: string;
  dataConclusao?: string;
  checklist: ChecklistItem[];
  fotoUri?: string;
  comprovanteUri?: string;
  assinaturaUri?: string;
  assinadoPor?: string;
};

export type NaoRealizadoDetail = AdminService & {
  motivoCompleto: string;
};

export type ReagendarForm = {
  tecnicoId: string;
  data: string;
  hora: string;
};
