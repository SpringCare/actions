const github = require('@actions/github');

export async function addLabels(client, prNumber, labels) {
	console.log('Adding labels:', labels);

	await client.issues.addLabels({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: prNumber,
		labels: labels
	});
}

export async function removeLabel(client, prNumber, label) {
	console.log('Removing label:', label);

	await client.issues.removeLabel({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: prNumber,
		name: label
	});
}