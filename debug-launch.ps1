# Debug script to check why the app isn't launching
Write-Host "=== Electrobun App Debug ===" -ForegroundColor Green

# Check if the app process is running
$process = Get-Process | Where-Object { $_.ProcessName -like "*svelte*" -or $_.ProcessName -like "*bun*" }
if ($process) {
    Write-Host "Found running processes:" -ForegroundColor Yellow
    $process | Format-Table ProcessName, Id, CPU, WorkingSet
} else {
    Write-Host "No svelte-app or bun processes found running" -ForegroundColor Red
}

# Check the app directory
$appPath = "$env:LOCALAPPDATA\svelteapp.electrobun.dev\stable\app"
Write-Host "`nApp directory: $appPath" -ForegroundColor Cyan
if (Test-Path $appPath) {
    Write-Host "✅ App directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ App directory not found" -ForegroundColor Red
    exit
}

# Check main files
$filesToCheck = @(
    "bin\launcher.exe",
    "bin\bun.exe", 
    "Resources\main.js",
    "Resources\app\bun\index.js",
    "Resources\app\views\mainview\index.html"
)

Write-Host "`nChecking critical files:" -ForegroundColor Cyan
foreach ($file in $filesToCheck) {
    $fullPath = Join-Path $appPath $file
    if (Test-Path $fullPath) {
        $size = (Get-Item $fullPath).Length
        Write-Host "✅ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (MISSING)" -ForegroundColor Red
    }
}

# Try to launch manually and capture output
Write-Host "`nAttempting manual launch..." -ForegroundColor Cyan
try {
    $launcherPath = Join-Path $appPath "bin\launcher.exe"
    Write-Host "Running: $launcherPath" -ForegroundColor Yellow
    
    # Start process and capture output
    $process = Start-Process -FilePath $launcherPath -WorkingDirectory (Join-Path $appPath "bin") -PassThru -NoNewWindow -Wait -RedirectStandardOutput "debug-output.txt" -RedirectStandardError "debug-error.txt"
    
    Write-Host "Process exited with code: $($process.ExitCode)" -ForegroundColor Yellow
    
    if (Test-Path "debug-output.txt") {
        Write-Host "`n--- STDOUT ---" -ForegroundColor Cyan
        Get-Content "debug-output.txt"
    }
    
    if (Test-Path "debug-error.txt") {
        Write-Host "`n--- STDERR ---" -ForegroundColor Red
        Get-Content "debug-error.txt"
    }
    
} catch {
    Write-Host "❌ Failed to launch: $_" -ForegroundColor Red
}

Write-Host "`n=== Debug Complete ===" -ForegroundColor Green
