$branchName = git rev-parse --abbrev-ref HEAD
git checkout develop
git branch -D $branchName
git pull origin develop