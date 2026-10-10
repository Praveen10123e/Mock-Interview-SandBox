import { BaseAIProvider, AIProviderConfig } from './interfaces';

export class AIProviderFactory {
  private static providers: Map<string, BaseAIProvider> = new Map();

  static registerProvider(name: string, provider: BaseAIProvider) {
    this.providers.set(name, provider);
  }

  static getProvider(name: string): BaseAIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`AI Provider ${name} is not registered.`);
    }
    return provider;
  }
}
