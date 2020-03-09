import * as github from '@actions/github';

export async function addLabels(client, prNumber, labels): Promise<void> {
	console.log('Adding labels:', labels);

	await client.issues.addLabels({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		// eslint-disable-next-line @typescript-eslint/camelcase
		issue_number: prNumber,
		labels: labels
	});
}

export async function removeLabel(client, prNumber, label): Promise<void> {
	console.log('Removing label:', label);

	await client.issues.removeLabel({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		// eslint-disable-next-line @typescript-eslint/camelcase
		issue_number: prNumber,
		name: label
	});
}