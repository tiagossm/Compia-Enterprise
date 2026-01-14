import z from "zod";

export const ChecklistFieldTypeSchema = z.enum([
  'text',
  'textarea',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'number',
  'date',
  'time',
  'boolean',
  'rating',
  'file'
]);

export type ChecklistFieldType = z.infer<typeof ChecklistFieldTypeSchema>;

// Tipos de modo de conformidade
export const ComplianceModeSchema = z.enum([
  'auto',      // Automático baseado na resposta
  'manual',    // Inspetor avalia manualmente
  'disabled'   // Conformidade desabilitada para este campo
]);
export type ComplianceMode = z.infer<typeof ComplianceModeSchema>;

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'not_applicable' | 'unanswered';

// Configuração de conformidade por tipo de campo
export const ComplianceConfigSchema = z.object({
  // Para boolean: qual valor = conforme
  compliant_value: z.any().optional(),       // ex: true, "Sim"
  non_compliant_value: z.any().optional(),   // ex: false, "Não"
  // Para number: range de conformidade
  min_value: z.number().optional(),          // valor mínimo para ser conforme
  max_value: z.number().optional(),          // valor máximo para ser conforme
  // Para rating: threshold
  min_rating: z.number().optional(),         // rating mínimo para ser conforme (ex: 4)
  // Para select/radio: opções conformes
  compliant_options: z.array(z.string()).optional(), // lista de opções que = conforme
}).optional();
export type ComplianceConfig = z.infer<typeof ComplianceConfigSchema>;

export const ChecklistFieldSchema = z.object({
  id: z.number().optional(),
  template_id: z.number(),
  field_name: z.string().min(1, "Nome do campo é obrigatório"),
  field_type: ChecklistFieldTypeSchema,
  is_required: z.boolean().default(false),
  options: z.string().optional(), // JSON string for select/radio options
  order_index: z.number().default(0),
  // Configuração de conformidade
  compliance_enabled: z.boolean().default(true),
  compliance_mode: ComplianceModeSchema.default('auto'),
  compliance_config: z.string().optional(), // JSON string for ComplianceConfig
  created_at: z.string().optional(),
  updated_at: z.string().optional(),

  // Runtime fields (UI only)
  initial_value: z.any().optional(),
  initial_comment: z.string().optional(),
  initial_compliance_status: z.string().optional(),
  initial_ai_analysis: z.string().optional(),
});

export type ChecklistField = z.infer<typeof ChecklistFieldSchema>;

export const ChecklistTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Nome do template é obrigatório"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  created_by: z.string().optional(),
  is_public: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  // Hierarchical folder support
  parent_category_id: z.number().optional(),
  folder_id: z.string().optional(),
  category_path: z.string().optional(),
  is_category_folder: z.boolean().default(false),
  folder_color: z.string().default('#3B82F6'),
  folder_icon: z.string().default('folder'),
  display_order: z.number().default(0),
});

export type ChecklistTemplate = z.infer<typeof ChecklistTemplateSchema>;

export const AIChecklistRequestSchema = z.object({
  industry: z.string().min(1, "Setor é obrigatório"),
  location_type: z.string().min(1, "Tipo de local é obrigatório"),
  specific_requirements: z.string().optional(),
  template_name: z.string().min(1, "Nome do template é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),

  // Advanced Configuration
  num_questions: z.number().min(5).max(50).default(20),
  detail_level: z.enum(['basico', 'intermediario', 'avancado']).default('intermediario'),
  priority_focus: z.enum(['seguranca', 'operacional', 'qualidade', 'balanceado']).default('balanceado'),
  risk_level: z.enum(['baixo', 'medio', 'alto', 'critico']).default('medio'),

  // Compliance & Standards
  regulatory_standards: z.array(z.string()).optional(),
  certifications_required: z.array(z.string()).optional(),
  company_policies: z.string().optional(),

  // Field Types Preferences
  preferred_field_types: z.array(z.string()).optional(),
  include_media_upload: z.boolean().default(true),
  include_comments: z.boolean().default(true),
  include_action_items: z.boolean().default(true),

  // Template Base
  base_template_id: z.number().optional(),
  merge_with_existing: z.boolean().default(false),

  // Documents & References
  reference_documents: z.array(z.string()).optional(),
  custom_instructions: z.string().optional(),
});

export type AIChecklistRequest = z.infer<typeof AIChecklistRequestSchema>;

export interface AITemplatePreset {
  id: string;
  name: string;
  industry: string;
  location_type: string;
  description: string;
  icon: string;
  color: string;
  default_config: Partial<AIChecklistRequest>;
  sample_fields: string[];
}

export const CSVImportSchema = z.object({
  template_name: z.string().min(1, "Nome do template é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
  csv_data: z.string().min(1, "Dados CSV são obrigatórios"),
});

export type CSVImport = z.infer<typeof CSVImportSchema>;

export interface FieldResponse {
  field_id: number;
  field_name: string;
  field_type: ChecklistFieldType;
  value: any;
  comment?: string;
  compliance_status?: string; // 'compliant' | 'non_compliant' | 'not_applicable' | 'unanswered'
}

export interface ChecklistTemplateWithFields extends ChecklistTemplate {
  fields: ChecklistField[];
  field_count?: number;
}

export interface ChecklistFolder {
  id: string;
  organization_id: number;
  parent_id: string | null;
  name: string;
  slug: string;
  path: string;
  description?: string;
  color: string;
  icon: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  children?: ChecklistFolder[];
  subfolder_count?: number;
  template_count?: number;
}

export interface CategoryFolder extends ChecklistTemplate {
  children: (ChecklistTemplate | CategoryFolder)[];
  template_count: number;
}
