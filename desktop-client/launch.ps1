$dir = $PSScriptRoot
if (-not $dir) { $dir = "d:\PROJECTS_IO\delugeRPG\desktop-client" }

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "C:\Users\User\AppData\Roaming\npm\node_modules\electron\dist\electron.exe"
$psi.Arguments = "."
$psi.WorkingDirectory = $dir
$psi.UseShellExecute = $false
$psi.EnvironmentVariables.Remove("ELECTRON_RUN_AS_NODE")
$proc = [System.Diagnostics.Process]::Start($psi)
Write-Output "Client launched with PID: $($proc.Id)"

