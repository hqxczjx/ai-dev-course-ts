$dir = $PSScriptRoot
$urls = Get-Content (Join-Path $dir "linkcheck-urls.txt") | Where-Object { $_.Trim() -ne "" }
$out = Join-Path $dir "linkcheck-result.tsv"
Remove-Item $out -ErrorAction SilentlyContinue
foreach ($u in $urls) {
  $r = & curl.exe -s -o NUL --max-time 25 -L -w "%{http_code}|%{num_redirects}|%{url_effective}" $u 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $r) { $r = "ERR|-|-" }
  Add-Content -Path $out -Value ($u + "`t" + ($r -join " "))
  Write-Host ($u + "  =>  " + ($r -join " "))
}
Write-Host "DONE"
