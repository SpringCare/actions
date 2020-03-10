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
		'sourceType': 'module',
	},
	'rules': {
		'@typescript-eslint/no-var-requires': 0,
		'@typescript-eslint/camelcase': 0,
		'no-trailing-spaces': 'error',
		'no-mixed-spaces-and-tabs': 'error',
		'indent': ['error', 'tab', { 'SwitchCase': 1, 'ArrayExpression': 'first' }],
		'linebreak-style': [
			'error',
			'unix'
		],
		'operator-linebreak': ['error', 'after'],
		'quotes': [
			'error',
			'single'
		],
		'semi': [
			'error',
			'always'
		],
		'key-spacing': [
			1,
			{
				'singleLine': {
					'beforeColon': false,
					'afterColon': true
				},
				'multiLine': {
					'mode': 'strict',
					'beforeColon': false,
					'afterColon': true,
					'align': {
						'on': 'colon',
						'beforeColon': true,
						'afterColon': true
					}
				}
			}
		],
		'no-multi-spaces': [
			'error',
			{
				'ignoreEOLComments': true,
			}
		],
	}
};