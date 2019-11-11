const inquirer = require("inquirer");
const chalk = require("chalk");
const utils = require("./utils");

module.exports = async () => {
	const packageNameQuestion = {
		filter: (answer) => answer.trim(),
		message: chalk.green("📦\u{200D} Enter the new package name:"),
		name: "projectName",
		type: "input",
		validate: utils.validateName,
	};

	const packageDescriptionQuestion = {
		filter: (answer) => answer.trim(),
		message: chalk.green("💭\u{200D} Enter the package description:"),
		name: "description",
		type: "input",
		validate: (answer) => answer.length > 0,
	};

	const runnerQuestion = {
		choices: [{ name: "npm", value: "npm" }, { name: "yarn", value: "yarn" }],
		message: chalk.green("⛵\u{200D} Will this project use yarn or npm?"),
		name: "runner",
		type: "list",
	};

	const Extras = {
		travis: "travis",
		eslint: "eslint",
		install: "install",
	};
	const extrasQuestion = {
		choices: [
			{ checked: false, name: "Include Travis CI config", value: Extras.travis },
			{ checked: true, name: "Include eslint", value: Extras.eslint },
			{ checked: true, name: "Install default dependencies", value: Extras.install },
		],
		message: chalk.green("🐳\u{200D}\u{200D} Extra stuff:"),
		name: "extras",
		type: "checkbox",
	};

	const answers = await inquirer.prompt([packageNameQuestion, packageDescriptionQuestion, runnerQuestion, extrasQuestion]);
	const { description, extras, projectName, runner } = answers;
	return {
		description,
		install: extras.includes(Extras.install),
		eslint: extras.includes(Extras.eslint),
		projectName,
		runner,
		travis: extras.includes(Extras.travis),
	};
};
