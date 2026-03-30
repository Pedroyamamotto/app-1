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
  nomeCompleto: string;
  telefone: string;
  cep: string;
  email: string;
  endereco: string;
  observacoes: string;
  descricao: string;
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
