$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectPath

if ($env:OS -ne 'Windows_NT' -or $env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
    throw 'Prepare this archive on a Windows x64 machine with Internet access.'
}
if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
    throw 'tar.exe is required to create the offline archive.'
}

Write-Host 'Installing dependencies on this connected machine...'
& npm.cmd ci --legacy-peer-deps --no-audit --no-fund --fetch-retries=0 --fetch-timeout=15000
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed. No archive was created.' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed. No archive was created.' }

# Explicit allowlist: do not include .env, credentials, logs or npm configuration.
$bundleFiles = @(
    'node_modules', 'dist', 'src', 'public', 'server', 'scripts', 'api',
    'package.json', 'package-lock.json', 'index.html', 'vite.config.ts',
    'vitest.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
    'tailwind.config.ts', 'postcss.config.js', 'components.json',
    'eslint.config.js', 'vercel.json', '.env.example', '.gitignore', 'README.md'
)
$archivePath = Join-Path $projectPath 'tiffy-windows-x64.offline.zip'
& tar.exe -a -c -f $archivePath @bundleFiles
if ($LASTEXITCODE -ne 0) { throw 'Archive creation failed.' }
Write-Host "Offline archive ready: $archivePath"
Write-Host 'Transfer it to the Windows x64 server and extract it into the project directory.'
Write-Host 'The archive does not contain .env. Keep the server .env, then run npm run dev.'
