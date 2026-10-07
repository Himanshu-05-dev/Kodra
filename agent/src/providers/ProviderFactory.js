/**
 * @file ProviderFactory.js
 * Layer 4: Infrastructure - Factory instantiating active AI Provider.
 */

import { GeminiAdapter } from './GeminiAdapter.js';
import { OpenAIAdapter } from './OpenAIAdapter.js';
import { config } from '../../../server/src/config/index.js';

export class ProviderFactory {
  static getProvider(providerName = config.ai.defaultProvider) {
    switch (providerName?.toLowerCase()) {
      case 'openai':
        return new OpenAIAdapter();
      case 'ollama':
        return new OpenAIAdapter(); // Uses Ollama baseUrl
      case 'gemini':
      default:
        return new GeminiAdapter();
    }
  }
}
