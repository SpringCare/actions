const github = require('@actions/github');

function main(): void {
	const context = github.context;
	console.log(context);
}

// Call the main function.
main();


// 1. Get target branch (staging || master)
// 2. Determine target PT workflow change (finish || deliver)
// 3. Parse link from PR body (PT Ticket ###)
// 4. Setup PT Connection
// a. Update PT Ticket ### with new workflow (finish || deliver)
