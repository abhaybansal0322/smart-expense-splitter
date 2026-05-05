import { db } from '@/db/client';
import { expenses, expenseSplits, expenseSpotifyTracks, groupMembers } from '@/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { eventBus, DomainEvent } from '@/lib/events';
import {
  CreateExpensePayload,
  ExpenseWithDetails,
  UpdateExpensePayload,
} from '@/lib/types';
import { computeSplits } from '@/domain/splitCalculators';

export { computeSplits } from '@/domain/splitCalculators';

async function verifyUsersAreGroupMembers(
  tx: any,
  groupId: string,
  userIds: string[]
): Promise<void> {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) {
    throw new Error('At least one participant is required');
  }

  const members = await tx.query.groupMembers.findMany({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.status, 'accepted'),
      inArray(groupMembers.userId, uniqueUserIds)
    )
  });

  if (members.length !== uniqueUserIds.length) {
    throw new Error('All payers and participants must be accepted members of the group');
  }
}

export async function createExpense(payload: CreateExpensePayload, userId?: string): Promise<string> {
  const shares = computeSplits(payload);

  return db.transaction(async (tx) => {
    await verifyUsersAreGroupMembers(tx, payload.group_id, [
      payload.paid_by,
      ...Object.keys(shares),
    ]);

    const [newExpense] = await tx.insert(expenses).values({
      groupId: payload.group_id,
      paidBy: payload.paid_by,
      amount: payload.amount.toString(),
      description: payload.description,
      category: payload.category ?? null,
      splitType: payload.split_type
    }).returning();

    for (const [uId, share] of Object.entries(shares)) {
      await tx.insert(expenseSplits).values({
        expenseId: newExpense.id,
        userId: uId,
        share: share.toString()
      });
    }

    if (payload.spotify_track) {
      await tx.insert(expenseSpotifyTracks).values({
        expenseId: newExpense.id,
        spotifyTrackId: payload.spotify_track.spotify_track_id,
        spotifyUrl: payload.spotify_track.spotify_url,
        name: payload.spotify_track.name,
        artist: payload.spotify_track.artist,
        albumName: payload.spotify_track.album_name ?? null,
        albumImageUrl: payload.spotify_track.album_image_url ?? null
      });
    }

    if (userId) {
      eventBus.emit(DomainEvent.EXPENSE_CREATED, {
        userId,
        groupId: payload.group_id,
        expenseId: newExpense.id,
        amount: payload.amount,
        description: payload.description,
        tx
      });
    }

    return newExpense.id;
  });
}

export async function getExpensesByGroup(groupId: string): Promise<ExpenseWithDetails[]> {
  const exps = await db.query.expenses.findMany({
    where: and(eq(expenses.groupId, groupId), isNull(expenses.deletedAt)),
    with: {
      payer: true,
      splits: {
        with: {
          user: true
        }
      },
      attachments: true,
      spotifyTrack: true
    },
    orderBy: (expenses, { desc }) => [desc(expenses.createdAt)]
  });

  return exps.map(e => ({
    id: e.id,
    group_id: e.groupId,
    paid_by: e.paidBy,
    amount: Number(e.amount),
    description: e.description,
    split_type: e.splitType,
    created_at: e.createdAt.toISOString(),
    paid_by_name: e.payer.name,
    splits: e.splits.map(s => ({
      id: s.id,
      expense_id: s.expenseId,
      user_id: s.userId,
      share: Number(s.share),
      user_name: s.user.name
    })),
    attachments: e.attachments.map(a => ({
      id: a.id,
      expense_id: a.expenseId,
      file_url: a.fileUrl,
      original_name: a.originalName,
      mime_type: a.mimeType,
      size_bytes: a.sizeBytes,
      uploaded_by: a.uploadedBy,
      created_at: a.createdAt.toISOString()
    })),
    spotify_track: e.spotifyTrack ? {
      id: e.spotifyTrack.id,
      expense_id: e.spotifyTrack.expenseId,
      spotify_track_id: e.spotifyTrack.spotifyTrackId,
      spotify_url: e.spotifyTrack.spotifyUrl,
      name: e.spotifyTrack.name,
      artist: e.spotifyTrack.artist,
      album_name: e.spotifyTrack.albumName,
      album_image_url: e.spotifyTrack.albumImageUrl,
      created_at: e.spotifyTrack.createdAt.toISOString()
    } : null
  }));
}

