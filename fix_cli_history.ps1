# Lista de migrações legadas de 2025 que estão no remoto mas não existem localmente
$legacyVersions = @(
    "20251207135242",
    "20251207135339",
    "20251207135405",
    "20251208005341",
    "20251208023817",
    "20251208025946",
    "20251208145637",
    "20251208170607",
    "20251208171651",
    "20251208185604",
    "20251208185811",
    "20251208190158",
    "20251208190410",
    "20251208190811",
    "20251209200544",
    "20251210140406",
    "20251213155303",
    "20251214024011",
    "20251214024138",
    "20251214041736",
    "20251214043219",
    "20251215192719",
    "20251215201415",
    "20251216095551",
    "20251216202917",
    "20251221214954",
    "20251222011711",
    "20251222014651",
    "20251222021606",
    "20260102180347",
    "20260104003424",
    "20260104003931",
    "20260104010525",
    "20260104130704",
    "20260107032725",
    "20260108140022",
    "20260108211651",
    "20260109175149",
    "20260111194420",
    "20260112130537",
    "20260113140629",
    "20260113140632",
    "20260113142308",
    "20260121191336"
)

Write-Host "Revertendo $($legacyVersions.Count) migracoes legadas..." -ForegroundColor Yellow

foreach ($version in $legacyVersions) {
    Write-Host "  Reverting: $version"
    $output = npx supabase migration repair --status reverted $version 2>&1
}

Write-Host "`nLimpeza concluida!" -ForegroundColor Green
Write-Host "Agora rode: npx supabase db push" -ForegroundColor Cyan
