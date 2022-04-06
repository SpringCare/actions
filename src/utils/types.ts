export interface PRLabelerInputs {
    token: string;
	requiredReviews: number;
	labelWIP: boolean;
	branch: string;
	label: string;
	color: string;
}

export interface BranchLabelerInputs {
    token: string;
	branch: string;
	label: string;
	color: string;
}

export interface Client {
    issues: any;
}

interface Head {
	sha: string;
}

export interface Label {
	name: string;
}
export interface Pr {
	number: number;
	title: string;
	head: Head;
	commits_url: string;
	labels: Array<Label>;
    draft: boolean;
}

export interface Repository {
    owner: string;
    repo: string;
}

interface Author {
    name: string;
}

interface CommitMetaData {
    author: Author;
}

export interface Commit {
    sha: string;
    commit: CommitMetaData;
    parents: Array<Commit>;
}