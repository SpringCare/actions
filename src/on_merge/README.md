# Spring Health On Merge To Staging

### Features
1. Pivotal Tracker 

### Configuration Options
1. Must be run `on: [pull_request]`

### Sample Configuration:

```yml
name: Spring Health On Merge To Staging

on:
  pull_request:
    types: [closed]

jobs:
  Pull request merged:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/on_merge@feature/gh-action-pivotal-tracker'
      if: github.event.pull_request.merged == true
      run: echo merged
```