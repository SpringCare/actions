# Spring Health Pull Request Labeler

### Features
1. Collects metrics on the PRs in your organization, when the PR is closed.

### Configuration Options
1. Must be run `on: [pull_request]`

### Sample Configuration:
```yml
name: Spring Health PR Metrics

on: [pull_request]

jobs:
  PullRequestMetrics:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/pull_request_metrics@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        firebase-secret: ${{ secrets.FIREBASE_SECRET }}
        firebase-url: "url"
```

We **strongly** recommend that `firebase-secret` is set as a secret for public repositories using `${{ secrets.FIREBASE_CONFIG}}`.  This is the file for the `firebase-admin` in `Settings -> Serivce Accounts`  Make sure to `JSON.stringify` the file before pasting it into github.