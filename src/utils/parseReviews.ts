export function parseReviews(reviews = []): Array<{state: string; user: string}> {
	//TODO: Add argument for states to care about

	// grab the data we care about
	const parsed = reviews.map(r => ({
		state     : r.state,
		user      : r.user.id,
		submitted : new Date(r.submitted_at),
	}));

	const data = {};

	// group reviews by review author, and only keep the newest review
	parsed.forEach((p) => {
		// we only care about reviews that are approved or denied.
		if (p.state.toLowerCase() !== 'approved' && p.state.toLowerCase() !== 'changes_requested') {
			return;
		}

		// Check if the new item was submitted AFTER
		// the already saved review.  If it was, overwrite
		if (data[p.user]) {
			const submitted = data[p.user].submitted;
			data[p.user] = submitted > p.submitted ? data[p.user] : p;
		} else {
			data[p.user] = p;
		}
	});

	return Object.keys(data).map(k => data[k]);
}