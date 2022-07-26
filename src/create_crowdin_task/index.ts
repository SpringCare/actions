import {ProjectsGroups, SourceFiles, Tasks} from '@crowdin/crowdin-api-client';

const core = require('@actions/core');
const github = require('@actions/github');
const crowdin = require('@crowdin/crowdin-api-client');
import { addLabels } from '../utils/labeler';

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

async function createTask(tasksApi: Tasks, projectId: number, filesIds: Array<number>, languages: string[], pullNumber: number): Promise<void> {
	for (const lang of languages) {
		await tasksApi.addTask(projectId, {
			title                          : `#${pullNumber} - SH Translation Task`,
			type                           : 3,
			fileIds                        : filesIds,
			languageId                     : lang,
			vendor                         : 'oht',
			skipAssignedStrings            : true,
			skipUntranslatedStrings        : false,
			includeUntranslatedStringsOnly : true,
			description                    : ''
		});
	}
}

async function getTargetLanguages(projectsGroupsApi: ProjectsGroups): Promise<Array<string>> {
	const response = await projectsGroupsApi.listProjects();
	return response.data[0].data.targetLanguageIds;
}

function sleep(ms: number): Promise<unknown> {
	return new Promise( resolve => setTimeout(resolve, ms) );
}

const trackSync = async (branch: string, crowdinAPIs, retry: number, pullNumber: number, label = 'Manual Translations Needed'): Promise<object> => {
	const {
		projectsGroupsApi,
		sourceFilesApi,
		tasksApi
	} = crowdinAPIs;

	const branchName = '[SpringCare.arceus] ' + branch.replace('/', '.');
	const projectId = await getProjectId(projectsGroupsApi);
	const branchId = await getBranchId(sourceFilesApi, projectId, branchName);
	const enLocaleDirId = await getEnDirectoryId(sourceFilesApi, projectId, branchId);

	const filesIds = await getFileIds(sourceFilesApi, projectId, enLocaleDirId);

	const languages = await getTargetLanguages(projectsGroupsApi);

	try {
		await createTask(tasksApi, projectId, filesIds, languages, pullNumber);
		label = 'In Translation';
		retry = 0;
	} catch (e) {
		if (e.message === 'Language has no unapproved words')
			retry--;
		else
			retry = 0;
	}
	return {retry, label};
};

async function main (): Promise<void> {
	const inputs: {
				token: string;
				branch: string;
				retry: number;
				crowdinToken: string;
			} = {
				token        : core.getInput('repo-token', {required: true}),
				branch       : core.getInput('branch'),
				retry        : core.getInput('retry', {required: true}),
				crowdinToken : core.getInput('crowdin-token', {required: true}),
			};

	const crowdinAPIs = new crowdin.default({token: inputs.crowdinToken});

	const client = new github.GitHub(inputs.token);
	const pullNumber = github.context.payload.pull_request.number;

	let label;
	let retry = inputs.retry;

	while (retry > 0) {
		const foo = await trackSync(inputs.branch, crowdinAPIs, retry, pullNumber);
		retry = foo['retry'];
		label = foo['label'];
		if (retry > 0) {
			await sleep(2 * 60 * 1000);
		}
	}

	await addLabels(client, pullNumber, [label]);
}

main();