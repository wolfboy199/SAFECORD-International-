param(
  [string]$RepoUrl = "https://github.com/wolfboy199/SAFECORD-International-.git"
)

function Fail($msg){ Write-Host $msg -ForegroundColor Red; exit 1 }

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail "Git is not installed or not on PATH. Install Git from https://git-scm.com/downloads and re-run this script."
}

Push-Location -LiteralPath (Resolve-Path .).Path
try {
  if (-not (Test-Path .git)) {
    Write-Host "Initializing git repository..." -ForegroundColor Cyan
    git init
    git checkout -b main
  } else {
    $cur = git rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "Unable to detect branch." -ForegroundColor Yellow } else {
      if ($cur -ne 'main') {
        Write-Host "Renaming current branch to 'main'..." -ForegroundColor Cyan
        git branch -M main
      }
    }
  }

  Write-Host "Staging files..." -ForegroundColor Cyan
  git add --all

  Write-Host "Committing..." -ForegroundColor Cyan
  git commit -m "Initial commit - SAFECORD" 2>$null
  if ($LASTEXITCODE -ne 0) { Write-Host "No changes to commit or commit failed (this is OK)." -ForegroundColor Yellow }

  Write-Host "Configuring remote origin to: $RepoUrl" -ForegroundColor Cyan
  git remote remove origin 2>$null
  git remote add origin $RepoUrl

  Write-Host "Pushing to origin main (you may be prompted for credentials - use your GitHub username and a Personal Access Token if asked)..." -ForegroundColor Cyan
  git push -u origin main
  if ($LASTEXITCODE -ne 0) { Fail "git push failed. Check credentials and remote URL." }

  Write-Host "Push complete. Repository should now be on GitHub." -ForegroundColor Green
} finally {
  Pop-Location
}

Write-Host "If you prefer using GitHub CLI (gh), run: `gh auth login` then `gh repo create <your-username>/<repo> --public --source=. --push`" -ForegroundColor Cyan
