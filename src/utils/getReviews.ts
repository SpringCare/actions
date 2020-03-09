const github = require('@actions/github');

export async function getReviews(token, pullNumber): Promise<{data: []}> {

	const client = new github.GitHub(token);

	return await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		pull_number: pullNumber,
	});
}

