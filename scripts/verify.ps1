$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ComposeFile = Join-Path (Join-Path (Join-Path $ProjectRoot 'infra') 'docker') 'compose.yaml'

function Invoke-Compose {
    # Preserve native flags such as psql -A instead of binding PowerShell parameters.
    & docker compose --project-name firecrawl --file $ComposeFile @args
    if ($LASTEXITCODE -ne 0) {
        throw "Firecrawl Compose command failed with exit code $LASTEXITCODE."
    }
}

& docker info --format 'Docker engine ready: {{.OSType}}'
if ($LASTEXITCODE -ne 0) {
    throw 'Docker must be running Linux containers before verification.'
}

& (Join-Path $PSScriptRoot 'init.ps1')
if (-not $?) {
    throw 'Local configuration initialization failed.'
}

Invoke-Compose --profile tools run --rm --no-deps node npm ci --no-audit --no-fund
Invoke-Compose --profile tools run --rm --no-deps node npm run format:check
Invoke-Compose --profile tools run --rm --no-deps maven
Invoke-Compose --profile tools run --rm --no-deps node npm run lint
Invoke-Compose --profile tools run --rm --no-deps node npm test
Invoke-Compose --profile tools run --rm --no-deps node npm run build
Invoke-Compose build api
Invoke-Compose build web
Invoke-Compose up --detach --wait --wait-timeout 240 db api web
Invoke-Compose --profile tools run --rm --no-deps --env BASE_URL=http://web:8080 node npm run smoke

Invoke-Compose stop db
try {
    Invoke-Compose --profile tools run --rm --no-deps --env BASE_URL=http://web:8080 node npm run smoke:db-down
}
finally {
    Invoke-Compose up --detach --wait --wait-timeout 120 db api web
}

$MigrationCount = Invoke-Compose exec -T db psql -U firecrawl -d firecrawl -t -A -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM flyway_schema_history WHERE version = '1' AND success;"
if (($MigrationCount -join '').Trim() -ne '1') {
    throw 'Expected exactly one successful Flyway V1 migration.'
}
Invoke-Compose restart api
Invoke-Compose up --detach --wait --wait-timeout 120 --no-deps api
$MigrationCount = Invoke-Compose exec -T db psql -U firecrawl -d firecrawl -t -A -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM flyway_schema_history WHERE version = '1' AND success;"
if (($MigrationCount -join '').Trim() -ne '1') {
    throw 'Flyway migration history changed unexpectedly after API restart.'
}

$HostResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:18101/api/actuator/health/readiness' -Headers @{ Accept = 'application/json' } -TimeoutSec 15
if ($HostResponse.StatusCode -ne 200 -or ($HostResponse.Content | ConvertFrom-Json).status -ne 'UP') {
    throw 'The published loopback endpoint is not ready.'
}

Invoke-Compose ps
Write-Host 'Firecrawl verification passed. Local dashboard: http://localhost:18101'
