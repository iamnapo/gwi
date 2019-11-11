const fs = require("fs");
const Path = require("path");
const chalk = require("chalk");
const del = require("del");
const ora = require("ora");
const replace = require("replace-in-file");
const execa = require("execa");
const tasks = require("./tasks");

module.exports = async (
	{
		description,
		email,
		fullName,
		githubUsername,
		install,
		projectName,
		repoInfo,
		runner,
		travis,
		workingDirectory,
		eslint,
	},
	taskss,
) => {
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
	const projectPath = Path.join(workingDirectory, projectName);
	const pkgPath = Path.join(projectPath, "package.json");
	const keptDevDeps = ["ava", "nyc", "husky"];
	if (eslint) {
		keptDevDeps.push("babel-eslint", "eslint", "eslint-config-airbnb", "eslint-config-iamnapo", "eslint-plugin-import",
			"eslint-plugin-jsx-a11y", "eslint-plugin-react", "eslint-plugin-react-hooks");
	}
	const keptDeps = [];
	const filterAllBut = (keep, from) => keep.reduce((acc, moduleName) => ({ ...acc, [moduleName]: from[moduleName] }), {});
	const readPackageJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
	const pkg = readPackageJson(pkgPath);
	const newPkg = {
		...pkg,
		name: projectName,
		version: "0.1.0",
		description,
		scripts: {
			...(eslint ? { lint: "eslint ." } : {}),
			start: "node ./bin/gwi.js",
			test: eslint ? "npm run lint && nyc ava" : "nyc ava",
		},
		husky: { hooks: { "pre-commit": `${runner} test` } },
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
	};
	delete newPkg.bin;

	const writePackageJson = (path, pakg) => {
		const stringified = `${JSON.stringify(pakg, null, 2)}\n`;
		return fs.writeFileSync(path, stringified);
	};
	writePackageJson(pkgPath, newPkg);
	await replace({
		files: Path.join(projectPath, "package.json"),
		from: [/\.\/bin\/gwi/g, /gwi/g, /iamnapo/g],
		to: [projectName, projectName, githubUsername],
	});
	spinnerPackage.succeed();

	const spinnerLicense = ora("Updating LICENSE").start();
	if (!masterIsHere) {
		await replace({
			files: Path.join(projectPath, "LICENSE"),
			from: ["Napoleon-Christos Oikonomou", "napoleonoikon@gmail.com", "iamnapo.me"],
			to: [fullName, email, `github.com/${githubUsername}`],
		});
	}
	spinnerLicense.succeed();

	const spinnerReadme = ora("Updating README.md").start();
	await replace({ files: Path.join(projectPath, "README.md"), from: /\n## A.*\n\n.*\n/g, to: "" });
	await replace({ files: Path.join(projectPath, "README.md"), from: / \[!\[G.*/g, to: "" });
	await replace({ files: Path.join(projectPath, "README.md"), from: /\[!\[n.*gwi\) /g, to: "" });
	if (!travis) {
		await replace({ files: Path.join(projectPath, "README.md"), from: /\[!.*gwi\) /g, to: "" });
	}
	if (!masterIsHere) {
		await replace({
			files: Path.join(projectPath, "README.md"),
			from: ["Napoleon-Christos Oikonomou", "napoleonoikon@gmail.com", "iamnapo.me"],
			to: [fullName, email, `github.com/${githubUsername}`],
		});
	}
	await replace({ files: Path.join(projectPath, "README.md"), from: [/gwi/g, /iamnapo/g], to: [projectName, githubUsername] });
	await replace({
		files: Path.join(projectPath, "README.md"),
		from: ["Interactive CLI for creating new JS repositories", "![Usage](usage.gif)"],
		to: [description, `\`\`\`\n$ ${projectName}\n\`\`\``],
	});
	spinnerReadme.succeed();

	if (travis) {
		const spinnerTravis = ora("Updating .travis.yml").start();
		await replace({ files: Path.join(projectPath, ".travis.yml"), from: [/npm/g, /^after.*\n.*codecov/g], to: [runner, ""] });
		spinnerTravis.succeed();
	}

	const spinnerDelete = ora("Deleting unnecessary files").start();
	await del([
		`${Path.join(projectPath, "src")}/*`,
		`${Path.join(projectPath, "tests")}/*`,
		`${Path.join(projectPath, "bin")}`,
		`${Path.join(projectPath, ".npmignore")}`,
		`${Path.join(projectPath, "usage.gif")}`,
		`${Path.join(projectPath, "yarn.lock")}`,
		`${Path.join(projectPath, ".github")}`,
	]);
	if (!travis) del([Path.join(projectPath, ".travis.yml")]);
	fs.renameSync(Path.join(projectPath, "index.js"), Path.join(projectPath, `${projectName}.js`));
	fs.writeFileSync(Path.join(projectPath, "tests", "unit.test.js"), "import test from 'ava';\n\ntest.todo('main');\n");
	spinnerDelete.succeed();

	if (install) {
		const installDeps = ora("Installing dependencies").start();
		await taskss.install(runner, projectPath);
		installDeps.succeed();
	}

	const gitIsConfigured = Boolean(fullName !== tasks.PLACEHOLDERS.NAME && email !== tasks.PLACEHOLDERS.EMAIL);
	if (gitIsConfigured) {
		const spinnerGitInit = ora("Initializing git").start();
		if (masterIsHere) {
			await execa("git", ["init"], { cwd: projectPath, encoding: "utf8", stdio: "pipe" });
		} else {
			await taskss.initialCommit(commitHash, projectPath, fullName);
		}
		spinnerGitInit.succeed();
	}

	console.log(`\n${chalk.blue.bold(`Created ${projectName}. 🎉`)}\n`);
};
