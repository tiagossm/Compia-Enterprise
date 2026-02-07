/**
 * Conversor Universal de Arquivos para CSV COMPIA
 * Suporta: PDF, Excel, Word, CSV, e futuramente OCR
 */

import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Formato CSV esperado pelo COMPIA
export interface CompiaCSVField {
  campo: string;
  tipo: string;
  obrigatorio: boolean;
  opcoes?: string;
}

// Tipos de campo suportados
export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  SELECT: 'select',
  BOOLEAN: 'boolean',
  DATE: 'date',
  TIME: 'time',
  NUMBER: 'number',
  RATING: 'rating',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  MULTISELECT: 'multiselect',
  FILE: 'file'
} as const;

/**
 * Converte qualquer arquivo suportado para CSV no formato COMPIA
 */
export async function convertFileToCSV(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  console.log(`[FILE-CONVERTER] Converting ${file.name} (${extension})`);

  try {
    switch (extension) {
      case 'pdf':
        return await convertPdfToCSV(file);
      case 'xlsx':
      case 'xls':
        return await convertExcelToCSV(file);
      case 'docx':
        return await convertWordToCSV(file);
      case 'doc':
        throw new Error('Formato .doc antigo não suportado. Use .docx ou converta o arquivo.');
      case 'csv':
        return await normalizeCSV(file);
      default:
        throw new Error(`Formato .${extension} não suportado. Formatos aceitos: PDF, Excel (.xlsx), Word (.docx), CSV`);
    }
  } catch (error) {
    console.error('[FILE-CONVERTER] Error:', error);
    throw error;
  }
}

/**
 * Converte PDF para CSV usando IA para normalização
 */
async function convertPdfToCSV(file: File): Promise<string> {
  console.log('[PDF] Extracting text...');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }

  console.log('[PDF] Extracted text length:', fullText.length);

  // Retorna texto para ser processado pela IA
  // A IA irá converter para formato de checklist
  return fullText;
}

/**
 * Converte Excel para CSV COMPIA
 * Detecta automaticamente estrutura: perguntas em linhas ou colunas
 */
async function convertExcelToCSV(file: File): Promise<string> {
  console.log('[EXCEL] Reading workbook...');

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Pega primeira aba
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Converte para array de arrays
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  console.log('[EXCEL] Rows:', rawData.length);
  console.log('[EXCEL] First 3 rows:', rawData.slice(0, 3));

  // Detectar estrutura
  const structure = detectExcelStructure(rawData);
  console.log('[EXCEL] Detected structure:', structure);

  // Normalizar para formato COMPIA
  const fields = normalizeExcelData(rawData, structure);

  // Gerar CSV
  return generateCompiaCSV(fields);
}

/**
 * Detecta estrutura do Excel
 */
function detectExcelStructure(data: any[][]): 'questions-in-rows' | 'questions-in-columns' | 'already-formatted' {
  if (data.length === 0) return 'questions-in-rows';

  const firstRow = data[0];

  // Verifica se já está no formato COMPIA (campo, tipo, obrigatorio, opcoes)
  const hasCompiaHeaders = firstRow.some((cell: any) =>
    typeof cell === 'string' && ['campo', 'tipo', 'obrigatorio', 'opcoes'].includes(cell.toLowerCase())
  );

  if (hasCompiaHeaders) {
    return 'already-formatted';
  }

  // Verifica se primeira linha parece cabeçalho
  const firstRowIsHeader = firstRow.every((cell: any) =>
    typeof cell === 'string' && cell.length > 0 && cell.length < 100
  );

  // Se primeira linha é cabeçalho e tem mais de 3 colunas, provavelmente perguntas em colunas
  if (firstRowIsHeader && firstRow.length > 3) {
    return 'questions-in-columns';
  }

  // Default: perguntas em linhas (formato mais comum)
  return 'questions-in-rows';
}

/**
 * Normaliza dados do Excel para formato COMPIA
 */
function normalizeExcelData(data: any[][], structure: string): CompiaCSVField[] {
  const fields: CompiaCSVField[] = [];

  if (structure === 'already-formatted') {
    // Já está no formato correto, apenas parse
    const headers = data[0].map((h: any) => String(h).toLowerCase().trim());
    const campoIndex = headers.indexOf('campo');
    const tipoIndex = headers.indexOf('tipo');
    const obrigatorioIndex = headers.indexOf('obrigatorio');
    const opcoesIndex = headers.indexOf('opcoes');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[campoIndex]) continue;

      fields.push({
        campo: String(row[campoIndex]).trim(),
        tipo: String(row[tipoIndex] || 'text').trim(),
        obrigatorio: String(row[obrigatorioIndex]).toLowerCase() === 'true',
        opcoes: row[opcoesIndex] ? String(row[opcoesIndex]).trim() : undefined
      });
    }
  } else if (structure === 'questions-in-columns') {
    // Primeira linha = perguntas, demais = dados
    const questions = data[0];
    for (let i = 0; i < questions.length; i++) {
      const question = String(questions[i]).trim();
      if (!question) continue;

      fields.push({
        campo: question,
        tipo: inferFieldType(question, data.slice(1).map(row => row[i])),
        obrigatorio: true,
        opcoes: undefined
      });
    }
  } else {
    // questions-in-rows: Primeira coluna = perguntas
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;

      const question = String(row[0]).trim();

      // Pular linhas que parecem cabeçalhos ou vazias
      if (question.toLowerCase().includes('pergunta') ||
        question.toLowerCase().includes('questão') ||
        question.toLowerCase().includes('campo')) {
        continue;
      }

      fields.push({
        campo: question,
        tipo: inferFieldType(question, row.slice(1)),
        obrigatorio: true,
        opcoes: undefined
      });
    }
  }

  return fields;
}

