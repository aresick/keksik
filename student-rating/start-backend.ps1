$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$env:DOTNET_CLI_HOME = Join-Path $root '.dotnet_home'
$env:DOTNET_ROOT = Join-Path $root '.dotnet'
$env:NUGET_PACKAGES = Join-Path $root '.nuget\packages'
$env:APPDATA = Join-Path $root '.appdata'
$env:LOCALAPPDATA = Join-Path $root '.localappdata'
$env:USERPROFILE = $root

Set-Location -LiteralPath (Join-Path $root 'backend\CollegeRating')
& (Join-Path $root '.dotnet\dotnet.exe') run --launch-profile http *>> (Join-Path $root 'backend-live.log')
