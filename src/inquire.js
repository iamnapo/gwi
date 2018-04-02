const inquirer = require('inquirer');
const chalk = require('chalk');
const utils = require('./utils');

module.exports = async () => {
	const packageNameQuestion = {
		filter: answer => answer.trim(),
		message: chalk.green('📦\u{200D}\u{200D} Enter the new package name:'),
		name: 'projectName',
		type: 'input',
		validate: utils.validateName
	};

	const packageDescriptionQuestion = {
		filter: answer => answer.trim(),
		message: chalk.green('💭\u{200D}\u{200D} Enter the package description:'),
		name: 'description',
		type: 'input',
		validate: answer => answer.length > 0
	};

	const runnerQuestion = {
		choices: [
			{name: 'yarn', value: utils.RUNNER.YARN},
			{name: 'npm', value: utils.RUNNER.NPM}
		],
		message: chalk.green('⛵\u{200D}\u{200D} Will this project use yarn or npm?'),
		name: 'runner',
		type: 'list'
	};

	const Extras = {
		travis: 'travis',
		xo: 'xo',
		install: 'install'
	};
	const extrasQuestion = {
		choices: [
			{
				checked: false,
				name: 'Include Travis CI config',
				value: Extras.travis
			},
			{
				checked: true,
				name: 'Include xo support',
				value: Extras.xo
			},
			{
				checked: true,
				name: 'Install default dependencies',
				value: Extras.install
			}
		],
		message: chalk.green('🐳\u{200D}\u{200D} Extra stuff:'),
		name: 'extras',
		type: 'checkbox'
	};

	const answers = await inquirer.prompt([
		packageNameQuestion,
		packageDescriptionQuestion,
		runnerQuestion,
		extrasQuestion
	]);
	const {
		description,
		extras,
		projectName,
		runner
	} = answers;
	return {
		description,
		install: extras.includes(Extras.install),
		xo: extras.includes(Extras.xo),
		projectName,
		runner,
		travis: extras.includes(Extras.travis)
	};
};
