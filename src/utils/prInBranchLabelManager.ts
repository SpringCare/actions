const github = require('@actions/github');
import { Octokit } from '@octokit/core';
import { Commit, Pr, Label, BranchLabelerInputs } from './types';
import { addLabels, removeLabel, createLabel } from './labeler';

export default function makePrInBranchLabelManager(inputs: BranchLabelerInputs): {
    getOpenPrs: () => Promise<Array<Pr>>;
    getBranchCommits: (targetBranch: string) => Promise<Array<Commit>>;
    addOrRemoveBranchLabel: (pr: Pr, branchCommits: Commit[]) => Promise<void>;
} {
	const octokit = new Octokit({ auth: inputs.token });
	const client = new github.GitHub(inputs.token);
	const repository = github.context.repo;

	const getCommitsForPR = async (url: string): Promise<Array<Commit>> => {
		try {
			const prCommitsResponse = await octokit.request(`GET ${url}`);
			const formattedCommits = prCommitsResponse.data.map((c: Commit) => {
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

	const shouldShowBranchLabel = (
		prCommits: Commit[],
		branchCommits: Commit[]
	): boolean => {
		return prCommits.every((prCommit: Commit) =>
			branchCommits.some(
				(branchCommit: Commit) =>
					branchCommit.sha === prCommit.sha ||
					(branchCommit.parents.length > 1 &&
						branchCommit.parents
							.map((parent: Commit) => parent.sha)
							.includes(prCommit.sha))
			)
		);
	};

	return {
		getOpenPrs: async (): Promise<Array<Pr>> => {
			try {
				const openPrsResponse = await octokit.request(
					`GET /repos/${repository.owner}/${repository.repo}/pulls`
				);
				const openPrs = openPrsResponse.data;
				const formattedPrs = openPrs.map((pr: Pr) => {
					return { number: pr.number, title: pr.title };
				});
				console.log('Open PRs: ', formattedPrs);
				return openPrs;
			} catch (error) {
				console.error('Open PRs request failed: ', error.status);
				process.exit(1);
			}
		},
		getBranchCommits: async (
			targetBranch: string
		): Promise<Array<Commit>> => {
			try {
				const branchCommitsResponse = await octokit.request(
					`GET /repos/${repository.owner}/${repository.repo}/commits?sha=${targetBranch}`
				);
				const formattedCommits = branchCommitsResponse.data.map((c: Commit) => {
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
		},
		addOrRemoveBranchLabel: async (
			pr: Pr,
			branchCommits: Commit[]
		): Promise<void> => {
			const prCommits: Commit[] = await getCommitsForPR(
				pr.commits_url
			);
			const pullNumber = pr.number;
			const prLabels = pr.labels.map((label: Label) => label.name);

			const showBranchLabel = shouldShowBranchLabel(prCommits, branchCommits);

			await createLabel(octokit, inputs);

			if (!showBranchLabel && prLabels.includes(inputs.label)) {
				removeLabel(client, pullNumber, inputs.label);
			}

			if (showBranchLabel) {
				addLabels(client, pullNumber, [inputs.label]);
			}
		},
	};
}
