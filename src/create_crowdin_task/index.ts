import {ProjectsGroups, SourceFiles} from '@crowdin/crowdin-api-client';

const core = require('@actions/core');
const github = require('@actions/github');
const crowdin = require('@crowdin/crowdin-api-client');

import { Octokit } from '@octokit/core';

async function getProjectId(projectsGroupsApi: ProjectsGroups): Promise<number> {
	const response = await projectsGroupsApi.listProjects();
	return response.data[0].data.id;
}

async function getEnDirectoryId(projectId: number, sourceFilesApi: SourceFiles): Promise<number> {
	console.log(projectId);
	const cherrimResponse = await sourceFilesApi.listProjectDirectories(projectId, { filter: 'cherrim' });
	const cherrimDirectoryId = cherrimResponse.data[0].data.id;

	const enResponse = await sourceFilesApi.listProjectDirectories(projectId, {
		directoryId: cherrimDirectoryId, filter: 'en', recursion: 'true'
	});
	return enResponse.data[0].data.id;
}

async function main (): Promise<void> {
	const inputs: {
		token: string;
	} = {
		token         : core.getInput('repo-token', { required: true }),
	};

	const octokit = new Octokit({ auth: inputs.token });

	// Todo: get the token from the env variable
	const token = '';
	const { sourceFilesApi,
		projectsGroupsApi,
		tasksApi
	} = new crowdin.default({ token });

	const projectId = await getProjectId(projectsGroupsApi);
	const enLocaleDirId = await getEnDirectoryId(projectId, sourceFilesApi);

	const filesResponse = await sourceFilesApi.listProjectFiles(projectId, {
		directoryId: enLocaleDirId
	});

	// Todo: get changed files
	// extract file ids from files
	// What if?
	//	- output changed files from translation diff action using `setOutput`
	//	- filter out only the changed files

	// Todo: create task for changed files
	// check with updatedAt

	// loop
	const response = await tasksApi.addTask(projectId, {
		fileIds: filesIds,
		languageId: 'fr',
		type: 0,
		title: 'SH Internal Task',
	});
}

main();