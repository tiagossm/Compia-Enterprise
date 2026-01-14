/**
 * Chronos Date Utilities
 * 
 * Utilitários para manipulação segura de datas seguindo a Lei 1 (UTC-First).
 * Todas as datas devem ser armazenadas em UTC no banco de dados.
 * O frontend exibe em horário local, mas envia/recebe em ISO UTC.
 */

/**
 * Obtém o timezone do navegador do usuário
 * @returns Timezone string (ex: "America/Sao_Paulo")
 */
export function getUserTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converte uma string datetime-local (do input HTML) para ISO UTC
 * Input: "2026-01-09T15:00" (horário local)
 * Output: "2026-01-09T18:00:00.000Z" (UTC, se BRT-3)
 * 
 * @param localDateTimeString - String no formato "YYYY-MM-DDTHH:mm"
 * @returns String ISO com timezone UTC (Z)
 */
export function localToUTC(localDateTimeString: string): string {
    if (!localDateTimeString) return '';

    // O input datetime-local é interpretado como horário local do navegador
    const localDate = new Date(localDateTimeString);

    // toISOString() sempre retorna em UTC
    return localDate.toISOString();
}

/**
 * Converte uma string ISO UTC para formato datetime-local
 * Input: "2026-01-09T18:00:00.000Z" (UTC)
 * Output: "2026-01-09T15:00" (horário local, se BRT-3)
 * 
 * @param utcIsoString - String ISO com timezone Z ou offset
 * @returns String no formato "YYYY-MM-DDTHH:mm" para uso em inputs
 */
export function utcToLocal(utcIsoString: string): string {
    if (!utcIsoString) return '';

    const date = new Date(utcIsoString);

    // Formatar para datetime-local (sem timezone, interpretado como local)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Verifica se end_time é maior que start_time
 * @param startTime - String datetime
 * @param endTime - String datetime
 * @returns true se válido, false se inválido
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
    if (!startTime || !endTime) return false;
    return new Date(endTime) > new Date(startTime);
}

/**
 * Calcula a duração em minutos entre dois horários
 * @param startTime - String datetime
 * @param endTime - String datetime
 * @returns Duração em minutos
 */
export function getDurationMinutes(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Verifica se a duração mínima é respeitada (15 minutos por padrão)
 * @param startTime - String datetime
 * @param endTime - String datetime
 * @param minMinutes - Duração mínima em minutos (default: 15)
 * @returns true se duração é suficiente
 */
export function hasMinimumDuration(startTime: string, endTime: string, minMinutes = 15): boolean {
    return getDurationMinutes(startTime, endTime) >= minMinutes;
}

/**
 * Formata uma data ISO para exibição amigável
 * @param isoString - String ISO
 * @param options - Opções de formatação
 * @returns String formatada (ex: "09/01/2026 às 15:00")
 */
export function formatDateBR(isoString: string, options?: { includeTime?: boolean }): string {
    if (!isoString) return '';

    const date = new Date(isoString);
    const dateStr = date.toLocaleDateString('pt-BR');

    if (options?.includeTime) {
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} às ${timeStr}`;
    }

    return dateStr;
}

/**
 * Verifica se uma data está no horário comercial (8h-18h)
 * @param isoString - String ISO
 * @returns true se está no horário comercial
 */
export function isBusinessHours(isoString: string): boolean {
    const date = new Date(isoString);
    const hours = date.getHours();
    return hours >= 8 && hours < 18;
}

/**
 * Verifica se uma data é um dia útil (seg-sex)
 * @param isoString - String ISO
 * @returns true se é dia útil
 */
export function isWeekday(isoString: string): boolean {
    const date = new Date(isoString);
    const day = date.getDay();
    return day >= 1 && day <= 5;
}
