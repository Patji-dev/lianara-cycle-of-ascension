$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskBundledModules = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$taskPreviousNodePath = $env:NODE_PATH
try {
    if (!(Test-Path (Join-Path $taskRoot 'node_modules\playwright')) -and (Test-Path (Join-Path $taskBundledModules 'playwright'))) {
        $env:NODE_PATH = $taskBundledModules
    }
    & node (Join-Path $taskRoot 'tools\build-realms.cjs') --check
    if ($LASTEXITCODE -ne 0) { throw 'Realm bundle is stale.' }
    & node (Join-Path $taskRoot 'tests\realms.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Realm tests failed.' }
    & node (Join-Path $taskRoot 'tests\browser.cjs')
    if ($LASTEXITCODE -ne 0) { throw 'Browser regression tests failed.' }
} finally {
    $env:NODE_PATH = $taskPreviousNodePath
}
