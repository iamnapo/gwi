import fs from "node:fs";
import path from "node:path";

import chalk from "chalk";
import del from "del";
import ora from "ora";
import replace from "replace-in-file";
import execa from "execa";

import { PLACEHOLDERS } from "./tasks.js";

const filterAllBut = (keep, from) => keep.reduce((acc, moduleName) => ({ ...acc, [moduleName]: from[moduleName] }), {});

export default async ({
	description,
	email,
	fullName,
	githubUsername,
	install,
	projectName,
	repoInfo,
	runner,
	ci,
	workingDirectory,
	eslint,
}, taskss) => {
	let masterIsHere = false;
	if (githubUsername === "iamnapo") {
		console.log(chalk.redBright.dim("  🔱  Welcome back, master."));
		masterIsHere = true;
	}
	const clonePackage = ora("Cloning default repository.").start();
	const { commitHash, gitHistoryDir } = await taskss.cloneRepo(repoInfo, workingDirectory, projectName);
	await del([gitHistoryDir]);
	clonePackage.succeed(`Cloning default repository. ${chalk.dim(`Cloned at commit: ${commitHash}`)}`);

	const spinnerPackage = ora("Updating package.json").start();
	const projectPath = path.join(workingDirectory, projectName);
	const pkgPath = path.join(projectPath, "package.json");
	const keptDevDeps = ["ava", "c8"];
	if (eslint) keptDevDeps.push("eslint", "eslint-config-iamnapo", "eslint-plugin-import", "eslint-plugin-unicorn");
	const keptDeps = [];
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	const newPkg = {
		...pkg,
		name: projectName,
		version: "0.1.0",
		description,
		private: true,
		scripts: {
			...(eslint ? { lint: "eslint . --cache" } : {}),
			start: "node index.js",
			test: eslint ? `${runner === "npm" ? "npm run" : "yarn"} lint && c8 ava` : "c8 ava",
		},
		repository: `github:${githubUsername}/${projectName}`,
		author: {
			...pkg.author,
			name: masterIsHere ? "Napoleon-Christos Oikonomou" : fullName,
			email,
			url: masterIsHere ? "https://iamnapo.me" : `https://github.com/${githubUsername}`,
		},
		dependencies: filterAllBut(keptDeps, pkg.dependencies),
		devDependencies: filterAllBut(keptDevDeps, pkg.devDependencies),
		keywords: [],
		files: ["src", "index.js"],
		exports: "./index.js",
	};
	delete newPkg.bin;
	if (!eslint) delete newPkg.eslintConfig;

	fs.writeFileSync(pkgPath, `${JSON.stringify(newPkg, null, 2)}\n`);
	await replace({
		files: path.join(projectPath, "package.json"),
		from: [/gwi/g, /(?<=[^-])iamnapo/g],
		to: [projectName, githubUsername],
	});
	spinnerPackage.succeed();

	const spinnerLicense = ora("Updating LICENSE").start();
	await replace({
		files: path.join(projectPath, "LICENSE"),
		from: ["Napoleon-Christos Oikonomou", "napoleonoikon@gmail.com", "iamnapo.me"],
		to: [
			masterIsHere ? "Napoleon-Christos Oikonomou" : fullName,
			email,
			masterIsHere ? "https://iamnapo.me" : `https://github.com/${githubUsername}`,
		],
	});
	spinnerLicense.succeed();

	const spinnerReadme = ora("Updating README.md").start();
	await replace({ files: path.join(projectPath, "README.md"), from: /\[!\[n.*gwi\) /g, to: "" });
	await replace({ files: path.join(projectPath, "README.md"), from: [/gwi/g, /iamnapo/g], to: [projectName, githubUsername] });
	await replace({
		files: path.join(projectPath, "README.md"),
		from: ["Interactive CLI for creating new JS repositories", "![Usage](usage.gif)", "-g "],
		to: [description, `\`\`\`sh\n$ ${projectName}\n\`\`\``, ""],
	});
	if (!ci) {
		await replace({ files: path.join(projectPath, "README.md"), from: /\[!\[b.*actions\) /g, to: "" });
	}
	spinnerReadme.succeed();

	if (ci) {
		const spinnerCI = ora("Updating CI .yml").start();
		await replace({
			files: path.join(projectPath, ".github", "workflows", "ci.yml"),
			from: [/npm\n/g, /npm(?<! )/g],
			to: [`${runner === "npm" ? "npm i" : "yarn"}\n`, runner],
		});
		spinnerCI.succeed();
	}

	const spinnerDelete = ora("Deleting unnecessary files").start();
	await del([
		`${path.join(projectPath, "src")}/*`,
		`${path.join(projectPath, "tests")}/*`,
		`${path.join(projectPath, "bin")}`,
		`${path.join(projectPath, ".npmignore")}`,
		`${path.join(projectPath, ".npmrc")}`,
		`${path.join(projectPath, "usage.gif")}`,
		`${path.join(projectPath, ".github", "workflows", "publish.yml")}`,
	]);
	if (!ci) del([path.join(projectPath, ".github")]);
	fs.writeFileSync(path.join(projectPath, "tests", "init.test.js"), "import test from \"ava\";\n\ntest.todo(\"main\");\n");
	spinnerDelete.succeed();

	if (install) {
		const installDeps = ora("Installing dependencies").start();
		await taskss.install(runner, projectPath);
		installDeps.succeed();
	}

	const gitIsConfigured = Boolean(fullName !== PLACEHOLDERS.NAME && email !== PLACEHOLDERS.EMAIL);
	if (gitIsConfigured) {
		const spinnerGitInit = ora("Initializing git").start();
		await (masterIsHere ? execa("git", ["init"], { cwd: projectPath, encoding: "utf8", stdio: "pipe" }) : taskss.initialCommit(commitHash, projectPath, fullName));
		spinnerGitInit.succeed();
	}

	console.log(`\n${chalk.blue.bold(`Created ${projectName}. 🎉`)}\n`);
};
