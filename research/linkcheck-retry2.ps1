$dir = $PSScriptRoot
$urls = @(
"https://www.youtube.com/@AndrejKarpathy",
"https://ai.google.dev/gemini-api/docs/pricing",
"https://help.aliyun.com/zh/model-studio/",
"https://ruby.langchain.com",
"https://huggingface.co/learn",
"https://docs.qdrant.tech/documentation/concepts/hybrid-queries/",
"https://www.alibabacloud.com/help/en/model-studio/model-pricing"
)
foreach ($u in $urls) {
  $r = & curl.exe -sS -o NUL --max-time 40 -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" -w "`nCODE=%{http_code}" $u 2>&1
  Write-Host ("### " + $u)
  Write-Host ($r -join "`n")
}
