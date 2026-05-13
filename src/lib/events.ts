import { EventEmitter } from 'events';
import type { ActivityWriteClient } from '@/db/repositories/ActivityRepository';

export enum DomainEvent {
  EXPENSE_CREATED = 'EXPENSE_CREATED',
  EXPENSE_UPDATED = 'EXPENSE_UPDATED',
  EXPENSE_DELETED = 'EXPENSE_DELETED',
  SETTLEMENT_CREATED = 'SETTLEMENT_CREATED',
  SETTLEMENT_CONFIRMED = 'SETTLEMENT_CONFIRMED',
  GROUP_CREATED = 'GROUP_CREATED',
  MEMBER_JOINED = 'MEMBER_JOINED',
}

export interface DomainEventPayloads {
  [DomainEvent.EXPENSE_CREATED]: {
    userId: string;
    groupId: string;
    expenseId: string;
    amount: number;
    description: string;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.EXPENSE_UPDATED]: {
    userId: string;
    groupId: string;
    expenseId: string;
    oldAmount: number;
    newAmount: number;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.EXPENSE_DELETED]: {
    userId: string;
    groupId: string;
    expenseId: string;
    amount: number;
    description: string;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.SETTLEMENT_CREATED]: {
    userId: string;
    groupId: string;
    settlementId: string;
    amount: number;
    fromUser: string;
    toUser: string;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.SETTLEMENT_CONFIRMED]: {
    userId: string;
    groupId: string;
    settlementId: string;
    amount: number;
    fromUser: string;
    toUser: string;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.GROUP_CREATED]: {
    userId: string;
    groupId: string;
    name: string;
    tx?: ActivityWriteClient;
  };
  [DomainEvent.MEMBER_JOINED]: {
    userId: string;
    groupId: string;
    tx?: ActivityWriteClient;
  };
}

class DomainEventEmitter extends EventEmitter {
  emit<T extends DomainEvent>(event: T, payload: DomainEventPayloads[T]): boolean {
    return super.emit(event, payload);
  }

  on<T extends DomainEvent>(event: T, listener: (payload: DomainEventPayloads[T]) => void): this {
    return super.on(event, listener);
  }
}

export const eventBus = new DomainEventEmitter();
