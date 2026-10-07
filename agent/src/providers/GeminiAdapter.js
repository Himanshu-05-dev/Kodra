/**
 * @file GeminiAdapter.js
 * Layer 4: Infrastructure - Google Gemini AI Provider Adapter.
 * Interfaces with @google/genai SDK with streaming, tool calling, and error translation.
 */

import { GoogleGenAI } from '@google/genai';
import { BaseProvider } from './BaseProvider.js';
import { config } from '../../../server/src/config/index.js';
import { AIProviderError } from '../../../server/src/utils/AppError.js';
import { logger } from '../../../server/src/infrastructure/logger/logger.js';

export class GeminiAdapter extends BaseProvider {
  constructor() {
    super();
    this.apiKey = config.ai.gemini.apiKey;
    this.modelName = config.ai.gemini.model || 'gemini-1.5-pro-latest';
    this.temperature = config.ai.gemini.temperature ?? 0.2;
    this.maxOutputTokens = config.ai.gemini.maxOutputTokens || 8192;

    if (this.apiKey) {
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    } else {
      this.ai = null;
      logger.warn('GeminiAdapter: GEMINI_API_KEY is not set in .env. Agent will operate in mock/guidance mode.');
    }
  }

  /**
   * Format normalized conversation messages into Gemini contents schema
   */
  _formatContents(messages) {
    return messages.map((msg) => {
      if (msg.parts && Array.isArray(msg.parts)) {
        return {
          role: msg.role === 'model' ? 'model' : 'user',
          parts: msg.parts
        };
      }

      if (msg.role === 'tool' || msg.role === 'function') {
        return {
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: msg.name,
                response: typeof msg.content === 'object' ? msg.content : { output: msg.content }
              }
            }
          ]
        };
      }

      return {
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content || '') }]
      };
    });
  }

  /**
   * Non-streaming completion with tool calling support
   */
  async generate({ messages, tools = [], systemInstruction = '' }) {
    if (!this.ai || !this.apiKey) {
      return {
        text: '⚠️ **Gemini API Key Required**\nPlease add your `GEMINI_API_KEY=your_key` to the `.env` file to enable autonomous AI features.',
        toolCalls: []
      };
    }

    try {
      const contents = this._formatContents(messages);
      const reqConfig = {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      };

      if (tools && tools.length > 0) {
        reqConfig.tools = [{ functionDeclarations: tools }];
      }

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents,
        config: reqConfig
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const toolCalls = [];

      for (const part of parts) {
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: part.functionCall.name,
            args: part.functionCall.args || {}
          });
        }
      }

      return {
        text: response.text || '',
        toolCalls,
        rawParts: parts
      };
    } catch (err) {
      logger.error(`Gemini generate error: ${err.message}`);
      throw new AIProviderError(`Gemini API Error: ${err.message}`, [err]);
    }
  }

  /**
   * Real-time streaming generator with tool calls and token chunk emission
   */
  async *stream({ messages, tools = [], systemInstruction = '' }) {
    if (!this.ai || !this.apiKey) {
      yield {
        textChunk: '⚠️ **Gemini API Key Required**\n\nTo chat with Kodra AI:\n1. Open your `.env` file in the project root.\n2. Add your Google Gemini API key: `GEMINI_API_KEY=your_key`.\n3. Restart the server and your AI copilot is live!'
      };
      return;
    }

    try {
      const contents = this._formatContents(messages);
      const reqConfig = {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined
      };

      if (tools && tools.length > 0) {
        reqConfig.tools = [{ functionDeclarations: tools }];
      }

      const responseStream = await this.ai.models.generateContentStream({
        model: this.modelName,
        contents,
        config: reqConfig
      });

      for await (const chunk of responseStream) {
        if (chunk.text) {
          yield { textChunk: chunk.text };
        }

        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const call of chunk.functionCalls) {
            yield {
              toolCall: {
                id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: call.name,
                args: call.args || {}
              }
            };
          }
        }
      }
    } catch (err) {
      logger.error(`Gemini stream error: ${err.message}`);
      yield {
        textChunk: `\n\n❌ **AI Provider Error:** ${err.message}`
      };
      throw new AIProviderError(`Gemini Stream Error: ${err.message}`, [err]);
    }
  }
}
