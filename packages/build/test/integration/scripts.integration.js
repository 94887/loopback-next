// Copyright IBM Corp. 2018. All Rights Reserved.
// Node module: @loopback/build
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');

describe('build', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(30000);
  const cwd = process.cwd();
  const projectDir = path.resolve(__dirname, './fixtures');

  function cleanup() {
    const run = require('../../bin/run-clean');
    run([
      'node',
      'bin/run-clean',
      'tsconfig.json',
      'tsconfig.build.json',
      'dist*',
      'api-docs',
    ]);
  }

  beforeEach(() => {
    process.chdir(projectDir);
    cleanup();
  });

  afterEach(() => {
    cleanup();
    process.chdir(cwd);
  });

  it('compiles ts files', done => {
    const run = require('../../bin/compile-package');
    const childProcess = run(['node', 'bin/compile-package', 'es2015']);
    childProcess.on('close', code => {
      assert.equal(code, 0);
      assert(
        fs.existsSync(path.join(projectDir, 'dist6')),
        'dist6 should have been created',
      );
      assert(
        fs.existsSync(path.join(projectDir, 'tsconfig.json')),
        'tsconfig.json should have been created',
      );
      const tsConfig = fs.readJSONSync(path.join(projectDir, 'tsconfig.json'));
      assert.equal(tsConfig.extends, '../../../config/tsconfig.common.json');
      done();
    });
  });

  it('honors tsconfig.build.json over tsconfig.json', () => {
    fs.writeJSONSync('tsconfig.build.json', {
      extends: '../../../config/tsconfig.common.json',
      include: ['src', 'test'],
      exclude: ['node_modules/**', 'packages/*/node_modules/**', '**/*.d.ts'],
    });
    fs.writeJSONSync('tsconfig.json', {
      extends: '../../../config/tsconfig.common.json',
      include: ['src', 'test'],
      exclude: ['node_modules/**', 'packages/*/node_modules/**', '**/*.d.ts'],
    });
    const run = require('../../bin/compile-package');
    const command = run(['node', 'bin/compile-package'], true);
    assert(
      command.indexOf('-p tsconfig.build.json') !== -1,
      'project level tsconfig.build.json should be honored',
    );
  });

  it('honors tsconfig.json if tsconfig.build.json is not present', () => {
    fs.writeJSONSync('tsconfig.json', {
      extends: '../../../config/tsconfig.common.json',
      include: ['src', 'test'],
      exclude: ['node_modules/**', 'packages/*/node_modules/**', '**/*.d.ts'],
    });
    const run = require('../../bin/compile-package');
    const command = run(['node', 'bin/compile-package'], true);
    assert(
      command.indexOf('-p tsconfig.json') !== -1,
      'project level tsconfig.json should be honored',
    );
  });

  it('honors -p option for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(
      ['node', 'bin/compile-package', '-p', 'tsconfig.my.json'],
      true,
    );
    assert(
      command.indexOf('-p tsconfig.my.json') !== -1,
      '-p should be honored',
    );
  });

  it('honors --project option for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(
      ['node', 'bin/compile-package', '--project', 'tsconfig.my.json'],
      true,
    );
    assert(
      command.indexOf('--project tsconfig.my.json') !== -1,
      '--project should be honored',
    );
  });

  it('honors --target option for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(
      ['node', 'bin/compile-package', '--target', 'es2015'],
      true,
    );
    assert(
      command.indexOf('--target es2015') !== -1,
      '--target should be honored',
    );
  });

  it('honors no-option as target for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(['node', 'bin/compile-package', 'es2015'], true);
    assert(
      command.indexOf('--target es2015') !== -1,
      '--target should be honored',
    );
  });

  it('honors no-option as target with -p for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(
      ['node', 'bin/compile-package', 'es2015', '-p', 'tsconfig.my.json'],
      true,
    );
    assert(
      command.indexOf('--target es2015') !== -1,
      '--target should be honored',
    );
    assert(
      command.indexOf('-p tsconfig.my.json') !== -1,
      '-p should be honored',
    );
  });

  it('honors --outDir option for tsc', () => {
    const run = require('../../bin/compile-package');
    const command = run(
      ['node', 'bin/compile-package', '--outDir', './dist'],
      true,
    );
    assert(
      command.indexOf('--outDir dist') !== -1,
      '--outDir should be honored',
    );
  });

  it('honors --outDir option for copy-resources', () => {
    var run = require('../../bin/copy-resources');
    var command = run(
      ['node', 'bin/copy-resources', '--outDir', 'dist10'],
      true,
    );
    assert(
      command.indexOf('--outDir dist10') !== -1,
      '--outDir should be honored',
    );
  });

  it('honors --rootDir option for copy-resources', () => {
    var run = require('../../bin/copy-resources');
    var command = run(
      ['node', 'bin/copy-resources', '--rootDir', 'my-src'],
      true,
    );
    assert(
      command.indexOf('--rootDir my-src') !== -1,
      '--rootDir should be honored',
    );
  });

  it('generates apidocs', done => {
    const run = require('../../bin/generate-apidocs');
    const childProcess = run(['node', 'bin/generate-apidocs'], {
      stdio: [process.stdin, 'ignore', process.stderr],
    });
    childProcess.on('close', code => {
      assert.equal(code, 0);
      assert(
        fs.existsSync(path.join(projectDir, 'api-docs')),
        'api-docs should have been created',
      );
      let typedocDir = require.resolve('typedoc/package.json');
      typedocDir = path.resolve(typedocDir, '..');
      assert(
        !fs.existsSync(path.join(typedocDir, './node_modules/typescript')),
        'typedoc local dependency of typescript should have been renamed',
      );
      assert(
        !fs.existsSync(
          path.join(typedocDir, './node_modules/.bin/tsc'),
          'typedoc local scripts from typescript should have been removed',
        ),
      );
      done();
    });
  });

  it('honors --tsconfig for apidocs', () => {
    const run = require('../../bin/generate-apidocs');
    const command = run(
      ['node', 'bin/generate-apidocs', '--tsconfig', 'tsconfig.my.json'],
      true,
    );
    assert(
      command.indexOf('--tsconfig tsconfig.my.json') !== -1,
      '--tsconfig should be honored',
    );
  });

  it('honors --tstarget for apidocs', () => {
    const run = require('../../bin/generate-apidocs');
    const command = run(
      ['node', 'bin/generate-apidocs', '--tstarget', 'es2017'],
      true,
    );
    assert(
      command.indexOf('--tstarget es2017') !== -1,
      '--tstarget should be honored',
    );
  });

  it('honors --skip-public-assets for apidocs', () => {
    const run = require('../../bin/generate-apidocs');
    const command = run(
      ['node', 'bin/generate-apidocs', '--skip-public-assets'],
      true,
    );
    assert(
      command.indexOf('--skip-public-assets') !== -1,
      '--skip-public-assets should be honored',
    );
  });

  it('honors --html-file for apidocs', () => {
    const run = require('../../bin/generate-apidocs');
    const command = run(
      ['node', 'bin/generate-apidocs', '--html-file=my.html'],
      true,
    );
    assert(
      command.indexOf('--html-file=my.html') !== -1,
      '--html-file should be honored',
    );
  });

  it('runs tslint against ts files', done => {
    const run = require('../../bin/run-tslint');
    const childProcess = run(['node', 'bin/run-tslint']);
    childProcess.on('close', code => {
      assert.equal(code, 0);
      done();
    });
  });

  it('honors -c option for tslint', () => {
    const run = require('../../bin/run-tslint');
    const command = run(
      ['node', 'bin/un-tslint', '-c', 'tslint.my.json'],
      true,
    );
    assert(command.indexOf('-c tslint.my.json') !== -1, '-c should be honored');
  });

  it('honors --config option for tslint', () => {
    const run = require('../../bin/run-tslint');
    const command = run(
      ['node', 'bin/un-tslint', '--config', 'tslint.my.json'],
      true,
    );
    assert(
      command.indexOf('--config tslint.my.json') !== -1,
      '--config should be honored',
    );
  });

  it('honors -p option for tslint', () => {
    const run = require('../../bin/run-tslint');
    const command = run(
      ['node', 'bin/un-tslint', '-p', 'tsonfig.my.json'],
      true,
    );
    assert(command.indexOf('-p tsonfig') !== -1, '-p should be honored');
  });

  it('honors --project option for tslint', () => {
    const run = require('../../bin/run-tslint');
    const command = run(
      ['node', 'bin/run-tslint', '--project', 'tsonfig.my.json'],
      true,
    );
    assert(
      command.indexOf('--project tsonfig') !== -1,
      '--project should be honored',
    );
  });

  it('runs prettier against ts files', done => {
    const run = require('../../bin/run-prettier');
    const childProcess = run(
      ['node', 'bin/run-prettier', '**/src/*.ts', '--', '-l'],
      {
        stdio: [process.stdin, 'ignore', process.stderr],
      },
    );
    childProcess.on('close', code => {
      assert.equal(code, 0);
      done();
    });
  });

  it('removes directories/files', () => {
    const run = require('../../bin/run-clean');
    const command = run(
      ['node', 'bin/run-clean', 'tsconfig.json', 'dist', 'api-docs'],
      true,
    );
    assert(command.indexOf('tsconfig.json dist api-docs') !== -1);
  });

  it('does not remove directories/files outside the project', () => {
    const run = require('../../bin/run-clean');
    const command = run(
      [
        'node',
        'bin/run-clean',
        '../tsconfig.json',
        './dist',
        path.join(process.cwd(), '../../api-docs'),
      ],
      true,
    );
    assert(command.indexOf('rm -rf ./dist') !== -1);
  });

  describe('with LERNA_ROOT_PATH', () => {
    const repoRoot = path.join(__dirname, '../../../..');
    before(() => (process.env.LERNA_ROOT_PATH = repoRoot));

    it('sets --skip-public-assets for apidocs', () => {
      const run = require('../../bin/generate-apidocs');
      const command = run(['node', 'bin/generate-apidocs'], true);
      assert(
        command.indexOf('--skip-public-assets') !== -1,
        '--skip-public-assets should be set by default',
      );
    });

    it('sets --html-file for apidocs', () => {
      const run = require('../../bin/generate-apidocs');
      const command = run(['node', 'bin/generate-apidocs'], true);
      assert(
        command.indexOf('--html-file ts-test-proj.html') !== -1,
        '--html-file should be set to the package name by default',
      );
    });

    it('sets --project option for tsc', () => {
      const run = require('../../bin/compile-package');
      const command = run(['node', 'bin/compile-package'], true);
      const tsConfig = path.relative(
        repoRoot,
        path.join(__dirname, './fixtures/tsconfig.json'),
      );
      assert(
        command.indexOf(`-p ${tsConfig}`) !== -1,
        '-p should be set relative to the monorepo root',
      );
    });

    after(() => delete process.env.LERNA_ROOT_PATH);
  });
});

