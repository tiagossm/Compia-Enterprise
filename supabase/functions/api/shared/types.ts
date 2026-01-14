import z from "zod";

export interface Organization {
  id: number;
  name: string;
  type: 'company' | 'consultancy' | 'client';
  description?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent_organization_id?: number;
  organization_level?: string;
  subscription_status?: string;
  subscription_plan?: string;
  max_users?: number;
  max_subsidiaries?: number;
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  website?: string;
  faturamento_anual?: number;
  cnae_principal?: string;
  cnae_descricao?: string;
  natureza_juridica?: string;
  data_abertura?: string;
  capital_social?: number;
  porte_empresa?: string;
  situacao_cadastral?: string;
  numero_funcionarios?: number;
  setor_industria?: string;
  subsetor_industria?: string;
  certificacoes_seguranca?: string;
  data_ultima_auditoria?: string;
  nivel_risco?: string;
  contato_seguranca_nome?: string;
  contato_seguranca_email?: string;
  contato_seguranca_telefone?: string;
  historico_incidentes?: string;
  observacoes_compliance?: string;
}

export const InspectionSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().optional(),
  location: z.string().min(1, "Local é obrigatório"),
  company_name: z.string().min(1, "Nome da empresa é obrigatório"),
  cep: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  inspector_name: z.string().min(1, "Nome do inspetor é obrigatório"),
  inspector_email: z.string().email("Email inválido").optional(),
  responsible_name: z.string().optional(),
  responsible_email: z.string().email("Email inválido").optional(),
  status: z.enum(['pendente', 'em_andamento', 'concluida', 'cancelada']).default('pendente'),
  priority: z.enum(['baixa', 'media', 'alta', 'critica']).default('media'),
  scheduled_date: z.string().optional(),
  completed_date: z.string().optional(),
  action_plan: z.string().optional(),
  action_plan_type: z.enum(['5w2h', 'simple']).default('5w2h'),
  created_at: z.string(),
  updated_at: z.string(),
});

export type InspectionType = z.infer<typeof InspectionSchema>;

export const InspectionItemSchema = z.object({
  id: z.number().optional(),
  inspection_id: z.number(),
  category: z.string().min(1, "Categoria é obrigatória"),
  item_description: z.string().min(1, "Descrição é obrigatória"),
  is_compliant: z.boolean().optional(),
  observations: z.string().optional(),
  photo_url: z.string().optional(),
  compliance_status: z.string().optional(), // 'compliant' | 'non_compliant' | 'not_applicable' | 'unanswered'
});

export type InspectionItemType = z.infer<typeof InspectionItemSchema>;

export const InspectionReportSchema = z.object({
  id: z.number().optional(),
  inspection_id: z.number(),
  summary: z.string().optional(),
  recommendations: z.string().optional(),
  risk_level: z.enum(['baixo', 'medio', 'alto', 'critico']).optional(),
  report_url: z.string().optional(),
});

export type InspectionReportType = z.infer<typeof InspectionReportSchema>;

export const InspectionMediaSchema = z.object({
  id: z.number().optional(),
  inspection_id: z.number(),
  inspection_item_id: z.number().optional(),
  media_type: z.enum(['image', 'video', 'audio', 'document']),
  file_name: z.string().min(1, "Nome do arquivo é obrigatório"),
  file_url: z.string().min(1, "URL do arquivo é obrigatória"),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  description: z.string().optional(),
});

export type InspectionMediaType = z.infer<typeof InspectionMediaSchema>;

export const AIAnalysisRequestSchema = z.object({
  inspection_id: z.number(),
  media_urls: z.array(z.string()),
  inspection_context: z.string(),
  non_compliant_items: z.array(z.string()),
});

export type AIAnalysisRequest = z.infer<typeof AIAnalysisRequestSchema>;
