// eslint-disable-next-line @typescript-eslint/no-var-requires
const github = require('@actions/github');

export async function getReviews(token, pullNumber): Promise<any> {

	const client = new github.GitHub(token);

	return await client.pulls.listReviews({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		// eslint-disable-next-line @typescript-eslint/camelcase
		pull_number: pullNumber,
	});
}

