# Test Atomic Pathshala chat API integration
# Usage: .\scripts\test-chat-api.ps1

$baseUrl = "http://localhost:3000/api/chat"

function Test-Chat {
    param(
        [string]$Name,
        [string]$Language,
        [string]$Content
    )

    Write-Host "`n--- Testing: $Name ---" -ForegroundColor Cyan

    $body = @{
        language = $Language
        messages = @(
            @{ role = "user"; content = $Content }
        )
    } | ConvertTo-Json -Depth 5

    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -ContentType "application/json" -Body $body
        Write-Host "SUCCESS" -ForegroundColor Green
        Write-Host ($response.message.Substring(0, [Math]::Min(200, $response.message.Length)) + "...")
        return $true
    } catch {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd() | ConvertFrom-Json
        Write-Host "FAILED: $($errorBody.error)" -ForegroundColor Red
        return $false
    }
}

Write-Host "Atomic Pathshala API Integration Test" -ForegroundColor Yellow
Write-Host "Ensure dev server is running: npm run dev"

$results = @()
$results += Test-Chat -Name "English" -Language "english" -Content "What is photosynthesis? Answer in 2 sentences."
$results += Test-Chat -Name "Hindi" -Language "hindi" -Content "गुरुत्वाकर्षण क्या है? दो वाक्य में बताइए।"
$results += Test-Chat -Name "Hinglish" -Language "hinglish" -Content "Newton's first law kya hai? Simple mein batao."

$passed = ($results | Where-Object { $_ -eq $true }).Count
Write-Host "`nResults: $passed / $($results.Count) passed" -ForegroundColor $(if ($passed -eq $results.Count) { "Green" } else { "Yellow" })
