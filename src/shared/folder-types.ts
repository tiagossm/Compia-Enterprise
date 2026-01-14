import z from "zod";

export const ChecklistFolderSchema = z.object({
  id: z.string().optional(),
  organization_id: z.number(),
  parent_id: z.string().optional().nullable(),
  name: z.string().min(1, "Nome da pasta é obrigatório"),
  slug: z.string(),
  path: z.string(),
  description: z.string().optional().nullable(),
  color: z.string().default('#3B82F6'),
  icon: z.string().default('folder'),
  display_order: z.number().default(0),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ChecklistFolder = z.infer<typeof ChecklistFolderSchema>;

export interface ChecklistFolderWithCounts extends ChecklistFolder {
  subfolder_count: number;
  template_count: number;
  children?: (ChecklistFolderWithCounts | ChecklistTemplateInFolder)[];
}

export interface ChecklistTemplateInFolder {
  id: number;
  name: string;
  description?: string;
  category: string;
  folder_id?: string;
  is_public: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  field_count?: number;
}

export interface FolderTreeNode {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  path: string;
  color: string;
  icon: string;
  display_order: number;
  children: FolderTreeNode[];
}

export const CreateFolderSchema = z.object({
  name: z.string().min(1, "Nome da pasta é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  parent_id: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida").default('#3B82F6'),
  icon: z.string().min(1, "Ícone é obrigatório").default('folder'),
});

export type CreateFolder = z.infer<typeof CreateFolderSchema>;

export const UpdateFolderSchema = z.object({
  name: z.string().min(1, "Nome da pasta é obrigatório").max(100, "Nome muito longo").optional(),
  description: z.string().max(500, "Descrição muito longa").optional().nullable(),
  parent_id: z.string().optional().nullable(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Cor inválida").optional(),
  icon: z.string().min(1, "Ícone é obrigatório").optional(),
});

export type UpdateFolder = z.infer<typeof UpdateFolderSchema>;

export const MoveItemsSchema = z.object({
  templateIds: z.array(z.number()).default([]),
  folderIds: z.array(z.string()).default([]),
});

export type MoveItems = z.infer<typeof MoveItemsSchema>;

export const DeleteFolderStrategy = z.enum(['block', 'merge', 'cascade']);
export type DeleteFolderStrategy = z.infer<typeof DeleteFolderStrategy>;

export interface MigrationResult {
  success: boolean;
  organizations_migrated: number;
  templates_migrated: number;
  details: Array<{
    organization_id: number;
    templates_migrated: number;
  }>;
}

export interface FolderBreadcrumb {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// Ícones disponíveis para pastas
export const FOLDER_ICONS = [
  { value: 'folder', label: 'Pasta', icon: '📁' },
  { value: 'shield', label: 'Segurança', icon: '🛡️' },
  { value: 'hard-hat', label: 'Construção', icon: '⛑️' },
  { value: 'book-open', label: 'Manual', icon: '📖' },
  { value: 'settings', label: 'Configurações', icon: '⚙️' },
  { value: 'leaf', label: 'Meio Ambiente', icon: '🌿' },
  { value: 'award', label: 'Qualidade', icon: '🏆' },
  { value: 'cog', label: 'Operacional', icon: '⚙️' },
  { value: 'mountain', label: 'Industrial', icon: '🏭' },
  { value: 'shield-check', label: 'Auditoria', icon: '✅' },
  { value: 'user-check', label: 'Pessoal', icon: '👤' },
  { value: 'file-text', label: 'Documentos', icon: '📄' },
];

// Cores disponíveis para pastas
export const FOLDER_COLORS = [
  { value: '#3B82F6', label: 'Azul', hex: '#3B82F6' },
  { value: '#10B981', label: 'Verde', hex: '#10B981' },
  { value: '#F59E0B', label: 'Amarelo', hex: '#F59E0B' },
  { value: '#EF4444', label: 'Vermelho', hex: '#EF4444' },
  { value: '#8B5CF6', label: 'Roxo', hex: '#8B5CF6' },
  { value: '#06B6D4', label: 'Ciano', hex: '#06B6D4' },
  { value: '#84CC16', label: 'Lima', hex: '#84CC16' },
  { value: '#F97316', label: 'Laranja', hex: '#F97316' },
  { value: '#EC4899', label: 'Rosa', hex: '#EC4899' },
  { value: '#6B7280', label: 'Cinza', hex: '#6B7280' },
];
