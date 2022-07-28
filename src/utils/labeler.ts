// eslint-disable-next-line @typescript-eslint/no-var-requires
const github = require('@actions/github');

export async function addLabels(client, prNumber: number, labels: Array<string>): Promise<void> {
	console.log('Adding labels:', labels);

	await client.issues.addLabels({
		owner        : github.context.repo.owner,
		repo         : github.context.repo.repo,
		issue_number : prNumber,
		labels       : labels
	});
}

export async function removeLabel(client, prNumber: number, label: string): Promise<void> {
	console.log('Removing label:', label);

	await client.issues.removeLabel({
		owner        : github.context.repo.owner,
		repo         : github.context.repo.repo,
		issue_number : prNumber,
		name         : label
	});
}

export async function createLabel(octokit, inputs): Promise<void> {
	try {
		await octokit.request('GET /repos/{owner}/{repo}/labels/{name}', {
			owner : github.context.repo.owner,
			repo  : github.context.repo.repo,
			name  : inputs.label,
		});
		console.log(`Label ${inputs.label} already exists.`);
	} catch (error) {
		await octokit.request('POST /repos/{owner}/{repo}/labels', {
			owner : github.context.repo.owner,
			repo  : github.context.repo.repo,
			name  : inputs.label,
			color : inputs.color,
		});
		console.log(`Created label ${inputs.label} with color ${inputs.color}.`);
	}
}

export async function getLabels(client, prNumber): Promise<Array<string>> {
	console.log('Getting labels for ', prNumber);

	const labels = await client.issues.listLabelsOnIssue({
		owner        : github.context.repo.owner,
		repo         : github.context.repo.repo,
		issue_number : prNumber,
	});

	return labels.data.map(elem => elem.name);
}
