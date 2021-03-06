import inquirer from "inquirer";
import chalk from "chalk";

import { validateName } from "./utils.js";

export default async () => {
	const packageNameQuestion = {
		filter: (answer) => answer.trim(),
		message: chalk.green("📦\u{200D} Enter the new package name:"),
		name: "projectName",
		type: "input",
		validate: validateName,
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
		ci: "ci",
		eslint: "eslint",
		install: "install",
	};
	const extrasQuestion = {
		choices: [
			{ checked: true, name: "Include CI config", value: Extras.ci },
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
		ci: extras.includes(Extras.ci),
	};
};
