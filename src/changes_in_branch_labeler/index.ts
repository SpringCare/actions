const core = require('@actions/core');
const github = require('@actions/github');

import { addLabels, removeLabel } from '../utils/labeler';

interface Head {
	sha: string;
}

interface Label {
	name: string;
}
interface Pr {
	number: number;
	title: string;
	head: Head;
	labels: Array<Label>;
}

const getPrHeadCommitSha = async (
	octokit,
	commitsUrl: string,
	inputs: { token: string; branch: string }
): Promise<string> => {
	try {
		const headCommitSha = github.context.payload.head_commit.id;

		const commitResponse = await octokit.request(
			`GET ${commitsUrl}/${headCommitSha}?sha=${inputs.branch}`
		);
		const commit = commitResponse.data;

		let prHeadCommitSha = headCommitSha;
		if (commit.parents.length > 1) {
			prHeadCommitSha = commit.parents[1].sha;
		}
		return prHeadCommitSha;
	} catch (error) {
		console.error('PR head commit request failed: ', error.status);
		process.exit(1);
	}
};

const getPrsForCommit = async (
	octokit,
	commitsUrl: string,
	prHeadCommitSha: string
): Promise<Array<Pr>> => {
	try {
		const prsForCommitResponse = await octokit.request(
			`GET ${commitsUrl}/${prHeadCommitSha}/pulls`
		);
		const prsForCommit = prsForCommitResponse.data;
		const formattedPrs = prsForCommit.map((pr: { number: any; title: any }) => {
			return { number: pr.number, title: pr.title };
		});
		console.log('PRs: ', formattedPrs);
		return prsForCommit;
	} catch (error) {
		console.error('PRs for commit request failed: ', error.status);
		process.exit(1);
	}
};

async function main(): Promise<void> {
	const inputs: {
		token: string;
		branch: string;
	} = {
		token  : core.getInput('repo-token', { required: true }),
		branch : core.getInput('target-branch'),
	};

	const client = new github.GitHub(inputs.token);
	const octokit = github.getOctokit(inputs.token);

	const commitsUrl =
		github.context.payload.repository.commits_url.split('{/')[0];

	const prHeadCommitSha = await getPrHeadCommitSha(octokit, commitsUrl, inputs);

	const prsForCommit = await getPrsForCommit(
		octokit,
		commitsUrl,
		prHeadCommitSha
	);

	console.log(JSON.stringify(client));
	console.log(JSON.stringify(client.issues));

	prsForCommit.forEach((pr) => {
		const pullNumber = pr.number;
		const prLabels = pr.labels.map((label) => label.name);

		const showBranchLabel = pr.head.sha === prHeadCommitSha;

		const label = `Changes in ${inputs.branch}`;

		if (!showBranchLabel && prLabels.includes(label)) {
			removeLabel(client, pullNumber, label);
		}

		if (showBranchLabel) {
			addLabels(client, pullNumber, [label]);
		}
	});
}

main();
