#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLAN_PATH = path.join(ROOT, 'docs', 'plans', 'phase-1-mvp-plan.md');

const DEFAULT_LABELS = ['phase-1'];

function parseArgs(argv) {
  const options = { dryRun: false, labels: [...DEFAULT_LABELS], milestone: null }; // clone defaults
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--label' || arg === '-l') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      options.labels.push(value);
      i += 1;
    } else if (arg === '--milestone' || arg === '-m') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error(`${arg} requires a value`);
      }
      options.milestone = value;
      i += 1;
    } else if (arg === '--no-default-labels') {
      options.labels = [];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function loadPlan() {
  if (!fs.existsSync(PLAN_PATH)) {
    throw new Error(`Plan not found at ${PLAN_PATH}`);
  }
  return fs.readFileSync(PLAN_PATH, 'utf8');
}

function parseDeliverables(markdown) {
  const regex = /^### ([^\n]+)\n([\s\S]*?)(?=^### |^## |\Z)/gm;
  const deliverables = [];
  let match = regex.exec(markdown);
  while (match) {
    const title = match[1].trim();
    const block = match[2].trim();
    if (!block) {
      match = regex.exec(markdown);
      continue;
    }

    const lines = block.split('\n');
    const implementation = [];
    let dependencies = '';
    let acceptance = '';
    let inImplementation = false;

    lines.forEach((line) => {
      if (line.startsWith('- Implementation')) {
        inImplementation = true;
        return;
      }
      if (line.startsWith('- Dependencies:')) {
        inImplementation = false;
        dependencies = line.replace('- Dependencies:', '').trim();
        return;
      }
      if (line.startsWith('- Acceptance:')) {
        inImplementation = false;
        acceptance = line.replace('- Acceptance:', '').trim();
        return;
      }
      if (inImplementation && line.trim().startsWith('-')) {
        implementation.push(line.trim().replace(/^-\s*/, ''));
      }
    });

    deliverables.push({
      title,
      implementation,
      dependencies,
      acceptance,
    });

    match = regex.exec(markdown);
  }
  return deliverables;
}

function ensureGhAvailable() {
  const result = spawnSync('gh', ['--version'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('GitHub CLI (`gh`) not found. Install it first: https://cli.github.com/');
  }
}

function createIssue(deliverable, options) {
  const issueTitle = `Phase1: ${deliverable.title}`;
  const bodyLines = [];
  bodyLines.push('## Context');
  bodyLines.push('Derived from [Phase 1 MVP plan](docs/plans/phase-1-mvp-plan.md).');
  bodyLines.push('');

  bodyLines.push('## Implementation');
  if (deliverable.implementation.length > 0) {
    deliverable.implementation.forEach((item) => {
      bodyLines.push(`- ${item}`);
    });
  } else {
    bodyLines.push('- TBD');
  }
  bodyLines.push('');

  bodyLines.push('## Dependencies');
  bodyLines.push(`- ${deliverable.dependencies || 'None listed'}`);
  bodyLines.push('');

  bodyLines.push('## Acceptance Criteria');
  bodyLines.push(`- ${deliverable.acceptance || 'TBD'}`);
  bodyLines.push('');

  bodyLines.push('---');
  bodyLines.push('Generated via `scripts/create-phase1-issues.js`.');

  const body = bodyLines.join('\n');

  if (options.dryRun) {
    console.log('---');
    console.log(issueTitle);
    console.log(body);
    console.log('Labels:', options.labels.length > 0 ? options.labels.join(', ') : '(none)');
    if (options.milestone) {
      console.log('Milestone:', options.milestone);
    }
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1-issue-'));
  const bodyPath = path.join(tmpDir, 'body.md');
  fs.writeFileSync(bodyPath, body, 'utf8');

  const args = ['issue', 'create', '--title', issueTitle, '--body-file', bodyPath];
  options.labels.forEach((label) => {
    args.push('--label', label);
  });
  if (options.milestone) {
    args.push('--milestone', options.milestone);
  }

  const result = spawnSync('gh', args, { stdio: 'inherit' });
  fs.rmSync(bodyPath);
  fs.rmdirSync(tmpDir);

  if (result.status !== 0) {
    throw new Error(`gh issue create failed for ${issueTitle}`);
  }
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const markdown = loadPlan();
  const deliverables = parseDeliverables(markdown);
  if (deliverables.length === 0) {
    console.error('No deliverables found in plan.');
    process.exit(1);
  }

  if (!options.dryRun) {
    try {
      ensureGhAvailable();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  deliverables.forEach((deliverable) => {
    try {
      createIssue(deliverable, options);
    } catch (err) {
      console.error(err.message);
      if (!options.dryRun) {
        process.exit(1);
      }
    }
  });
}

main();
