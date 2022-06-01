import {ProjectsGroups} from "@crowdin/crowdin-api-client";

const core = require('@actions/core');
const github = require('@actions/github');
const crowdin = require('@crowdin/crowdin-api-client');

import { Octokit } from '@octokit/core';

function getProjectId(projectsGroupsApi: ProjectsGroups): void {
    const projects = projectsGroupsApi.listProjects();
}

function getEnDirectoryId(projectId: number, sourceFilesApi): void {
    const cheerimDir = sourceFilesApi.listProjectDirectories(projectId);
    // Todo: get cherrim id

    const dirs = sourceFilesApi.listProjectDirectories(480727, {
        directoryId: cherrimId, filter: 'en', recursion: 'true'
    });

    // return data[0].data.id;
}

async function main (): Promise<void> {
    const inputs: {
        token: string;
    } = {
        token         : core.getInput('repo-token', { required: true }),
    };

    const octokit = new Octokit({ auth: inputs.token });

    // Todo: get the token from the env variable
    const token = "";
    const { sourceFilesApi,
        projectsGroupsApi,
        tasksApi
    } = new crowdin.default({ token });

    const projectId = getProjectId(projectsGroupsApi);
    const enLocaleDir = getLocalesDirectoryId(projectId, sourceFilesApi);

    const files = await sourceFilesApi.listProjectFiles(projectId, {
        directoryId: enLocaleDir
    })

    // extract file ids from files

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