$API_URL = "http://localhost:8787/api/checklist"
$USER_ID = "01990d69-5246-733d-8605-1ed319a3f98d"
$Headers = @{
    "Content-Type" = "application/json"
    "x-demo-auth" = "true"
    "x-demo-user-id" = $USER_ID
}

Write-Host "1. Creating a test template..."
$TemplateBody = @{
    name = "Test CSV Import Template"
    category = "Test"
    is_public = $false
} | ConvertTo-Json

try {
    $TemplateResponse = Invoke-RestMethod -Uri "$API_URL/checklist-templates" -Method Post -Headers $Headers -Body $TemplateBody
    Write-Host "Response: $($TemplateResponse | ConvertTo-Json -Depth 2)"
    $TemplateId = $TemplateResponse.id
} catch {
    Write-Error "Failed to create template: $_"
    exit 1
}

if (-not $TemplateId) {
    Write-Error "Failed to get template ID"
    exit 1
}

Write-Host "Created template with ID: $TemplateId"

Write-Host "2. Creating a field for the template..."
$FieldBody = @{
    template_id = $TemplateId
    field_name = "Test Field"
    field_type = "text"
    is_required = $true
    order_index = 0
} | ConvertTo-Json

try {
    $FieldResponse = Invoke-RestMethod -Uri "$API_URL/checklist-fields" -Method Post -Headers $Headers -Body $FieldBody
    Write-Host "Response: $($FieldResponse | ConvertTo-Json -Depth 2)"
    $FieldId = $FieldResponse.id
} catch {
    Write-Error "Failed to create field: $_"
    exit 1
}

if (-not $FieldId) {
    Write-Error "Failed to get field ID"
    exit 1
}

Write-Host "Created field with ID: $FieldId"

Write-Host "3. Verifying field existence..."
try {
    $TemplateDetails = Invoke-RestMethod -Uri "$API_URL/checklist-templates/$TemplateId" -Method Get -Headers $Headers
    Write-Host "Template Details: $($TemplateDetails | ConvertTo-Json -Depth 3)"
    
    $FieldFound = $false
    foreach ($field in $TemplateDetails.fields) {
        if ($field.field_name -eq "Test Field") {
            $FieldFound = $true
            break
        }
    }

    if ($FieldFound) {
        Write-Host "SUCCESS: Field 'Test Field' found in template details."
    } else {
        Write-Error "FAILURE: Field 'Test Field' NOT found in template details."
        exit 1
    }
} catch {
    Write-Error "Failed to get template details: $_"
    exit 1
}

Write-Host "Cleaning up..."
try {
    Invoke-RestMethod -Uri "$API_URL/checklist-templates/$TemplateId" -Method Delete -Headers $Headers
    Write-Host "Cleanup complete."
} catch {
    Write-Warning "Failed to cleanup template: $_"
}
