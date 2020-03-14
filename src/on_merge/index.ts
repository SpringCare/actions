const github = require('@actions/github');

function main(): void {
	const targetBranch = github.context.context.ref;
	const description = github.context.payload.pull_request.body;

	console.log('target branch: ', targetBranch);
	console.log('body text: ', description);
}

// Call the main function.
main();


// 1. Get target branch (staging || master)
// 2. Determine target PT workflow change (finish || deliver)
// 3. Parse link from PR body (PT Ticket ###)
// 4. Setup PT Connection
// a. Update PT Ticket ### with new workflow (finish || deliver)
