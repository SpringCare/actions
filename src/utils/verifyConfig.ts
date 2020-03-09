import * as core from '@actions/core';

module.exports = function(): {} {
	const repo = process.env.GITHUB_REPOSITORY,
		ref = process.env.GITHUB_REF;

	if (!repo) {
		core.setFailed(
			'GITHUB_REPOSITORY missing, must be set to "<repo owner>/<repo name>"'
		);
		return;
	}

	if (!ref) {
		core.setFailed(
			'GITHUB_REF missing, must be set to the repository\'s default branch'
		);
		return;
	}

	return {
		repo,
		ref
	};
};