export async function deleteExpense(expenseId: string, groupId: string, userId?: string): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.expenses.findFirst({
      where: and(eq(expenses.id, expenseId), eq(expenses.groupId, groupId), isNull(expenses.deletedAt))
    });

    if (!existing) throw new Error('Expense not found');

    await tx.update(expenses)
      .set({ deletedAt: new Date() })
      .where(eq(expenses.id, expenseId));

    if (userId) {
      eventBus.emit(DomainEvent.EXPENSE_DELETED, {
        userId,
        groupId,
        expenseId,
        amount: Number(existing.amount),
        description: existing.description,
        tx
      });
    }
  });
}

export async function updateExpense(payload: UpdateExpensePayload, userId?: string): Promise<void> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.expenses.findFirst({
      where: and(eq(expenses.id, payload.expense_id), eq(expenses.groupId, payload.group_id), isNull(expenses.deletedAt))
    });

    if (!existing) throw new Error('Expense not found');

    const updatedAmount = payload.amount ?? Number(existing.amount);
    const updatedDesc = payload.description ?? existing.description;
    const updatedCat = payload.category !== undefined ? payload.category : existing.category;
    const updatedSplitType = payload.split_type ?? existing.splitType;

    await tx.update(expenses).set({
      amount: updatedAmount.toString(),
      description: updatedDesc,
      category: updatedCat,
      splitType: updatedSplitType
    }).where(eq(expenses.id, payload.expense_id));

    if (payload.participants || payload.split_type || payload.amount || payload.exact_amounts || payload.percentages || payload.excluded_users || payload.adjustments) {
      const fullPayload = {
        group_id: existing.groupId,
        paid_by: existing.paidBy,
        amount: updatedAmount,
        description: updatedDesc,
        category: updatedCat,
        split_type: updatedSplitType,
        participants: payload.participants ?? [],
        exact_amounts: payload.exact_amounts,
        percentages: payload.percentages,
        excluded_users: payload.excluded_users,
        adjustments: payload.adjustments,
      };

      if (!payload.participants) {
        const splits = await tx.query.expenseSplits.findMany({
          where: eq(expenseSplits.expenseId, payload.expense_id),
          columns: { userId: true }
        });
        fullPayload.participants = splits.map((s: { userId: string }) => s.userId);
      }

      const shares = computeSplits(fullPayload as CreateExpensePayload);
      await verifyUsersAreGroupMembers(tx, existing.groupId, [
        existing.paidBy,
        ...Object.keys(shares),
      ]);

      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, payload.expense_id));

      for (const [uId, share] of Object.entries(shares)) {
        await tx.insert(expenseSplits).values({
          expenseId: payload.expense_id,
          userId: uId,
          share: share.toString()
        });
      }
    }

    if ('spotify_track' in payload) {
      await tx.delete(expenseSpotifyTracks).where(eq(expenseSpotifyTracks.expenseId, payload.expense_id));

      if (payload.spotify_track) {
        await tx.insert(expenseSpotifyTracks).values({
          expenseId: payload.expense_id,
          spotifyTrackId: payload.spotify_track.spotify_track_id,
          spotifyUrl: payload.spotify_track.spotify_url,
          name: payload.spotify_track.name,
          artist: payload.spotify_track.artist,
          albumName: payload.spotify_track.album_name ?? null,
          albumImageUrl: payload.spotify_track.album_image_url ?? null
        });
      }
    }

    if (userId) {
      eventBus.emit(DomainEvent.EXPENSE_UPDATED, {
        userId,
        groupId: existing.groupId,
        expenseId: payload.expense_id,
        oldAmount: Number(existing.amount),
        newAmount: updatedAmount,
        tx
      });
    }
  });
}
