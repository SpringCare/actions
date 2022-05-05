const core = require('@actions/core')
const github = require('@actions/github')

import { Octokit } from '@octokit/core'

async function main (): Promise<void> {
  const inputs: {
    token: string
  } = {
    token: core.getInput('repo-token', { required: true })
  }

  const pullNumber = github.context.payload.pull_request.number
  const repository = github.context.repo

  const octokit = new Octokit({ auth: inputs.token })

  await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}/files', {
    owner: repository.owner,
    repo: repository.name,
    pull_number: pullNumber
  })
}

main();