$files = Get-ChildItem "supabase/migrations" -Filter "*.sql" | Sort-Object Name

# Arquivo que NÃO deve ser marcado como applied (porque queremos que ele rode)
$newMigration = "create_financial_schema"

foreach ($file in $files) {
    if ($file.Name -match "^(\d{14})_") {
        $timestamp = $matches[1]
        
        # Pular a migração financeira nova
        if ($file.Name -match $newMigration) {
            Write-Host "Skipping new migration: $($file.Name)"
            continue
        }
        
        Write-Host "Marking as applied: $timestamp ($($file.Name))"
        # Executa repair silenciosamente
        $output = npx supabase migration repair --status applied $timestamp 2>&1
    }
}

Write-Host "`nSync complete. Now try 'npx supabase db push'"
