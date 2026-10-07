/**
 * @file OpenAIAdapter.js
 * Layer 4: Infrastructure - OpenAI / Ollama compatible AI Provider Adapter.
 * Demonstrates plug-and-play provider abstraction using standard SSE streaming.
 */

import { BaseProvider } from './BaseProvider.js';
import { config } from '../../../server/src/config/index.js';
import { AIProviderError } from '../../../server/src/utils/AppError.js';
import { logger } from '../../../server/src/infrastructure/logger/logger.js';

export class OpenAIAdapter extends BaseProvider {
  constructor() {
    super();
    this.apiKey = config.ai.openai.apiKey;
    this.modelName = config.ai.openai.model || 'gpt-4o';
    this.baseUrl = config.ai.ollama.baseUrl || 'https://api.openai.com/v1';
  }

  async generate({ messages, systemInstruction = '' }) {
    if (!this.apiKey && !this.baseUrl.includes('localhost')) {
      return {
        text: '⚠️ **OpenAI API Key Missing**: Please set `OPENAI_API_KEY` in your `.env` file.'
      };
    }

    try {
      const formattedMessages = [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        ...messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
      ];

      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: formattedMessages
        })
      });

      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    } catch (err) {
      throw new AIProviderError(`OpenAI API error: ${err.message}`);
    }
  }

  async *stream({ messages, systemInstruction = '' }) {
    if (!this.apiKey && !this.baseUrl.includes('localhost')) {
      yield {
        textChunk: '⚠️ **OpenAI API Key Missing**: Please set `OPENAI_API_KEY` in your `.env` file.'
      };
      return;
    }

    const formattedMessages = [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      ...messages.map((m) => ({ role: m.role === 'model' ? 'assistant' : m.role, content: m.content }))
    ];

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: formattedMessages,
          stream: true
        })
      });

      if (!res.ok) {
        throw new Error(`OpenAI HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr === '[DONE]') return;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { textChunk: content };
            }
          } catch {}
        }
      }
    } catch (err) {
      logger.error(`OpenAI stream error: ${err.message}`);
      yield { textChunk: `\n\n❌ **Provider Error:** ${err.message}` };
    }
  }
}
