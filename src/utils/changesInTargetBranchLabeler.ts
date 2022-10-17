import GithubAPI from './githubAPI';

const github = require('@actions/github');
import {Commit, Pr, Label, BranchLabelerInputs, BranchCommits} from './types';
import { addLabels, removeLabel, createLabel } from './labeler';

export default function ChangesInTargetBranchLabeler(inputs: BranchLabelerInputs): {
	manageLabel: (pr: Pr) => Promise<void>;
} {
	const gitAPI = GithubAPI(inputs.token);
	const client = new github.GitHub(inputs.token);

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore
	const branchCommits: [BranchCommits] = [];

	function getBranchCommits(): void {
		const branches = inputs.branches.split(',');
		for (const branch of branches) {
			gitAPI.commitsInBranch(branch.trim()).then(
				(commits: [Commit]) => branchCommits.push({branch, commits})
			);
		}
	}

	function isEveryPRCommitInBranch(prCommits: Commit[], branchCommits: Commit[]): boolean {
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
	}

	getBranchCommits();

	return {
		async manageLabel(
			pr: Pr): Promise<void> {
			const prCommits: Commit[] = await gitAPI.commitsInPR(
				pr.commits_url
			);
			const pullNumber = pr.number;
			const prLabels = pr.labels.map((label: Label) => label.name);

			console.log('BRANCH COMMITS: ', branchCommits);

			if (branchCommits) {
				for (const branchCommit of branchCommits) {

					const showBranchLabel = isEveryPRCommitInBranch(prCommits, branchCommit.commits);

					const label = `Changes in ${branchCommit.branch}`;
					await createLabel(gitAPI.octokit, label, inputs.color);

					if (!showBranchLabel && prLabels.includes(label)) {
						removeLabel(client, pullNumber, label);
					}

					if (showBranchLabel) {
						addLabels(client, pullNumber, [label]);
					}
				}
			}
		},
	};
}