describe('mocha', function() {
  // eslint-disable-next-line no-invalid-this
  this.timeout(30000);
  const cwd = process.cwd();
  const projectDir = path.resolve(__dirname, './fixtures');

  function cleanup() {
    const run = require('../../bin/run-clean');
    run(['node', 'bin/run-clean', '.mocharc.json']);
  }

  beforeEach(() => {
    process.chdir(projectDir);
    cleanup();
  });

  afterEach(() => {
    cleanup();
    process.chdir(cwd);
  });

  it('loads built-in .mocharc.json file', () => {
    const run = require('../../bin/run-mocha');
    const command = run(['node', 'bin/run-mocha', '"dist/__tests__"'], true);
    const builtInMochaOptsFile = path.join(
      __dirname,
      '../../config/.mocharc.json',
    );
    assert(
      command.indexOf(builtInMochaOptsFile) !== -1,
      '--config should be set by default',
    );
  });

  it('honors --config option', () => {
    const run = require('../../bin/run-mocha');
    const command = run(
      [
        'node',
        'bin/run-mocha',
        '--config custom/.mocharc.json',
        '"dist/__tests__"',
      ],
      true,
    );
    assert(
      command.indexOf('--config custom/.mocharc.json') !== -1,
      '--config custom/.mocharc.json should be honored',
    );
  });

  it('loads .mocharc.json specific project file', () => {
    const run = require('../../bin/run-mocha');
    const buitInMochaOptsPath = path.join(
      __dirname,
      '../../config/.mocharc.json',
    );
    const destPath = path.join(__dirname, './fixtures/.mocharc.json');

    fs.copyFileSync(buitInMochaOptsPath, destPath);

    const command = run(['node', 'bin/run-mocha', '"dist/__tests__"'], true);
    assert(
      command.indexOf('--config') === -1,
      'should skip built-in .mocharc.json file when specific project file exist',
    );
  });
});
