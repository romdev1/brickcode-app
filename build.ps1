$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
$env:CSC_LINK = ""
$env:WIN_CSC_LINK = ""
$env:PATH = "C:\Users\user\Desktop\BrickCode App\node_modules\7zip-bin\win\x64;" + $env:PATH
Set-Location "C:\Users\user\Desktop\BrickCode App"
npm run build
