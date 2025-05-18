param (
    [string]$common,
    [string]$version = "latest"
)

if ($common) {
    Write-Output "------------------- update $common commons version $version -------------------"
    npm i "akeyless-$common-commons@$version"  
    [System.Console]::Beep(1000, 500)
    [System.Console]::Beep(1000, 500)
    npm start
    exit 1
}
# update all commons if no common is specified
# server
Write-Output "------------------- update server commons... -------------------"
npm i akeyless-server-commons 
Write-Output "------------------- server commons have been updatede successfully! -------------------"

# types
Write-Output "------------------- update types commons... -------------------"
npm i akeyless-types-commons 
Write-Output "------------------- types commons have been updatede successfully! -------------------"

[System.Console]::Beep(1000, 500)
[System.Console]::Beep(1000, 500)
# --legacy-peer-deps
