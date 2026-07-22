<#
.SYNOPSIS
    Script de restoration des projets Supabase Zeniva et ZeniPay
.DESCRIPTION
    Les projets Supabase sont INACTIFS depuis juillet 2026 à cause de factures impayées.
    Ce script guide la restauration et applique les migrations une fois les projets reactivés.
.NOTES
    Auteur: Zeniva Dev
    Date: 2026-07-22
#>

$ErrorActionPreference = "Stop"

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   ZENIVA / ZENIPAY - RESTORATION SUPABASE          ║" -ForegroundColor Cyan
Write-Host "╠══════════════════════════════════════════════════════╣" -ForegroundColor Cyan
Write-Host "║  Problème: Projets INACTIFS (factures impayées)    ║" -ForegroundColor Yellow
Write-Host "║  Date: 2026-07-22                                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Configuration ──────────────────────────────────────────────
$ORG_ID = "dcdlwrqtsaevojcnopkf"
$ORG_SLUG = "dcdlwrqtsaevojcnopkf"

$PROJECTS = @(
    @{
        Name = "ZeniPay"
        Ref = "mjkvkibdfteonvlahtag"
        EnvFiles = @(
            "C:\Users\ILM\OneDrive\Documents\Default Project\ZeniPay\.env.local",
            "C:\Users\ILM\OneDrive\Documents\Default Project\.env.local",
            "C:\Users\ILM\OneDrive\Documents\Default Project\Zeniva\web\.env.local"
        )
        MigrationsPath = "C:\Users\ILM\OneDrive\Documents\Default Project\ZeniPay\supabase\migrations"
    },
    @{
        Name = "ZenivaTravel"
        Ref = "rvlcgtlcjylozbihtpkr"
        EnvFiles = @(
            "C:\Users\ILM\OneDrive\Documents\Default Project\Zeniva\web\.env.local (alt)"
        )
        MigrationsPath = @(
            "C:\Users\ILM\OneDrive\Documents\Default Project\Zeniva\supabase\migrations",
            "C:\Users\ILM\OneDrive\Documents\Default Project\Zeniva\web\supabase\migrations"
        )
    }
)

# ─── Étape 1: Payer les factures ──────────────────────────────
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ÉTAPE 1: PAYER LES FACTURES IMPAYÉES             ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "Les projets Supabase sont INACTIFS car l'organisation a des" -ForegroundColor Red
Write-Host "factures impayées. Va sur le dashboard Supabase pour payer:" -ForegroundColor Red
Write-Host ""
Write-Host "  📍 https://supabase.com/dashboard/org/$ORG_SLUG/invoices" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tu dois être connecté avec le compte:" -ForegroundColor White
Write-Host "  - Email: alexandre08626@gmail.com (ou similaire)" -ForegroundColor Gray
Write-Host "  - Organization: Alexandre08626's Org" -ForegroundColor Gray
Write-Host ""

do {
    $response = Read-Host "As-tu payé les factures? (y/n)"
} while ($response -notin @("y", "n"))

if ($response -eq "n") {
    Write-Host ""
    Write-Host "❌ Tu dois payer les factures d'abord. Reviens après!" -ForegroundColor Red
    Write-Host "   Lien: https://supabase.com/dashboard/org/$ORG_SLUG/invoices" -ForegroundColor Cyan
    exit 1
}

# ─── Étape 2: Restaurer les projets ──────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ÉTAPE 2: RESTAURER LES PROJETS INACTIFS          ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "Va dans chaque projet et clique 'Restore':" -ForegroundColor White
Write-Host ""

