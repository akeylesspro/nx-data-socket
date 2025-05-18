param (
  [string]$environment
)
if (-not $environment) {
    Write-Output "Error: environment is required."
    exit 1
}
Write-Output("Changeing To $environment Environment...")
if ($environment -eq "qa") {
    $googleProject = "akeyless-nx-qa"
    gcloud config set project $googleProject
}
elseif ($environment -eq "prod") {
    $googleProject = "akeyless-nx"
    gcloud config set project $googleProject 
}
else{
    Write-Output("$environment is not a valid")
    exit 1
}
gcloud container clusters get-credentials nx-api --zone europe-west1
Write-Output("")
Write-Output("Success")
Write-Output("Current Environment: $environment ")
Write-Output("Google Project: $googleProject")
Write-Output("Pods:")
kubectl get pods
Write-Output("")
