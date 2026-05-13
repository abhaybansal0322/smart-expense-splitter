import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  numeric, 
  pgEnum, 
  integer, 
  jsonb, 
  check, 
  primaryKey,
  unique
} from 'drizzle-orm/pg-core';
import { sql, relations } from 'drizzle-orm';

// ─────────────── Enums ───────────────
export const splitTypeEnum = pgEnum('split_type', ['equal', 'exact', 'percentage', 'exclude', 'adjustment']);
export const settlementStatusEnum = pgEnum('settlement_status', ['pending', 'confirmed', 'cancelled']);

// ─────────────── Users ───────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(groupMembers),
  expensesPaid: many(expenses),
  splits: many(expenseSplits),
  settlementsSent: many(settlements, { relationName: 'sentSettlements' }),
  settlementsReceived: many(settlements, { relationName: 'receivedSettlements' }),
}));

// ─────────────── Groups ───────────────
export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  joinCode: varchar('join_code', { length: 16 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  expenses: many(expenses),
  settlements: many(settlements),
  activityLogs: many(activityLogs),
}));

// ─────────────── Group Members ───────────────
export const groupMembers = pgTable('group_members', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('member'),
  status: varchar('status', { length: 50 }).default('accepted'),
  joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.groupId] }),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
}));

// ─────────────── Expenses ───────────────
export const expenses = pgTable('expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  paidBy: uuid('paid_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  category: varchar('category', { length: 100 }),
  splitType: splitTypeEnum('split_type').notNull().default('equal'),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('amount_check', sql`${table.amount} > 0`),
}));

export const expensesRelations = relations(expenses, ({ one, many }) => ({
  group: one(groups, { fields: [expenses.groupId], references: [groups.id] }),
  payer: one(users, { fields: [expenses.paidBy], references: [users.id] }),
  splits: many(expenseSplits),
  attachments: many(expenseAttachments),
  spotifyTrack: one(expenseSpotifyTracks),
}));

// ─────────────── Expense Splits ───────────────
export const expenseSplits = pgTable('expense_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  share: numeric('share', { precision: 12, scale: 2 }).notNull(),
}, (table) => ({
  uniqueSplit: unique('unique_expense_user_split').on(table.expenseId, table.userId),
  shareCheck: check('share_check', sql`${table.share} >= 0`),
}));

export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSplits.expenseId], references: [expenses.id] }),
  user: one(users, { fields: [expenseSplits.userId], references: [users.id] }),
}));

// ─────────────── Expense Attachments ───────────────
export const expenseAttachments = pgTable('expense_attachments', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id').notNull().references(() => expenses.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => ({
  sizeCheck: check('size_check', sql`${table.sizeBytes} > 0`),
}));

export const expenseAttachmentsRelations = relations(expenseAttachments, ({ one }) => ({
  expense: one(expenses, { fields: [expenseAttachments.expenseId], references: [expenses.id] }),
  uploader: one(users, { fields: [expenseAttachments.uploadedBy], references: [users.id] }),
}));

// ─────────────── Expense Spotify Tracks ───────────────
export const expenseSpotifyTracks = pgTable('expense_spotify_tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  expenseId: uuid('expense_id').notNull().unique().references(() => expenses.id, { onDelete: 'cascade' }),
  spotifyTrackId: varchar('spotify_track_id', { length: 255 }).notNull(),
  spotifyUrl: text('spotify_url').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  artist: varchar('artist', { length: 255 }).notNull(),
  albumName: varchar('album_name', { length: 255 }),
  albumImageUrl: text('album_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const expenseSpotifyTracksRelations = relations(expenseSpotifyTracks, ({ one }) => ({
  expense: one(expenses, { fields: [expenseSpotifyTracks.expenseId], references: [expenses.id] }),
}));

// ─────────────── Settlements ───────────────
export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  fromUser: uuid('from_user').notNull().references(() => users.id, { onDelete: 'restrict' }),
  toUser: uuid('to_user').notNull().references(() => users.id, { onDelete: 'restrict' }),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  status: settlementStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),
}, (table) => ({
  amountCheck: check('amount_check', sql`${table.amount} > 0`),
  userCheck: check('from_to_user_check', sql`${table.fromUser} <> ${table.toUser}`),
}));

export const settlementsRelations = relations(settlements, ({ one }) => ({
  group: one(groups, { fields: [settlements.groupId], references: [groups.id] }),
  sender: one(users, { fields: [settlements.fromUser], references: [users.id], relationName: 'sentSettlements' }),
  receiver: one(users, { fields: [settlements.toUser], references: [users.id], relationName: 'receivedSettlements' }),
}));

// ─────────────── Activity Logs ───────────────
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  groupId: uuid('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  group: one(groups, { fields: [activityLogs.groupId], references: [groups.id] }),
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));
