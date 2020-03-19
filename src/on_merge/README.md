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
  OnMerge:
    runs-on: ubuntu-latest
    steps:
    - uses: 'SpringCare/actions/dist/on_merge@master'
      with:
        pivotal-api-key: ${{ secrets.PIVOTAL_API_KEY }}
      if: github.event.pull_request.merged == true
```