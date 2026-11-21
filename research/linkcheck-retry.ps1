$dir = $PSScriptRoot
$urls = @(
"https://www.youtube.com/@AndrejKarpathy",
"https://github.com/openai/openai-node",
"https://github.com/anthropics/prompt-eng-interactive-tutorial",
"https://github.com/anthropics/skills",
"https://github.com/microsoft/playwright-mcp",
"https://github.com/langfuse/langfuse",
"https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html",
"https://ai.google.dev/gemini-api/docs/pricing",
"https://help.aliyun.com/zh/model-studio/",
"https://ruby.langchain.com",
"https://huggingface.co/learn",
"https://docs.qdrant.tech/documentation/concepts/hybrid-queries/",
"https://www.alibabacloud.com/help/en/model-studio/model-pricing",
"https://openrouter.ai/docs",
"https://openrouter.ai/docs/features",
"https://openrouter.ai/docs/api"
)
foreach ($u in $urls) {
  $r = & curl.exe -s -o NUL --max-time 30 -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" -w "%{http_code}|%{num_redirects}|%{url_effective}" $u 2>$null
  if ($LASTEXITCODE -ne 0 -or -not $r) { $r = "ERR|-|-" }
  Write-Host ($u + "  =>  " + ($r -join " "))
}
Write-Host "RETRY DONE"
