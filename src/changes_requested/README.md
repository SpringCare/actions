# Spring Health Changes Requested Action

### Features
1. Adds a label when changes are requested on a PR (`label-on-changes-requested` = true)
1. Can optionally send a slack message to the author of the PR when a change is requested.

### Configuration Options
1. Must be run `on: [pull_request_review]`
1. Toggle on / off the label (`label-on-changes-requested: boolean`)
1. Send a slack message to the PR author:
   - **Required** Must provide `slack-webhook-url` in your Repo's secrets
   - EITHER:
       - `slack_channel: string` can be provided to post to a general channel.
       - OR
       - `github-slack-mapping: {<github_id>: <slack_id>}` can be provided to post to the PR's author.
   - Can provide `bot-name: string` to customize who is sending the mesage (Default is "Spring Health")
   - Can provide `icon_emoji` to use an emoji as the bot's icon.

### Sample Configuration:
**OnlyLabel**

```yml
name: Spring Health Changes Requested

on: [pull_request_review]

jobs:
  ChangesRequested:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/changes_requested@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        label-on-changes-requested: true
```

**Send Message to Slack Channel & Label**

```yml
name: Spring Health Changes Requested

on: [pull_request_review]

jobs:
  ChangesRequested:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/changes_requested@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        label-on-changes-requested: true
        bot-name: 'Good Bot'
        icon_emoji: ':dog:'
        slack-channel: '#dev'
```

**Send Message to PR Author & Label**
```yml
name: Spring Health Changes Requested

on: [pull_request_review]

jobs:
  ChangesRequested:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/changes_requested@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        label-on-changes-requested: true
        bot-name: 'Good Bot'
        icon_emoji: ':dog:'
        github-slack-mapping: '{"123":"U123ABC","456":"U456ABC"}'
```