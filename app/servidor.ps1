# Cuaderno de Foco · servidor local para Windows (no necesita instalar nada).
# Abre la app en http://localhost:8765 para poder instalarla como programa desde Chrome o Edge.
# Después de instalarla, la app abre sin este servidor y sin internet.
param([int]$Puerto = 8765, [switch]$NoAbrir)

$raiz = (Resolve-Path $PSScriptRoot).Path
$prefijo = "http://localhost:$Puerto/"
$tipos = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'; '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
}

$http = New-Object System.Net.HttpListener
$http.Prefixes.Add($prefijo)
try { $http.Start() }
catch {
  Write-Host "No pude usar el puerto $Puerto. Puede que la app ya esté abierta en otra ventana." -ForegroundColor Yellow
  if (-not $NoAbrir) { Start-Process $prefijo; Read-Host 'Pulsa Enter para cerrar' }
  exit 1
}
Write-Host "Cuaderno de Foco está abierto en $prefijo" -ForegroundColor Green
Write-Host 'En Chrome o Edge, pulsa el ícono de instalar en la barra de direcciones para tenerla como programa.'
Write-Host 'Deja esta ventana abierta mientras la usas desde el navegador. Para cerrar: Ctrl+C.'
if (-not $NoAbrir) { Start-Process $prefijo }

try {
  while ($http.IsListening) {
    $tarea = $http.GetContextAsync()
    while (-not $tarea.AsyncWaitHandle.WaitOne(500)) { }
    $ctx = $tarea.Result
    $res = $ctx.Response
    try {
      $ruta = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($ruta -eq '') { $ruta = 'index.html' }
      $archivo = [IO.Path]::GetFullPath((Join-Path $raiz $ruta))
      if (-not $archivo.StartsWith($raiz, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $archivo -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes('No encontrado')
      } else {
        $ext = [IO.Path]::GetExtension($archivo).ToLower()
        $res.ContentType = if ($tipos.ContainsKey($ext)) { $tipos[$ext] } else { 'application/octet-stream' }
        $res.AddHeader('Cache-Control', 'no-cache')
        $bytes = [IO.File]::ReadAllBytes($archivo)
      }
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch { $res.StatusCode = 500 } finally { $res.Close() }
  }
} finally { $http.Stop() }
