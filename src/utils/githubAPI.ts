import {Commit, Pr} from './types';
import {Octokit} from '@octokit/core';
const github = require('@actions/github');

export default function GithubAPI(token: string): {
	octokit: Octokit;
	openPRs: () => Promise<Array<Pr>>;
	commitsInPR: (url: string) => Promise<Array<Commit>>;
	commitsInBranch: (targetBranch: string) => Promise<Array<Commit>>;
} {
	const octokit = new Octokit({ auth: token });
	const repository = github.context.repo;

	return {
		octokit,
		async openPRs(): Promise<Array<Pr>> {
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
		async commitsInPR(url: string): Promise<Array<Commit>> {
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
		},
		async commitsInBranch(
			targetBranch: string
		): Promise<Array<Commit>> {
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
	};
}
