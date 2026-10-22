```ps1
# PowerShell script s vnořenými řetězci
$name = "Test uživatel"
$description = "Popis s `zvýrazněním`"

if ($name -eq "Test uživatel") {
  Write-Output "Našlo se to."
}

# String s uvozovkami
$path = "c:\users\test\folder with spaces"
```