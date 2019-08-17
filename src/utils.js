const fs = require("fs");
const gradient = require("gradient-string");
const validateNpmPackageName = require("validate-npm-package-name");
const chalk = require("chalk");

function validateName(input) {
  if (!validateNpmPackageName(input).validForNewPackages) return "Name should be in-kebab-case.";
  if (fs.existsSync(input)) return `The "${input}" path already exists in this directory.`;
  return true;
}

function getIntro(columns) {
  const ascii = `
  ________ .__   __             __      __ .__   __   .__              .___   __
 /  _____/ |__|_/  |_          /  \\    /  \\|__|_/  |_ |  |__           |   |_/  |_
/   \\  ___ |  |\\   __\\  ______ \\   \\/\\/   /|  |\\   __\\|  |  \\   ______ |   |\\   __\\
\\    \\_\\  \\|  | |  |   /_____/  \\        / |  | |  |  |   Y  \\ /_____/ |   | |  |
 \\______  /|__| |__|             \\__/\\  /  |__| |__|  |___|  /         |___| |__|
        \\/                            \\/                   \\/
  `;

  const asciiSmaller = `
  ________.__  __           __      __.__  __  .__            .___  __
 /  _____/|___/  |_        /  \\    /  |___/  |_|  |__         |   _/  |_
/   \\  ___|  \\   __\\ ______\\   \\/\\/   |  \\   __|  |  \\  ______|   \\   __\\
\\    \\_\\  |  ||  |  /_____/ \\        /|  ||  | |   Y  \\/_____/|   ||  |
 \\______  |__||__|           \\__/\\  / |__||__| |___|  /       |___||__|
        \\/                        \\/                \\/
  `;
  if (columns && columns >= 85) return chalk.bold(gradient.mind(ascii));
  if (columns && columns >= 74) return chalk.bold(gradient.mind(asciiSmaller));
  return `\n${chalk.cyan.bold.underline("Git-With-It")}\n`;
}

module.exports = { validateName, getIntro };
