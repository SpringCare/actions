# Spring Health Changes Requested Action

### Features
1. Slacks PR author when a PR has been approved

### Configuration Options
1. Must be run `on: [pull_request_review, pull_request]`
1. Send a slack message to the PR author:
   - **Required** Must provide `slack-webhook-url` in your Repo's secrets
   - EITHER:
       - `slack_channel: string` can be provided to post to a general channel.
       - OR
       - `github-slack-mapping: {<github_id>: <slack_id>}` can be provided to post to the PR's author.
   - Can provide `bot-name: string` to customize who is sending the message (Default is "Spring Health")
   - Can provide `icon_emoji` to use an emoji as the bot's icon.

### Sample Configuration:

**Send Message to Slack Channel**

```yml
name: Spring Health Pull Request Approved

on:
  pull_request_review:
    types: [submitted]

jobs:
  ChangesRequested:
    runs-on: ubuntu-latest

    steps:
    - uses: 'SpringCare/actions/dist/pull_request_approved@master'
      with:
        repo-token: ${{ secrets.GITHUB_TOKEN }}
        slack-webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
        bot-name: 'Good Bot'
        icon_emoji: ':dog:'
        slack-channel: '#dev'
```
`