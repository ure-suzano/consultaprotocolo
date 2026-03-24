Write-Host "Clonando..."
git clone https://github.com/danielaresende26/TelaDeLogin.git repo4 2>&1 | Out-String | Write-Host
Write-Host "Copiando arquivo..."
Copy-Item -Path "js\admin_script.js" -Destination "repo4\js\admin_script.js" -Force
Set-Location repo4
Write-Host "Commiting..."
git add .
git commit -m "Fixing global supabase variable collision" 2>&1 | Out-String | Write-Host
Write-Host "Fazendo Push..."
git push origin main 2>&1 | Out-String | Write-Host
Set-Location ..
Write-Host "Limpando..."
Remove-Item -Recurse -Force repo4
Write-Host "FIM"
