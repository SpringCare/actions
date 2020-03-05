const core = require('@actions/core');
const github = require('@actions/github');


export async function getReviews(inputs, pullNumber) {

    const client = new github.GitHub(inputs.token);

    const data = await client.pulls.listReviews({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        // eslint-disable-next-line @typescript-eslint/camelcase
        pull_number: pullNumber,
    });

    return data;
};