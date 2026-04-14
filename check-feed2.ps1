# Check all 8 categories
$cats = "Pokemon TCG,Sports Cards,Watches,Sneakers,Lego,Funko Pop,Comics,Coins"
$resp2 = Invoke-RestMethod -Uri "https://uniques-app.vercel.app/api/feed/discover?page=1&pageSize=20"
Write-Host "=== No filter (all cats) ==="
Write-Host ("Events: " + $resp2.events.Count + "  hasMore: " + $resp2.hasMore)
foreach ($e in $resp2.events) {
  $imgHost = try { ([System.Uri]$e.item.imageUrl).Host } catch { '?' }
  Write-Host ("{0,-10} | {1,-18} | {2,-20} | {3}" -f $e.user.name, $e.type, $e.categories[0], $imgHost)
}

Write-Host ""
Write-Host "=== Page 2 ==="
$resp3 = Invoke-RestMethod -Uri "https://uniques-app.vercel.app/api/feed/discover?page=2&pageSize=20"
Write-Host ("Events: " + $resp3.events.Count + "  hasMore: " + $resp3.hasMore)
