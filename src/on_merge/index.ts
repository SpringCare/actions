const github = require('@actions/github');

function main(): void {
	const baseRef = github.base_ref;
	const description = github.context.payload.pull_request.body;
	const ref = github.ref;
	const headRef = github.head_ref;
	const workflow = github.workflow;

	console.log('baseRef: ', baseRef);
	console.log('body text: ', description);
	console.log('ref: ', ref);
	console.log('headRef: ', headRef);
	console.log(workflow);
}

// Call the main function.
main();


// 1. Get target branch (staging || master)
// 2. Determine target PT workflow change (finish || deliver)
// 3. Parse link from PR body (PT Ticket ###)
// 4. Setup PT Connection
// a. Update PT Ticket ### with new workflow (finish || deliver)
