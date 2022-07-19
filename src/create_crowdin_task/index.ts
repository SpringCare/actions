import {ProjectsGroups, SourceFiles, Tasks} from '@crowdin/crowdin-api-client';

const core = require('@actions/core');
const github = require('@actions/github');
const crowdin = require('@crowdin/crowdin-api-client');

import { Octokit } from '@octokit/core';

async function getProjectId(projectsGroupsApi: ProjectsGroups): Promise<number> {
	const response = await projectsGroupsApi.listProjects();
	return response.data[0].data.id;
}

async function getEnDirectoryId(sourceFilesApi: SourceFiles, projectId: number, branchId: number): Promise<number> {
	const enResponse = await sourceFilesApi.listProjectDirectories(projectId, {
		branchId: branchId, filter: 'en', recursion: 'true'
	});
	return enResponse.data[0].data.id;
}

async function getBranchId(sourceFilesApi: SourceFiles, projectId: number, branchName: string): Promise<number> {
	const branches = await sourceFilesApi.listProjectBranches(projectId, {
		name: branchName
	});

	return branches.data[0].data.id;
}

async function getFileIds(sourceFilesApi: SourceFiles, projectId: number, enLocaleDirId: number): Promise<Array<number>> {
	const files = await sourceFilesApi.listProjectFiles(projectId, {
		directoryId: enLocaleDirId
	});

	// Todo: filter only the files changed in the current PR
	return files.data.map(elem => elem.data.id);
}

async function createTask(tasksApi: Tasks, projectId: number, filesIds: Array<number>, languages: string[]): Promise<void> {
	try {
		for (const lang of languages) {
			await tasksApi.addTask(projectId, {
				title                          : 'SH Internal Task',
				type                           : 3,
				fileIds                        : filesIds,
				languageId                     : lang,
				vendor                         : 'oht',
				skipAssignedStrings            : true,
				skipUntranslatedStrings        : false,
				includeUntranslatedStringsOnly : false
			});
		}
	} catch (e) { // Todo: Check for specific error - Task not created
		throw 'Manual Translation Needed!';
	}
}

async function getTargetLanguages(projectsGroupsApi: ProjectsGroups): Promise<Array<string>> {
	const response = await projectsGroupsApi.listProjects();
	return response.data[0].data.targetLanguageIds;
}

function sleep(ms: number): Promise<unknown> {
	return new Promise( resolve => setTimeout(resolve, ms) );
}

const doMainStuff = async (inputs: { token: string; branch: string }, projectsGroupsApi: ProjectsGroups, sourceFilesApi: SourceFiles, tasksApi: Tasks, retry: number): Promise<number> => {
	const branchName = '[SpringCare.arceus] ' + inputs.branch.replace('/', '.');
	const projectId = await getProjectId(projectsGroupsApi);
	const branchId = await getBranchId(sourceFilesApi, projectId, branchName);
	const enLocaleDirId = await getEnDirectoryId(sourceFilesApi, projectId, branchId);

	// Todo: get changed files
	// What if?
	//	- output changed files from translation diff action using `setOutput`
	//	- filter out only the changed files
	const filesIds = await getFileIds(sourceFilesApi, projectId, enLocaleDirId);

	const languages = await getTargetLanguages(projectsGroupsApi);

	try {
		await createTask(tasksApi, projectId, filesIds, languages);
		retry = 0;
	} catch (e) {
		if (e.message === 'Language has no untranslated words')
			retry -= 1;
	}
	return retry;
};

async function main (): Promise<void> {
	let retry = 1;

	const inputs: {
				token: string;
				branch: string;
			} = {
				token  : core.getInput('repo-token', {required: true}),
				branch : core.getInput('branch'),
			};

	// Todo: get the token from the env variable
	const token = 'cdb855490129eee0b5807de981ebc4b22b8280ccca2bea52f544af17d52adde2f4cccdb25b9d5272';
	const {
		sourceFilesApi,
		projectsGroupsApi,
		tasksApi
	} = new crowdin.default({token});

	// eslint-disable-next-line no-constant-condition
	while (true) {
		retry = await doMainStuff(inputs, projectsGroupsApi, sourceFilesApi, tasksApi, retry);
		if (retry > 0) {
			await sleep(2 * 60 * 1000);
		}
	}
}

main();