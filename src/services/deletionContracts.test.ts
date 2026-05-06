import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function functionBody(sourceText: string, functionName: string): string {
  const start = sourceText.indexOf(`export async function ${functionName}`);
  assert.notEqual(start, -1);

  const nextExport = sourceText.indexOf('\nexport async function ', start + 1);
  return sourceText.slice(start, nextExport === -1 ? undefined : nextExport);
}

test('group deletion is exposed through service and authenticated group route', () => {
  const groupService = source('src/services/groupService.ts');
  const groupRoute = source('src/app/api/groups/[id]/route.ts');
  const groupPage = source('src/app/groups/[id]/page.tsx');
  const deleteGroupBody = functionBody(groupService, 'deleteGroup');

  assert.match(groupService, /export async function deleteGroup\(/);
  assert.doesNotMatch(deleteGroupBody, /db\.transaction/);
  assert.match(deleteGroupBody, /db\.delete\(groups\)/);
  assert.match(groupRoute, /export const DELETE = withGroupAccess/);
  assert.match(groupRoute, /deleteGroup\(groupId,\s*userId\)/);
  assert.match(groupPage, /\/api\/groups\/\$\{groupId\}/);
  assert.match(groupPage, /method:\s*'DELETE'/);
});

test('expense deletion stays scoped to the expense group before soft deleting', () => {
  const expenseRoute = source('src/app/api/expenses/[id]/route.ts');
  const expenseService = source('src/services/expenseService.ts');
  const expensesTab = source('src/features/expenses/ExpensesTab.tsx');
  const deleteExpenseBody = functionBody(expenseService, 'deleteExpense');

  assert.match(expenseRoute, /ExpenseRepository\.findById\(id\)/);
  assert.match(expenseRoute, /GroupRepository\.isUserInGroup\(expense\.groupId,\s*session\.user\.id\)/);
  assert.match(expenseRoute, /deleteExpense\(id,\s*expense\.groupId,\s*session\.user\.id\)/);
  assert.doesNotMatch(deleteExpenseBody, /db\.transaction/);
  assert.match(deleteExpenseBody, /set\(\{\s*deletedAt:\s*new Date\(\)\s*\}\)/);
  assert.match(expensesTab, /fetch\(`\/api\/expenses\/\$\{expense\.id\}`,\s*\{\s*method:\s*'DELETE'\s*\}\)/);
});

test('database client uses PostgreSQL driver with transaction support', () => {
  const dbClient = source('src/db/client.ts');

  assert.doesNotMatch(dbClient, /drizzle-orm\/neon-http/);
  assert.doesNotMatch(dbClient, /from '@neondatabase\/serverless'/);
  assert.match(dbClient, /drizzle-orm\/node-postgres/);
  assert.match(dbClient, /from 'pg'/);
});
