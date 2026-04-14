$resp = Invoke-RestMethod -Uri 'https://uniques-app.vercel.app/api/feed/discover?page=1&pageSize=20'
$cnt = $resp.events.Count
$hm = $resp.hasMore
Write-Host "Events: $cnt, hasMore: $hm"
foreach ($e in $resp.events) {
  $imgHost = try { ([System.Uri]$e.item.imageUrl).Host } catch { '?' }
  Write-Host ("{0,-10} | {1,-18} | {2,-15} | {3}" -f $e.user.name, $e.type, $e.categories[0], $imgHost)
}