/**
 * Infere tipo de campo baseado na pergunta e dados
 */
function inferFieldType(question: string, sampleData: any[]): string {
  const q = question.toLowerCase();

  // Regex patterns
  if (q.match(/data|dt\.|date/)) return FIELD_TYPES.DATE;
  if (q.match(/hora|horário|time/)) return FIELD_TYPES.TIME;
  if (q.match(/\b(sim|não|s\/n|yes|no)\b|conforme|ok|nok/)) return FIELD_TYPES.BOOLEAN;
  if (q.match(/nota|avaliação|rating|estrela/)) return FIELD_TYPES.RATING;
  if (q.match(/número|quantidade|qtd|peso|altura|medida/)) return FIELD_TYPES.NUMBER;
  if (q.match(/foto|imagem|arquivo|anexo/)) return FIELD_TYPES.FILE;
  if (q.match(/observ|comentário|descrição|detalhes/)) return FIELD_TYPES.TEXTAREA;

  // Analisa dados de amostra
  const validSamples = sampleData.filter(d => d !== null && d !== undefined && d !== '');
  if (validSamples.length > 0) {
    const uniqueValues = [...new Set(validSamples.map(v => String(v)))];

    // Se tem 2-10 valores únicos, provavelmente é select
    if (uniqueValues.length >= 2 && uniqueValues.length <= 10) {
      return FIELD_TYPES.SELECT;
    }
  }

  // Default
  return FIELD_TYPES.TEXT;
}

/**
 * Converte Word para CSV
 */
async function convertWordToCSV(file: File): Promise<string> {
  console.log('[WORD] Extracting text...');

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  console.log('[WORD] Extracted text length:', text.length);

  // Retorna texto para ser processado pela IA
  return text;
}

/**
 * Normaliza CSV existente para formato COMPIA
 */
async function normalizeCSV(file: File): Promise<string> {
  const text = await file.text();
  const lines = text.trim().split('\n');

  if (lines.length === 0) {
    throw new Error('Arquivo CSV vazio');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

  // Verifica se já está no formato correto
  const hasRequiredColumns = headers.includes('campo') && headers.includes('tipo');

  if (hasRequiredColumns) {
    console.log('[CSV] Already in COMPIA format');
    return text;
  }

  // Se não está, tenta converter
  console.log('[CSV] Converting to COMPIA format...');

  // Assume primeira coluna = perguntas
  const fields: CompiaCSVField[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (!values[0]) continue;

    fields.push({
      campo: values[0],
      tipo: FIELD_TYPES.TEXT,
      obrigatorio: true,
      opcoes: undefined
    });
  }

  return generateCompiaCSV(fields);
}

/**
 * Gera CSV no formato COMPIA
 */
function generateCompiaCSV(fields: CompiaCSVField[]): string {
  if (fields.length === 0) {
    throw new Error('Nenhum campo foi detectado no arquivo');
  }

  const lines = ['campo,tipo,obrigatorio,opcoes'];

  for (const field of fields) {
    const line = [
      field.campo,
      field.tipo,
      field.obrigatorio.toString(),
      field.opcoes || ''
    ].join(',');

    lines.push(line);
  }

  console.log('[CSV-GENERATOR] Generated', fields.length, 'fields');

  return lines.join('\n');
}

/**
 * Valida se CSV está no formato correto
 */
export function validateCompiaCSV(csv: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lines = csv.trim().split('\n');

  if (lines.length < 2) {
    errors.push('CSV deve ter pelo menos um cabeçalho e uma linha de dados');
    return { valid: false, errors };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  if (!headers.includes('campo')) {
    errors.push('Coluna "campo" é obrigatória');
  }

  if (!headers.includes('tipo')) {
    errors.push('Coluna "tipo" é obrigatória');
  }

  // Valida tipos
  const validTypes = Object.values(FIELD_TYPES);
  const tipoIndex = headers.indexOf('tipo');

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const tipo = values[tipoIndex];

    if (tipo && !validTypes.includes(tipo as any)) {
      errors.push(`Linha ${i + 1}: Tipo "${tipo}" não é válido. Tipos válidos: ${validTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
