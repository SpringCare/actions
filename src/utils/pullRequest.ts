import {Octokit} from '@octokit/core';
import _ from 'lodash';

const github = require('@actions/github');
const yaml = require('js-yaml');

export async function getFiles(octokit: Octokit, pullNumber: number): Promise<any> {
	return await octokit.request(
		'GET /repos/{owner}/{repo}/pulls/{pull_number}/files?per_page={per_page}', {
			owner       : github.context.repo.owner,
			repo        : github.context.repo.repo,
			pull_number : pullNumber,
			per_page    : 100
		}
	);
}

export async function getFileContent(octokit: Octokit, branch: string, file: string, locale = 'en', isBackend: boolean) {
	const localesDir = isBackend? 'config/locales' : 'packages/cherrim/src/public/locales';
	const content = await octokit.request(
		'GET /repos/{owner}/{repo}/contents/{path}?ref={target_branch}', {
			headers: {
				Accept: 'application/vnd.github.v3.raw',
			},
			owner         : github.context.repo.owner,
			repo          : github.context.repo.repo,
			path          : `${localesDir}/${locale}/${file}`,
			target_branch : branch
		}
	);

	const fileContent = isBackend? yaml.load(content.data)[locale] : JSON.parse(content.data);
	return fileContent;
}

// returns an object with flattened keys
export const objectPaths = (object): Record<string, string> => {
	const result = {};
	_.forOwn(object, function (value, key) {
		if (_.isPlainObject(value)) {
			// Recursive step
			const keys = objectPaths(value);
			for (const subKey in keys) {
				const finalKey = key + '.' + subKey;
				result[finalKey] = keys[subKey];
			}
		} else {
			result[key] = value;
		}
	});
	return result;
};
export async function getPRs(octokit: Octokit, branch: string): Promise<Record<string, any>> {
	return await octokit.request('GET /repos/{owner}/{repo}/pulls?base={base}', {
		owner : github.context.repo.owner,
		repo  : github.context.repo.repo,
		base  : branch
	});
}
