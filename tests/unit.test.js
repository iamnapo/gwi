import test from 'ava';
import meow from 'meow';
import nock from 'nock';
import checkArgs from '../src/args';
import tasks from '../src/tasks';
import utils from '../src/utils';

const pretendLatestVersionIs = (version) => {
  nock.disableNetConnect();
  nock('https://registry.npmjs.org:443').get('/gwi').reply(200, {
    'dist-tags': { latest: version },
    name: 'gwi',
    versions: { [version]: { version } },
  });
};

test('doesn\'t error if not outdated', async (t) => {
  t.plan(2);
  const currentVersion = meow('').pkg.version;
  t.true(typeof currentVersion === 'string');
  pretendLatestVersionIs(currentVersion);
  process.argv = [
    'path/to/node',
    'path/to/gwi',
    'example-project',
  ];
  await t.notThrows(checkArgs());
});

test('doesn\'t error if update-notifier fails', async (t) => {
  t.plan(1);
  nock.disableNetConnect();
  nock('https://registry.npmjs.org:443').get('/gwi').reply(404, {});
  process.argv = [
    'path/to/node',
    'path/to/gwi',
    'example-project',
  ];
  await t.notThrows(checkArgs());
});

test('checkArgs returns the right options', async (t) => {
  pretendLatestVersionIs('1.0.0');
  process.argv = [
    'path/to/node',
    'path/to/gwi',
    'example-project',
    '-description "example description"',
    '--travis',
    '--yarn',
    '--no-xo',
    '--no-install',
  ];
  const opts = await checkArgs();
  const currentVersion = meow('').pkg.version;
  t.deepEqual(opts, {
    description: '',
    install: false,
    projectName: 'example-project',
    runner: utils.RUNNER.YARN,
    starterVersion: currentVersion,
    travis: true,
    xo: false,
  });
});

test('checkArgs always returns a GwiRequiredConfig, even in interactive mode', async (t) => {
  pretendLatestVersionIs('1.0.0');
  process.argv = ['path/to/node', 'path/to/gwi'];
  const opts = await checkArgs();
  t.is(typeof opts.install, 'boolean');
  t.is(typeof opts.starterVersion, 'string');
});

test('only accepts valid package names', async (t) => {
  await t.true(utils.validateName('package-name'));
  await t.true(utils.validateName('package-name-2'));
  await t.true(utils.validateName('@example/package-name-2'));
});

const mockErr = code => () => {
  const err = new Error();
  err.code = code;
  throw err;
};

test('tasks.cloneRepo: errors when Git is not installed on PATH', async (t) => {
  t.plan(2);
  const error = await t.throws(tasks.cloneRepo(mockErr('ENOENT'))({ repo: 'r', branch: 'b' }, 'd', 'p'));
  t.regex(error.message, /Git is not installed on your PATH/);
});

test('tasks.cloneRepo: throws when clone fails', async (t) => {
  t.plan(2);
  const error = await t.throws(tasks.cloneRepo(mockErr(128))({ repo: 'r', branch: 'b' }, 'd', 'p'));
  t.regex(error.message, /Git clone failed\./);
});

test('tasks.cloneRepo: throws when rev-parse fails', async (t) => {
  let calls = 0;
  const mock = async () => {
    calls += 1;
    return calls === 1 ? {} : mockErr(128)();
  };
  t.plan(2);
  const error = await t.throws(tasks.cloneRepo(mock)({ repo: 'r', branch: 'b' }, 'd', 'p'));
  t.regex(error.message, /Git rev-parse failed\./);
});

test('tasks.getGithubUsername: returns found users', async (t) => {
  const mockFetcher = async email => email.split('@')[0];
  const username = await tasks.getGithubUsername(mockFetcher)('iamnapo@github.com');
  t.is(username, 'iamnapo');
});

test('tasks.getGithubUsername: returns placeholder if user doesn\'t have Git user.email set', async (t) => {
  const mockFetcher = async () => {};
  const username = await tasks.getGithubUsername(mockFetcher)(tasks.PLACEHOLDERS.EMAIL);
  t.is(username, tasks.PLACEHOLDERS.USERNAME);
});

test('tasks.getGithubUsername: returns placeholder if not found', async (t) => {
  const mockFetcher = async () => {
    throw new Error('An error');
  };
  const username = await tasks.getGithubUsername(mockFetcher)('iamnapo@github.com');
  t.is(username, tasks.PLACEHOLDERS.USERNAME);
});

test('tasks.getUserInfo: suppresses errors and returns empty strings', async (t) => {
  const result = await tasks.getUserInfo(mockErr(1))();
  t.deepEqual(result, {
    gitEmail: tasks.PLACEHOLDERS.EMAIL,
    gitName: tasks.PLACEHOLDERS.NAME,
  });
});

test('tasks.getUserInfo: returns results properly', async (t) => {
  const mock = async () => ({ stdout: 'result' });
  const result = await tasks.getUserInfo(mock)();
  t.deepEqual(result, {
    gitEmail: 'result',
    gitName: 'result',
  });
});

test('tasks.initialCommit: throws generated errors', async (t) => {
  t.plan(2);
  const error = await t.throws(tasks.initialCommit(mockErr(1))('deadbeef', 'fail'));
  t.is(error.code, 1);
});

test('tasks.initialCommit: spawns 3 times', async (t) => {
  t.plan(6);
  const error = await t.throws(tasks.initialCommit(mockErr(1))('deadbeef', 'fail'));
  t.is(error.code, 1);
  const mock = async () => {
    t.pass();
  };
  await t.notThrows(tasks.initialCommit(mock)('commit', 'dir'));
});

test('tasks.install: uses the correct runner', async (t) => {
  const mock = async runner => t.is(runner, utils.RUNNER.YARN);
  await tasks.install(mock)(utils.RUNNER.YARN, 'pass');
});

test('tasks.install: throws pretty error on failure', async (t) => {
  t.plan(2);
  const error = await t.throws(tasks.install(mockErr())(utils.RUNNER.NPM, 'fail'));
  t.regex(error.message, /Installation failed\. You'll need to install manually\./);
});

test('tasks.getRepoInfo: returns defaults when GWI_REPO_URL/BRANCH aren\'t set', async (t) => {
  const thisRelease = '9000.0.1';
  t.deepEqual(tasks.getRepoInfo(thisRelease), {
    branch: `v${thisRelease}`,
    repo: 'https://github.com/iamnapo/gwi.git',
  });
  const url = 'https://another/repo';
  process.env.GWI_REPO_URL = url;
  t.deepEqual(await tasks.getRepoInfo(thisRelease), {
    branch: 'master',
    repo: url,
  });
  const branch = 'test';
  process.env.GWI_REPO_BRANCH = branch;
  t.deepEqual(await tasks.getRepoInfo(thisRelease), {
    branch,
    repo: url,
  });
});
