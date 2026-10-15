param([switch]$ConcurrencyOnly)
$ErrorActionPreference = 'Stop'
$containerName = 'lion-f51-' + [guid]::NewGuid().ToString('N')
$previousUrl = $env:F51_POSTGRES_URL
$backendDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$created = $false
try {
    docker run --name $containerName -e POSTGRES_PASSWORD=lion_local_test -e POSTGRES_DB=lion_f51_test -p 127.0.0.1:55451:5432 -d postgres:16-alpine
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL isolado; verifique Docker e porta 55451.' }
    $created = $true
    $ready = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker exec $containerName pg_isready -U postgres -d lion_f51_test *> $null
        if ($LASTEXITCODE -eq 0) { $ready = $true; break }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) { throw 'PostgreSQL isolado indisponível.' }
    $env:F51_POSTGRES_URL = 'jdbc:postgresql://127.0.0.1:55451/lion_f51_test'
    Push-Location -LiteralPath $backendDirectory
    try {
        # Merge native stderr inside cmd so JVM warnings do not become terminating
        # PowerShell NativeCommandError records; Maven's exit code remains authoritative.
        if ($ConcurrencyOnly) { & $env:ComSpec /d /c '.\mvnw.cmd -Dtest=PaymentConcurrencyTest test 2>&1' }
        else { & $env:ComSpec /d /c '.\mvnw.cmd test 2>&1' }
        if ($LASTEXITCODE -ne 0) { throw 'Testes Maven falharam.' }
    } finally { Pop-Location }
} finally {
    $env:F51_POSTGRES_URL = $previousUrl
    # Removes only the uniquely named disposable container created by this run.
    if ($created) { docker rm -f $containerName | Out-Null }
}
