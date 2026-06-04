$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Set-Location -LiteralPath (Join-Path $root 'frontend')
& 'C:\Program Files\nodejs\npm.cmd' run dev -- --host 127.0.0.1 *>> (Join-Path $root 'vite-live.log')
