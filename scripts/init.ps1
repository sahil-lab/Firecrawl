$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LocalDirectory = Join-Path $ProjectRoot '.local'
$SecretPath = Join-Path $LocalDirectory 'db-password.txt'

if (Test-Path -LiteralPath $SecretPath) {
    if ((Get-Item -LiteralPath $SecretPath).Length -eq 0) {
        throw 'The existing local database credential is empty. Resolve it manually; it was not overwritten.'
    }
    Write-Host 'Existing local database credential preserved.'
    return
}

New-Item -ItemType Directory -Path $LocalDirectory -Force | Out-Null
$Bytes = New-Object byte[] 32
$Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $Generator.GetBytes($Bytes)
    $Encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($SecretPath, [Convert]::ToBase64String($Bytes), $Encoding)
}
finally {
    $Generator.Dispose()
    [Array]::Clear($Bytes, 0, $Bytes.Length)
}
Write-Host 'Local database credential generated. Its value is not logged.'
