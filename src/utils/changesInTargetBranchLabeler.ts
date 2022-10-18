import GithubAPI from './githubAPI';

const github = require('@actions/github');
import {Commit, Pr, Label, BranchLabelerInputs, BranchCommits} from './types';
import { addLabels, removeLabel } from './labeler';

export default function ChangesInTargetBranchLabeler(inputs: BranchLabelerInputs): {
	manageLabel: (pr: Pr) => Promise<void>;
} {
	const githubAPI = GithubAPI(inputs.token);
	const client = new github.GitHub(inputs.token);
	const allBranchCommits = new Array<BranchCommits>();

	function getAllBranchCommits(): void {
		const branches = inputs.branches.split(',');
		for (const branch of branches) {
			const commits: Promise<Array<Commit>> = githubAPI.commitsInBranch(branch.trim());
			allBranchCommits.push({branch, commits});
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

	getAllBranchCommits();

	return {
		async manageLabel(
			pr: Pr): Promise<void> {
			const prCommits: Commit[] = await githubAPI.commitsInPR(
				pr.commits_url
			);
			const pullNumber = pr.number;
			const prLabels = pr.labels.map((label: Label) => label.name);

			if (allBranchCommits) {
				for (const branchCommit of allBranchCommits) {

					const branchCommits = await branchCommit.commits;
					const showBranchLabel = isEveryPRCommitInBranch(prCommits, branchCommits);

					const labelText = `Changes in ${branchCommit.branch}`;
					await githubAPI.createPRLabel(labelText, inputs.color);

					if (!showBranchLabel && prLabels.includes(labelText)) {
						removeLabel(client, pullNumber, labelText);
					}

					if (showBranchLabel) {
						addLabels(client, pullNumber, [labelText]);
					}
				}
			}
		},
	};
}
