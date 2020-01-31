module.exports = {
	'parser': '@typescript-eslint/parser',
	'env': {
		'commonjs': true,
		'es6': true,
		'node': true
	},
	plugins: [
		'@typescript-eslint',
	],
	'extends': [
		'eslint:recommended',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
	],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parserOptions': {
		'ecmaVersion': 2018,
		"sourceType": "module",
	},
	'rules': {
		'indent': [
			'error',
			'tab'
		],
		'linebreak-style': [
			'error',
			'unix'
		],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		]
	}
};