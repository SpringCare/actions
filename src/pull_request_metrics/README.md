# Spring Health Pull Request Labeler

### Features
1. Collects metrics on the PRs in your organization, when the PR is closed.

### Configuration Options
1. Must be run `on: [pull_request]`
1. Label required reviews remaining (`required: number`)
1. Label draft PRs with `WIP` (`wip: true`)

### Sample Configuration:
**Label 2 required reviews.**

```yml
name: Spring Changes Requested

on: [pull_request]

jobs:
  PullRequestMetrics:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/pull_request_metrics@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        firebase-config: "{}"
```

We recommend that `firebase-config` is set as a secret for public repositories using `${{ secrets.FIREBASE_CONFIG}}`