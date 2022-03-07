# Spring Health Changes In Branch Labeler

## Features

- Adds a label mentioning whether or not commits in a PR are already present in a target branch (staging by default), this is useful for QA.
    - If your repo requires you to track a staging or a pre-prod environment, this can help!
    - If the changes in the PR are already present on the target-branch the label `Changes in target-branch` will show up.
    - If a PR already has it's changes in target-branch and we add new commits in PR or remove the changes from target-branch, the label is removed.

### Configuration Options

1. Must be run `on: push`
2. `target-branch` is the branch that this action will track.
3. `label` the label that will be added to the PR.
4. `color` the color of the label in hex, without the #.

### Sample Configuration:

```yml
name: Changes in Staging Labeler

on:
  push:
    branches:
      - staging

jobs:
  labelPrChangesInBranch:
    runs-on: ubuntu-latest

    steps:
    - uses: SpringCare/actions/dist/changes_in_branch_labeler@master
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        target-branch: staging
        label: Changes in staging
        color: 8989FF

```
