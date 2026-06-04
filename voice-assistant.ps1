#Requires -Version 5.0
<#
.SYNOPSIS
  JAM POS Voice Assistant - Interfaz de voz bidireccional
.DESCRIPTION
  Te permite hablar con OpenCode usando voz.
  - Salida: Voz femenina en espanol (Microsoft Sabina)
  - Entrada: Dictado nativo de Windows (Win+H) o escritura manual
.EXAMPLE
  .\voice-assistant.ps1
#>

Add-Type -AssemblyName System.Speech

# ==================== CONFIG ====================
$voiceDir = Join-Path $PSScriptRoot "voice"
$sttExe   = Join-Path $voiceDir "listen.exe"
$synth    = New-Object System.Speech.Synthesis.SpeechSynthesizer

try {
    $synth.SelectVoice("Microsoft Sabina Desktop")
} catch {
    $synth.SelectVoice("Microsoft Zira Desktop")
}
$synth.Volume = 100
$synth.Rate = 0

# ==================== SALIDA DE VOZ ====================
function Speak-Text {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return }
    $short = ($Text -replace '<[^>]+>', '') -split "`n" | Where-Object { $_ -and $_.Length -gt 10 -and $_ -notmatch '^\s*(```|#|\/\/|<!--)' }
    $toSay = ($short -join '. ').Trim()
    if ($toSay.Length -gt 600) { $toSay = $toSay.Substring(0, 597) + "..." }
    if ($toSay) {
        Write-Host "[VOZ] $toSay" -ForegroundColor Cyan
        $synth.SpeakAsync($toSay) | Out-Null
    }
}

function Speak-TextSync {
    param([string]$Text)
    if ([string]::IsNullOrWhiteSpace($Text)) { return }
    $clean = $Text -replace '<[^>]+>', ''
    Write-Host "[VOZ] $clean" -ForegroundColor Cyan
    $synth.Speak($clean)
}

# ==================== ENTRADA DE VOZ ====================
function Get-VoiceInput {
    if (Test-Path $sttExe) {
        try {
            Write-Host "[MIC] Dictado de Windows (habla y haz clic en Listo)..." -ForegroundColor Yellow
            $result = & $sttExe 2>$null
            if (-not [string]::IsNullOrWhiteSpace($result)) {
                Write-Host "[TEXTO] $result" -ForegroundColor Green
                return $result.Trim()
            }
        } catch { }
    }

    Write-Host "" -ForegroundColor Yellow
    Write-Host "+----------------------------------------------+" -ForegroundColor Yellow
    Write-Host "|  Presiona WIN+H y habla (dictado nativo)     |" -ForegroundColor Yellow
    Write-Host "|  Cuando termines, escribe OK o pulsa ENTER   |" -ForegroundColor Yellow
    Write-Host "+----------------------------------------------+" -ForegroundColor Yellow
    Start-Sleep -Milliseconds 500

    try {
        $wshell = New-Object -ComObject wscript.shell
        $wshell.SendKeys('^{H}')
    } catch { }

    $input = Read-Host ">> Tu comando"
    return $input
}

# ==================== CICLO PRINCIPAL ====================
function Start-VoiceAssistant {
    Clear-Host
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Write-Host "|   JAM POS Voice Assistant                   |" -ForegroundColor Cyan
    Write-Host "|   Escucha: Win+H dictado nativo             |" -ForegroundColor Cyan
    Write-Host "|   Habla:   TTS espanol                      |" -ForegroundColor Cyan
    Write-Host "+---------------------------------------------+" -ForegroundColor Cyan
    Speak-TextSync("Hola, asistente de voz listo. Presiona Enter y habla para darme instrucciones.")

    do {
        Write-Host ""
        Write-Host "--- Enter para hablar (o 'salir' para terminar) ---" -ForegroundColor DarkGray
        $null = Read-Host "Presiona Enter"

        $query = Get-VoiceInput
        if ($query -eq 'salir' -or $query -eq 'exit') { break }
        if ([string]::IsNullOrWhiteSpace($query)) { continue }

        Write-Host ""
        Write-Host "+---------------------------------------------+" -ForegroundColor Green
        Write-Host "|  Tu comando (copia y pega en OpenCode):      |" -ForegroundColor Green
        Write-Host "+---------------------------------------------+" -ForegroundColor Green
        Write-Host "|  $query" -ForegroundColor White
        Write-Host "+---------------------------------------------+" -ForegroundColor Green

        Speak-Text "He entendido tu comando. Copialo desde la terminal y pegarlo en OpenCode."

    } while ($true)

    $synth.Dispose()
    Speak-TextSync("Asistente de voz detenido")
}

Start-VoiceAssistant