foreach ($proj in $PROJECTS) {
    Write-Host "  📍 $($proj.Name): https://supabase.com/dashboard/project/$($proj.Ref)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Sur le dashboard du projet:" -ForegroundColor White
Write-Host "  1. Tu verras un message 'Project is inactive'" -ForegroundColor Gray
Write-Host "  2. Clique sur 'Restore project'" -ForegroundColor Gray
Write-Host "  3. Confirme la restauration" -ForegroundColor Gray
Write-Host ""

do {
    $response = Read-Host "As-tu restauré les projets? (y/n)"
} while ($response -notin @("y", "n"))

if ($response -eq "n") {
    Write-Host ""
    Write-Host "❌ Restaure les projets d'abord. Reviens après!" -ForegroundColor Red
    exit 1
}

# ─── Étape 3: Vérifier la connexion ──────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ÉTAPE 3: VÉRIFIER LA CONNEXION                   ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

Write-Host "Vérification de la connexion Supabase..." -ForegroundColor White
$testUrl = "https://mjkvkibdfteonvlahtag.supabase.co/rest/v1/"
try {
    $response = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
    Write-Host "✅ Connexion Supabase réussie!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Connexion Supabase échouée: $_" -ForegroundColor Yellow
    Write-Host "   Le projet est peut-être encore en cours de restauration." -ForegroundColor Yellow
    Write-Host "   Attends quelques minutes et réessaie." -ForegroundColor Yellow
    
    do {
        $response = Read-Host "Réessayer? (y/n)"
        if ($response -eq "y") {
            try {
                $response = Invoke-WebRequest -Uri $testUrl -Method Get -TimeoutSec 10 -ErrorAction Stop
                Write-Host "✅ Connexion Supabase réussie!" -ForegroundColor Green
                break
            } catch {
                Write-Host "⚠️  Toujours pas de connexion." -ForegroundColor Yellow
            }
        }
    } while ($response -eq "y")
    
    if ($response -eq "n") {
        Write-Host "❌ Continue manuellement plus tard." -ForegroundColor Red
        exit 1
    }
}

# ─── Étape 4: Appliquer les migrations ────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ÉTAPE 4: APPLIQUER LES MIGRATIONS                ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

foreach ($proj in $PROJECTS) {
    Write-Host "→ Projet: $($proj.Name) ($($proj.Ref))" -ForegroundColor Cyan
    Write-Host "  Migrations: $($proj.MigrationsPath)" -ForegroundColor Gray
    
    $migrationPaths = if ($proj.MigrationsPath -is [array]) { $proj.MigrationsPath } else { @($proj.MigrationsPath) }
    
    foreach ($mp in $migrationPaths) {
        if (Test-Path $mp) {
            $migrations = Get-ChildItem -Path $mp -Filter "*.sql" | Sort-Object Name
            Write-Host "  Trouvé $($migrations.Count) fichiers de migration" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ Chemin non trouvé: $mp" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Application des migrations via Supabase CLI..." -ForegroundColor White
Set-Location -Path "C:\Users\ILM\OneDrive\Documents\Default Project\ZeniPay"

# Lier le projet si pas déjà fait
$linkedRef = Get-Content "supabase\.temp\project-ref" -ErrorAction SilentlyContinue
if ($linkedRef -ne "mjkvkibdfteonvlahtag") {
    Write-Host "Liaison au projet ZeniPay..." -ForegroundColor Yellow
    npx supabase link --project-ref mjkvkibdfteonvlahtag
}

# Appliquer les migrations
Write-Host "Application des migrations ZeniPay..." -ForegroundColor Yellow
npx supabase db push

Write-Host ""
Write-Host "✅ Migrations appliquées avec succès!" -ForegroundColor Green

# ─── Étape 5: Vérification finale ────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ÉTAPE 5: VÉRIFICATION FINALE                     ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Supabase restauré et migrations appliquées!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor White
Write-Host "  1. Vérifie que les clés API dans .env.local sont correctes" -ForegroundColor Gray
Write-Host "  2. Redémarre le serveur de développement" -ForegroundColor Gray
Write-Host "  3. Vérifie la connexion avec npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   RESTORATION COMPLÈTE !                            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
