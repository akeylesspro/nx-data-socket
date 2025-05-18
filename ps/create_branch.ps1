param (
    [string]$branchName
)
if (-not $branchName) {
    Write-Host "Please provide a branch name."
    exit 1
}
git stash
$branchExists = git branch --list $branchName
if ($branchExists) {
    git branch -D $branchName
}
git checkout -b $branchName
git stash pop
git status
git add -A
$response = Read-Host "Did you want to add all changes and add a commit: '$branchName' and publish the branch? (y/n)"
if ($response -ne "y") {
    Write-Output "Push branch aborted by the user."
    exit 0
}
git commit -m "$branchName"
git push origin $branchName
