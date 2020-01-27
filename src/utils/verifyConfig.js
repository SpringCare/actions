const core = require('@actions/core');

module.exports = function() {
	const token = process.env.GITHUB_TOKEN,
		repo = process.env.GITHUB_REPOSITORY,
		ref = process.env.GITHUB_REF;

	if (!token) {
		core.setFailed(
			`GITHUB_TOKEN is not configured. Make sure you made it available to your action
			env:
				GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`
		);
		return;
	}

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
		token,
		repo,
		ref
	};
}