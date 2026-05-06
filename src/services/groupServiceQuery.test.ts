import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const serviceSource = readFileSync(join(process.cwd(), 'src/services/groupService.ts'), 'utf8');

test('group list and detail queries include persistent join codes', () => {
  const listQueryStart = serviceSource.indexOf('export async function getGroupsForUser');
  const detailQueryStart = serviceSource.indexOf('export async function getGroupById');
  const membersQueryStart = serviceSource.indexOf('export async function getGroupMembers');

  assert.notEqual(listQueryStart, -1);
  assert.notEqual(detailQueryStart, -1);
  assert.notEqual(membersQueryStart, -1);

  const listQuery = serviceSource.slice(listQueryStart, detailQueryStart);
  const detailQuery = serviceSource.slice(detailQueryStart, membersQueryStart);

  assert.match(listQuery, /join_code:\s*g\.joinCode/);
  assert.match(detailQuery, /join_code:\s*g\.joinCode/);
});
