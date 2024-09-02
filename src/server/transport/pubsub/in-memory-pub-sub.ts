import type { GenericPubSub } from './generic-pub-sub';

export class InMemoryPubSub<T> implements GenericPubSub<T> {
  callbacks: Map<string, ((payload: T) => void)[]> = new Map();

  publish(channelId: string, payload: T) {
    console.log('ESTOY ADENTRO DEL PUB PUBLISH');
    console.log(channelId);
    console.log(payload);
    if (!this.callbacks.has(channelId)) {
      return;
    }
    const allCallbacks = this.callbacks.get(channelId);
    console.log('ALL CALL BACKS'+allCallbacks);
    for (const callback of allCallbacks) {
      callback(payload);
    }
  }

  subscribe(channelId: string, callback: (payload: T) => void): void {
    console.log('ESTOY ADENTRO DEL PUB SUBSCRIBE');
    if (!this.callbacks.has(channelId)) {
      console.log('ESTOY ADENTRO DEL PUB SUBSCRIBE has cahnnel id');
      this.callbacks.set(channelId, []);
    }
    console.log('este es el callback del suscribe');
    console.log(callback);
    this.callbacks.get(channelId).push(callback);
  }

  unsubscribeAll(channelId: string) {
    if (this.callbacks.has(channelId)) {
      this.callbacks.delete(channelId);
    }
  }
}
