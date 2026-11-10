$ErrorActionPreference = "Stop"

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
Set-Location $projectRoot

$envFile = Join-Path $projectRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $value = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Loaded .env into process."
} else {
    Write-Warning ".env file not found at $envFile"
}

$env:Path = "C:\tools\apache-maven-3.9.16\bin;" + $env:Path

$jarPath = "backend/target/itsm-backend-0.1.0-SNAPSHOT.jar"
if (-not (Test-Path $jarPath)) {
    Write-Host "Packaging project with Maven..."
    mvn -DskipTests package
    if ($LASTEXITCODE -ne 0) {
        throw "Maven package failed with exit code $LASTEXITCODE"
    }
} else {
    Write-Host "Found existing jar at $jarPath, proceeding to start."
}
if (-not (Test-Path $jarPath)) {
    throw "Jar file not found at $jarPath"
}

Write-Host "Starting backend server on port 8080..."
java -jar $jarPath

