$ErrorActionPreference = 'Stop'
try {
    if (Get-Process -Name Revit -ErrorAction SilentlyContinue) { throw 'Close all Revit windows, then run this installer again.' }
    $packageRoot = [IO.Path]::GetFullPath($PSScriptRoot)
    $source = Join-Path $packageRoot 'ByGeorge.extension'
    if (-not (Test-Path -LiteralPath (Join-Path $source 'lib\bygeorge_license.py'))) { throw 'Extract the complete ZIP before installing.' }
    $extensionsRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'pyRevit\Extensions'))
    $target = [IO.Path]::GetFullPath((Join-Path $extensionsRoot 'ByGeorge.extension'))
    if ($target -ne (Join-Path $extensionsRoot 'ByGeorge.extension')) { throw 'Unexpected install path.' }
    New-Item -ItemType Directory -Path $extensionsRoot -Force | Out-Null
    $backup = $null
    if (Test-Path -LiteralPath $target) {
        $backupRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'ByGeorge\Backups'))
        New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
        $backup = [IO.Path]::GetFullPath((Join-Path $backupRoot ('ByGeorge-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))))
        if (-not $backup.StartsWith($backupRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected backup path.' }
        Move-Item -LiteralPath $target -Destination $backup
    }
    try { Copy-Item -LiteralPath $source -Destination $target -Recurse }
    catch {
        # Preserve partial files for inspection and restore the previous installation.
        if (Test-Path -LiteralPath $target) {
            $failedRoot = [IO.Path]::GetFullPath((Join-Path $env:APPDATA 'ByGeorge\FailedInstalls'))
            New-Item -ItemType Directory -Path $failedRoot -Force | Out-Null
            $failedTarget = [IO.Path]::GetFullPath((Join-Path $failedRoot (Get-Date -Format 'yyyyMMdd-HHmmss-fff')))
            if (-not $failedTarget.StartsWith($failedRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unexpected recovery path.' }
            Move-Item -LiteralPath $target -Destination $failedTarget
        }
        if ($backup) { Move-Item -LiteralPath $backup -Destination $target }
        throw
    }
    Write-Host 'ByGeorge installed. Open Revit, reload pyRevit, and click a purchased tool to enter your key.'
    if ($backup) { Write-Host ('Your previous extension was saved to: ' + $backup) }
} catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Read-Host 'Press Enter to close'
