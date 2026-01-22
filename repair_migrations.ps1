$files = Get-ChildItem "supabase/migrations" | Where-Object { $_.Name -match "^\d{2}_" } | Sort-Object Name

# Timestamp base: 2026-01-22 00:00:00
$baseDate = Get-Date -Year 2026 -Month 1 -Day 22 -Hour 0 -Minute 0 -Second 0

$repairVersions = @()

foreach ($file in $files) {
    # Extrair prefixo (ex: 40)
    if ($file.Name -match "^(\d{2})_(.+)$") {
        $prefix = $matches[1]
        $rest = $matches[2]
        
        # Criar novo timestamp (adicionar segundos baseados no prefixo para manter ordem)
        # Ex: 40 -> 20260122000040
        $newTimestamp = "202601220000$prefix"
        $newName = "${newTimestamp}_${rest}"
        
        # Renomear
        Rename-Item -Path $file.FullName -NewName $newName
        Write-Host "Renamed: $($file.Name) -> $newName"
        
        # Adicionar à lista de reparo
        $repairVersions += $newTimestamp
    }
}

# Gerar comando de repair único
if ($repairVersions.Count -gt 0) {
    $versionsString = $repairVersions -join " "
    Write-Host "`nRepairing migration history..."
    # Executa o repair
    npx supabase migration repair --status applied $versionsString
}
else {
    Write-Host "No files to rename."
}
