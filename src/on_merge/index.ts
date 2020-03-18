const github = require('@actions/github');

function main(): void {
	const targetBranch = github.context.ref;
	const text = github.context.payload.pull_request.body;

	console.log('target branch: ', targetBranch);
	console.log('body text: ', text);


	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const urls = text.match(urlRegex);

	console.log('urls: ', urls);


	// pivotalTrackerCall(url);

}

// Call the main function.
main();


// function pivotalTrackerCall(url) {
// 	console.log(url);
// }


// 1. Get target branch (staging || master)
// 2. Determine target PT workflow change (finish || deliver)
// 3. Parse link from PR body (PT Ticket ###)
// 4. Setup PT Connection
// a. Update PT Ticket ### with new workflow (finish || deliver)



// PUT /projects/2428649/stories/{story_id}
// current_state -> accepted, delivered, finished
// axios