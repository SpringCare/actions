const core = require('@actions/core');
const github = require('@actions/github');

import { addLabels, removeLabel, createLabel } from '../utils/labeler';
import { parseReviews } from '../utils/parseReviews';
import { getReviews } from '../utils/getReviews';
import { Octokit } from '@octokit/core';

const handleReviewCountLabel = async (
	inputs,
	client,
	pullNumber
): Promise<void> => {
	if (inputs.requiredReviews && !(inputs.requiredReviews > 0)) {
		core.setFailed('If set, "required" must be an integer greater than 0');
		return;
	}

	const { data } = await getReviews(inputs.token, pullNumber);

	if (inputs.requiredReviews > 0) {
		const activeReviews = parseReviews(data || []);
		const approvedReviews = activeReviews.filter(
			(r) => r.state.toLowerCase() === 'approved'
		);

		console.log('active', activeReviews);

		let reviewCount = approvedReviews.length;
		if (reviewCount > inputs.requiredReviews) {
			reviewCount = inputs.requiredReviews;
		}

		const toAdd = `${reviewCount} of ${inputs.requiredReviews}`;

		// Loop through the current labels and remove any existing "x of y" labels
		for (let i = 0; i <= inputs.requiredReviews; i++) {
			// When removing, we need to escape special characters
			const loopCount = `${i}%20of%20${inputs.requiredReviews}`;

			// Don't remove the one we're trying to add, just in case a race condition happens on the server
			if (i !== reviewCount) {
				removeLabel(client, pullNumber, loopCount);
			}
		}

		addLabels(client, pullNumber, [toAdd]);
	}
};

const handleWIPLabel = (inputs, client, pr): void => {
	const draftPR = pr.draft;
	const pullNumber = pr.number;
	if (inputs.labelWIP && draftPR) {
		addLabels(client, pullNumber, ['WIP']);
	} else if (inputs.labelWIP && !draftPR) {
		removeLabel(client, pullNumber, 'WIP');
	}
};

const getCommitsForPR = async (url, octokit): Promise<Array<object>> => {
	try {
		const prCommitsResponse = await octokit.request(`GET ${url}`);
		const formattedCommits = prCommitsResponse.data.map((c) => {
			return {
				sha    : c.sha,
				author : c.commit.author.name,
			};
		});
		console.log('PR commits: ', formattedCommits, '\n');
		return prCommitsResponse.data;
	} catch (error) {
		console.error('PR commit request failed: ', error.status);
		process.exit(1);
	}
};

const getBranchCommits = async (
	url,
	targetBranch,
	octokit
): Promise<Array<object>> => {
	try {
		const branchCommitsResponse = await octokit.request(
			`GET ${url}?sha=${targetBranch}`
		);
		const formattedCommits = branchCommitsResponse.data.map((c) => {
			return {
				sha    : c.sha,
				author : c.commit.author.name,
			};
		});
		console.log(`${targetBranch} commits: `, formattedCommits, '\n');
		return branchCommitsResponse.data;
	} catch (error) {
		console.error('Branch commit request failed: ', error.status);
		process.exit(1);
	}
};

const shouldShowBranchLabel = (prCommits, branchCommits): boolean => {
	return prCommits.every((prCommit) =>
		branchCommits.some(
			(branchCommit) =>
				branchCommit.sha === prCommit.sha ||
				(branchCommit.parents.length > 1 &&
					branchCommit.parents
						.map((parent) => parent.sha)
						.includes(prCommit.sha))
		)
	);
};

const handleBranchLabel = async (inputs, client, pr): Promise<void> => {
	const octokit = new Octokit({ auth: inputs.token });

	const prCommits = await getCommitsForPR(pr.commits_url, octokit);
	const commitsUrl = pr.base.repo.commits_url.split('{/')[0];
	const branchCommits = await getBranchCommits(
		commitsUrl,
		inputs.branch,
		octokit
	);
	const pullNumber = pr.number;
	const prLabels = pr.labels.map((label) => label.name);

	const showBranchLabel = shouldShowBranchLabel(prCommits, branchCommits);

	await createLabel(octokit, inputs);

	if (!showBranchLabel && prLabels.includes(inputs.label)) {
		removeLabel(client, pullNumber, inputs.label);
	}

	if (showBranchLabel) {
		addLabels(client, pullNumber, [inputs.label]);
	}
};

async function main(): Promise<void> {
	// Get a few inputs from the GitHub event.
	const inputs: {
		token: string;
		requiredReviews: number;
		labelWIP: boolean;
		branch: string;
		label: string;
		color: string;
	} = {
		token           : core.getInput('repo-token', { required: true }),
		requiredReviews : core.getInput('required'),
		labelWIP        : core.getInput('wip'),
		branch          : core.getInput('target-branch'),
		label           : core.getInput('label'),
		color           : core.getInput('color'),
	};

	const pr = github.context.payload.pull_request;
	if (!pr) {
		core.setFailed(
			'This action must be run with only "pull_request" or "pull_request_review".'
		);
		return;
	}
	const pullNumber = pr.number;

	console.log('PR number is', pullNumber);
	console.log('Inputs', inputs);

	const client = new github.GitHub(inputs.token);

	handleReviewCountLabel(inputs, client, pullNumber);

	handleWIPLabel(inputs, client, pr);

	handleBranchLabel(inputs, client, pr);
}

// Call the main function.
main();
