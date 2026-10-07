/**
 * @file BaseProvider.js
 * Layer 4: Infrastructure - Abstract AI Provider Interface.
 * Enforces zero vendor lock-in across Gemini, OpenAI, Mistral, and Ollama.
 */

export class BaseProvider {
  /**
   * Non-streaming completion
   * @param {object} params
   * @param {Array<{ role: 'user'|'model'|'system', content: string }>} params.messages
   * @param {Array} [params.tools]
   * @param {string} [params.systemInstruction]
   * @returns {Promise<{ text: string, toolCalls?: Array<{ id: string, name: string, args: object }> }>}
   */
  async generate(params) {
    throw new Error('generate() must be implemented by the provider adapter.');
  }

  /**
   * Real-time streaming generator
   * @param {object} params
   * @param {Array<{ role: 'user'|'model'|'system', content: string }>} params.messages
   * @param {Array} [params.tools]
   * @param {string} [params.systemInstruction]
   * @returns {AsyncGenerator<{ textChunk?: string, toolCalls?: Array<object> }, void, unknown>}
   */
  async *stream(params) {
    throw new Error('stream() must be implemented by the provider adapter.');
  }
}
