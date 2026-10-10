import { IEvent } from '@nm/types';

export interface IHttpClientOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface IHttpClient {
  get<T>(url: string, options?: IHttpClientOptions): Promise<T>;
  post<T>(url: string, data: any, options?: IHttpClientOptions): Promise<T>;
  put<T>(url: string, data: any, options?: IHttpClientOptions): Promise<T>;
  delete<T>(url: string, options?: IHttpClientOptions): Promise<T>;
}

export interface IInternalClient {
  callService<T>(serviceName: string, path: string, method: string, data?: any): Promise<T>;
}

export interface IEventPublisher {
  publish(event: IEvent): Promise<void>;
  publishBatch(events: IEvent[]): Promise<void>;
}

export interface IEventSubscriber {
  subscribe(eventType: string, handler: (event: IEvent) => Promise<void>): Promise<void>;
  unsubscribe(eventType: string): Promise<void>;
}
