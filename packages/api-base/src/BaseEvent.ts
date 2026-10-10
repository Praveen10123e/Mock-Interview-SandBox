import { IEvent, EventType, IBaseEventPayload } from '@nm/types';
import { UUIDHelper } from '@nm/shared';

export abstract class BaseEvent<T = IBaseEventPayload> implements IEvent<T> {
  public readonly eventId: string;
  public readonly timestamp: string;

  constructor(
    public readonly eventType: EventType,
    public readonly payload: T,
    public readonly sourceService: string,
    public readonly correlationId: string = UUIDHelper.generate(),
  ) {
    this.eventId = UUIDHelper.generate();
    this.timestamp = new Date().toISOString();
  }
}
