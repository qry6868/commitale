import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseLog, renamedPath } from '../src/git.ts';

const RS = '\x1e';
const US = '\x1f';

test('parseLog reads headers, numstat lines and the author-local time', () => {
  const out = [
    `${RS}abc123${US}Ada${US}Ada@Example.com${US}2026-03-04T23:15:02+08:00${US}fix: the thing`,
    '10\t2\tsrc/a.ts',
    '-\t-\tlogo.png',
    '',
    `${RS}def456${US}Ada${US}ada@example.com${US}2026-03-05T01:00:00-05:00${US}feat: more`,
    '3\t0\tsrc/{old => new}/b.ts',
  ].join('\n');

  const [first, second] = parseLog(out, '/repo');
  assert.equal(first.hash, 'abc123');
  assert.equal(first.authorEmail, 'ada@example.com');
  assert.equal(first.date, '2026-03-04');
  assert.equal(first.hour, 23);
  assert.equal(first.minute, 15);
  assert.equal(first.weekday, 3);
  assert.equal(first.subject, 'fix: the thing');
  assert.deepEqual(first.files, [
    { path: 'src/a.ts', added: 10, deleted: 2 },
    { path: 'logo.png', added: 0, deleted: 0 },
  ]);
  assert.equal(second.hour, 1);
  assert.deepEqual(second.files, [{ path: 'src/new/b.ts', added: 3, deleted: 0 }]);
});

test('parseLog tolerates empty output and CRLF line endings', () => {
  assert.deepEqual(parseLog('', '/repo'), []);
  const [c] = parseLog(`${RS}h${US}A${US}a@x${US}2026-01-01T00:00:00Z${US}s\r\n1\t1\tx.py\r\n`, '/repo');
  assert.deepEqual(c.files, [{ path: 'x.py', added: 1, deleted: 1 }]);
});

test('renamedPath resolves both numstat rename notations', () => {
  assert.equal(renamedPath('plain/path.ts'), 'plain/path.ts');
  assert.equal(renamedPath('old.ts => new.ts'), 'new.ts');
  assert.equal(renamedPath('src/{a => b}/c.ts'), 'src/b/c.ts');
  assert.equal(renamedPath('src/{lib => }/c.ts'), 'src/c.ts');
  assert.equal(renamedPath('{ => pkg}/c.ts'), 'pkg/c.ts');
});
