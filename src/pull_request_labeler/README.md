# Spring Health Pull Request Labeler
test
### Features
1. Labels for knowing how many reviews are remaining before merge.
    - If your repo requires multiple reviews before merging PRs, this action will help!
    - Define `required` as a number greater than 0, and the bot will label `x of {required}` as reviews are added.
    - For example, `required: 3` will results in `0 of 3` `1 of 3` `2 of 3` and `3 of 3` being added to the PR as approving reviews are added.
    - If an approved review is removed / changed to changes requested, the bot will count backwards.
1. Labels `Draft` PRs with a `WIP` label automatically

### Configuration Options
1. Must be run `on: [pull_request_review, pull_request]`
1. Label required reviews remaining (`required: number`)
1. Label draft PRs with `WIP` (`wip: true`)

### Sample Configuration:
**Label 2 required reviews.**

```yml
name: Spring Changes Requested

on: [pull_request_review, pull_request]

jobs:
  ChangesRequested:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/pull_request_labeler@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        required: 2
```
