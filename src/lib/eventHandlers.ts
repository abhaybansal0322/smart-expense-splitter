import { DomainEvent, eventBus } from './events';
import { ActivityRepository } from '@/db/repositories/ActivityRepository';

export function initializeEventHandlers() {
  eventBus.on(DomainEvent.EXPENSE_CREATED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'EXPENSE_CREATED',
      entityType: 'expense',
      entityId: payload.expenseId,
      metadata: {
        amount: payload.amount,
        description: payload.description
      }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.EXPENSE_UPDATED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'EXPENSE_UPDATED',
      entityType: 'expense',
      entityId: payload.expenseId,
      metadata: {
        old_amount: payload.oldAmount,
        new_amount: payload.newAmount
      }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.EXPENSE_DELETED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'EXPENSE_DELETED',
      entityType: 'expense',
      entityId: payload.expenseId,
      metadata: {
        amount: payload.amount,
        description: payload.description
      }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.SETTLEMENT_CREATED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'SETTLEMENT_CREATED',
      entityType: 'settlement',
      entityId: payload.settlementId,
      metadata: {
        amount: payload.amount,
        from_user: payload.fromUser,
        to_user: payload.toUser
      }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.SETTLEMENT_CONFIRMED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'SETTLEMENT_CONFIRMED',
      entityType: 'settlement',
      entityId: payload.settlementId,
      metadata: {
        amount: payload.amount,
        from_user: payload.fromUser,
        to_user: payload.toUser
      }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.GROUP_CREATED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'GROUP_CREATED',
      entityType: 'group',
      entityId: payload.groupId,
      metadata: { name: payload.name }
    }, payload.tx);
  });

  eventBus.on(DomainEvent.MEMBER_JOINED, async (payload) => {
    await ActivityRepository.create({
      userId: payload.userId,
      groupId: payload.groupId,
      action: 'MEMBER_JOINED',
      entityType: 'member',
      entityId: payload.userId,
      metadata: {}
    }, payload.tx);
  });
}
