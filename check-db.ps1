# Call the seed endpoint with verbose logging by checking each category separately
$allCats = @("Pokemon TCG", "Sports Cards", "Watches", "Sneakers", "Lego", "Funko Pop", "Comics", "Coins")

# Try discover per category
foreach ($cat in $allCats) {
  $encoded = [System.Uri]::EscapeDataString($cat)
  $r = Invoke-RestMethod -Uri "https://uniques-app.vercel.app/api/feed/discover?page=1&pageSize=5&categories=$encoded"
  Write-Host ("{0,-15}: {1} items" -f $cat, $r.events.Count)
}
