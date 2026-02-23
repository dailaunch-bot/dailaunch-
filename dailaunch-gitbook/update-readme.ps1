# ============================================================
# DaiLaunch — Update README + Push ke GitHub
# Jalankan file ini di PowerShell:
#   .\update-readme.ps1
# ============================================================

$repo = "C:\Users\admin\Downloads\dailaunch-"

Write-Host "⚡ DaiLaunch — Update README" -ForegroundColor Cyan
Write-Host ""

# Cek folder repo ada
if (-not (Test-Path $repo)) {
    Write-Host "❌ Folder repo tidak ditemukan: $repo" -ForegroundColor Red
    exit 1
}

# Copy README baru dari Downloads (hasil download dari Claude)
$readmeSrc = "$env:USERPROFILE\Downloads\README.md"
if (-not (Test-Path $readmeSrc)) {
    Write-Host "❌ File README.md tidak ditemukan di Downloads." -ForegroundColor Red
    Write-Host "   Download dulu file README.md dari Claude, simpan ke Downloads." -ForegroundColor Yellow
    exit 1
}

Copy-Item $readmeSrc "$repo\README.md" -Force
Write-Host "✅ README.md berhasil dicopy!" -ForegroundColor Green

# Masuk ke folder repo dan push
Set-Location $repo

git add README.md
git status

Write-Host ""
$msg = "docs: update README to English, remove env/api/testnet/railway sections"
git commit -m $msg

if ($LASTEXITCODE -eq 0) {
    git push
    Write-Host ""
    Write-Host "🚀 README berhasil di-push ke GitHub!" -ForegroundColor Green
    Write-Host "   Railway akan re-deploy otomatis dalam 1-2 menit." -ForegroundColor Gray
} else {
    Write-Host "⚠️  Tidak ada perubahan untuk di-commit." -ForegroundColor Yellow
}
