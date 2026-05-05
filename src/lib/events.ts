import { EventEmitter } from 'events';

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
    tx?: any;
  };
  [DomainEvent.EXPENSE_UPDATED]: {
    userId: string;
    groupId: string;
    expenseId: string;
    oldAmount: number;
    newAmount: number;
    tx?: any;
  };
  [DomainEvent.EXPENSE_DELETED]: {
    userId: string;
    groupId: string;
    expenseId: string;
    amount: number;
    description: string;
    tx?: any;
  };
  [DomainEvent.SETTLEMENT_CREATED]: {
    userId: string;
    groupId: string;
    settlementId: string;
    amount: number;
    fromUser: string;
    toUser: string;
    tx?: any;
  };
  [DomainEvent.SETTLEMENT_CONFIRMED]: {
    userId: string;
    groupId: string;
    settlementId: string;
    amount: number;
    fromUser: string;
    toUser: string;
    tx?: any;
  };
  [DomainEvent.GROUP_CREATED]: {
    userId: string;
    groupId: string;
    name: string;
    tx?: any;
  };
  [DomainEvent.MEMBER_JOINED]: {
    userId: string;
    groupId: string;
    tx?: any;
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
