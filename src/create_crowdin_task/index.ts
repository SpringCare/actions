import {ProjectsGroups, SourceFiles, Tasks} from '@crowdin/crowdin-api-client';
import {addLabels, getLabels, removeLabel} from '../utils/labeler';
import {GitHub} from '@actions/github';

const core = require('@actions/core');
const github = require('@actions/github');
const crowdin = require('@crowdin/crowdin-api-client');

enum labels {
	ManualTranslations = 'Manual Translations Needed',
	InProgress = 'Translations in-progress'
}

interface Sync {
	retry: number;
	label: string;
	failFlag: boolean;
}

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

async function getFileIds(sourceFilesApi: SourceFiles, projectId: number, enLocaleDirId: number, translationFiles: Array<string>): Promise<Array<number>> {
	const files = await sourceFilesApi.listProjectFiles(projectId, {
		directoryId: enLocaleDirId
	});

	return files.data.filter(elem => translationFiles.includes(elem.data.name)).map(elem => elem.data.id);
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

const trackSync = async (branch: string, crowdinAPIs, retry: number, pullNumber: number, translationFiles: Array<string> ,label = labels.ManualTranslations): Promise<Sync> => {
	const {
		projectsGroupsApi,
		sourceFilesApi,
		tasksApi
	} = crowdinAPIs;

	const branchName = '[SpringCare.arceus] ' + branch.replace('/', '.');
	const projectId = await getProjectId(projectsGroupsApi);
	const branchId = await getBranchId(sourceFilesApi, projectId, branchName);
	const enLocaleDirId = await getEnDirectoryId(sourceFilesApi, projectId, branchId);

	const filesIds = await getFileIds(sourceFilesApi, projectId, enLocaleDirId, translationFiles);

	const languages = await getTargetLanguages(projectsGroupsApi);

	let failFlag = false;

	try {
		await createTask(tasksApi, projectId, filesIds, languages, pullNumber);
		label = labels.InProgress;
		retry = 0;
	} catch (e) {
		if (e.message === 'Language has no unapproved words')
			retry--;
		else {
			retry = 0;
			failFlag = true;
		}
	}
	return {retry, label, failFlag};
};

async function addLabelstoPR(client: GitHub, pullNumber: number, label: string): Promise<void> {
	const existingLabels = await getLabels(client, pullNumber);

	if (label === labels.InProgress && existingLabels.includes(labels.ManualTranslations)) {
		await removeLabel(client, pullNumber, labels.ManualTranslations);
	} else if (label === labels.ManualTranslations && existingLabels.includes(labels.InProgress)) {
		label = labels.InProgress;
	}

	await addLabels(client, pullNumber, [label]);
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
		branch: string;
		retry: number;
		crowdinToken: string;
		changedFiles: string;
	} = {
		token        : core.getInput('repo-token', {required: true}),
		branch       : core.getInput('branch'),
		retry        : core.getInput('retry', {required: true}),
		crowdinToken : core.getInput('crowdin-token', {required: true}),
		changedFiles : core.getInput('changed-files', {required: true}),
	};
	const crowdinAPIs = new crowdin.default({token: inputs.crowdinToken});

	const client = new github.GitHub(inputs.token);
	const pullNumber = github.context.payload.pull_request.number;
	const translationFiles = Object.keys(JSON.parse(inputs.changedFiles));

	let label;
	let retry = inputs.retry;
	let failFlag;

	while (retry > 0) {
		const sync = await trackSync(inputs.branch, crowdinAPIs, retry, pullNumber, translationFiles);
		retry = sync.retry;
		label = sync.label;
		failFlag = sync.failFlag;
		if (retry > 0) {
			await sleep(2 * 60 * 1000);
		}
	}

	await addLabelstoPR(client, pullNumber, label);

	failFlag && core.setFailed(label);
}

main();