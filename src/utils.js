const fs = require('fs');
const gradient = require('gradient-string');
const validateNpmPackageName = require('validate-npm-package-name');
const chalk = require('chalk');

const RUNNER = {
	NPM: 'npm',
	YARN: 'yarn',
};

class GwiCLIOptions {
	constructor() {
		this.description = '';
		this.install = '';
		this.projectName = '';
		this.runner = '';
		this.travis = '';
	}
}

class GwiRequiredConfig {
	constructor() {
		this.starterVersion = '';
		this.install = '';
	}
}

class GwiInferredOptions {
	constructor() {
		this.githubUsername = '';
		this.fullName = '';
		this.email = '';
		this.repoInfo = {
			repo: '',
			branch: '',
		};
		this.workingDirectory = '';
	}
}

class GwiOptions {
	constructor() {
		this.description = '';
		this.install = '';
		this.projectName = '';
		this.runner = '';
		this.travis = '';
		this.githubUsername = '';
		this.fullName = '';
		this.email = '';
		this.repoInfo = {
			repo: '',
			branch: '',
		};
		this.workingDirectory = '';
	}
}

function hasCLIOptions(opts) {
	return opts.projectName !== undefined;
}

function validateName(input) {
	if (!validateNpmPackageName(input).validForNewPackages) return 'Name should be in-kebab-case.';
	if (fs.existsSync(input)) return `The "${input}" path already exists in this directory.`;
	return true;
}

function getIntro() {
	const ascii = `
  ________ .__   __             __      __ .__   __   .__              .___   __   
 /  _____/ |__|_/  |_          /  \\    /  \\|__|_/  |_ |  |__           |   |_/  |_ 
/   \\  ___ |  |\\   __\\  ______ \\   \\/\\/   /|  |\\   __\\|  |  \\   ______ |   |\\   __\\
\\    \\_\\  \\|  | |  |   /_____/  \\        / |  | |  |  |   Y  \\ /_____/ |   | |  |  
 \\______  /|__| |__|             \\__/\\  /  |__| |__|  |___|  /         |___| |__|  
        \\/                            \\/                   \\/                      
	`;

	return chalk.bold(gradient.mind(ascii));
}

module.exports = {
	RUNNER,
	GwiCLIOptions,
	GwiRequiredConfig,
	GwiInferredOptions,
	GwiOptions,
	hasCLIOptions,
	validateName,
	getIntro,
};
