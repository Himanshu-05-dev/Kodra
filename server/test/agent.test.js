/**
 * @file agent.test.js
 * Automated validation suite for Phase 5: AI Chat & Provider Abstraction.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { BaseProvider } from '../../agent/src/providers/BaseProvider.js';
import { ProviderFactory } from '../../agent/src/providers/ProviderFactory.js';
import { GeminiAdapter } from '../../agent/src/providers/GeminiAdapter.js';
import { OpenAIAdapter } from '../../agent/src/providers/OpenAIAdapter.js';
import { AgentService } from '../src/services/AgentService.js';
import { ValidationError, NotFoundError } from '../src/utils/AppError.js';
import { AgentStatus } from '@kodra/shared';

describe('Phase 5: AI Provider & Agent Chat Test Suite', () => {

  describe('1. AI Provider Abstraction Layer', () => {
    it('BaseProvider should throw error if subclass does not implement generate()', async () => {
      const base = new BaseProvider();
      await assert.rejects(
        async () => base.generate({ messages: [] }),
        /generate\(\) must be implemented/
      );
    });

    it('BaseProvider should throw error if subclass does not implement stream()', async () => {
      const base = new BaseProvider();
      await assert.rejects(
        async () => {
          // eslint-disable-next-line no-unused-vars
          for await (const _ of base.stream({ messages: [] })) {
            // noop
          }
        },
        /stream\(\) must be implemented/
      );
    });

    it('ProviderFactory should instantiate GeminiAdapter by default', () => {
      const provider = ProviderFactory.getProvider('gemini');
      assert.ok(provider instanceof GeminiAdapter);
      assert.ok(provider instanceof BaseProvider);
    });

    it('ProviderFactory should instantiate OpenAIAdapter for openai or ollama', () => {
      const openaiProvider = ProviderFactory.getProvider('openai');
      assert.ok(openaiProvider instanceof OpenAIAdapter);

      const ollamaProvider = ProviderFactory.getProvider('ollama');
      assert.ok(ollamaProvider instanceof OpenAIAdapter);
    });

    it('GeminiAdapter should safely format messages and provide key guidance if unconfigured', async () => {
      const adapter = new GeminiAdapter();
      assert.equal(typeof adapter._formatContents, 'function');

      const formatted = adapter._formatContents([
        { role: 'user', content: 'Hello' },
        { role: 'model', content: 'Hi there' }
      ]);

      assert.equal(formatted.length, 2);
      assert.equal(formatted[0].role, 'user');
      assert.equal(formatted[0].parts[0].text, 'Hello');
      assert.equal(formatted[1].role, 'model');
      assert.equal(formatted[1].parts[0].text, 'Hi there');

      // If no API key set in test env, stream should yield guidance chunk without throwing
      if (!adapter.apiKey) {
        const chunks = [];
        for await (const chunk of adapter.stream({ messages: formatted })) {
          chunks.push(chunk);
        }
        assert.ok(chunks.length > 0);
        assert.ok(chunks[0].textChunk.includes('Gemini API Key Required'));
      }
    });
  });

  describe('2. AgentService Orchestration & Persistence', () => {
    // Mock repositories for isolated deterministic unit testing
    let mockSession = {
      _id: 'session-test-1',
      projectId: 'proj-123',
      userId: 'test-user',
      status: AgentStatus.IDLE
    };

    let storedMessages = [];

    const mockSessionRepo = {
      getOrCreateSession: async (projectId, userId) => ({
        ...mockSession,
        projectId,
        userId
      }),
      updateStatus: async (sessionId, status) => {
        mockSession.status = status;
        return mockSession;
      }
    };

    const mockMessageRepo = {
      createMessage: async (msgData) => {
        const saved = {
          _id: `msg-${storedMessages.length + 1}`,
          ...msgData,
          createdAt: new Date()
        };
        storedMessages.push(saved);
        return saved;
      },
      getSessionMessages: async () => [...storedMessages],
      deleteBySessionId: async () => {
        storedMessages = [];
        return { deletedCount: 1 };
      }
    };

    const mockProjectRepo = {
      findById: async (id) => {
        if (id === 'proj-123') {
          return {
            _id: 'proj-123',
            name: 'Kodra-Vibe-App',
            template: 'vite-react'
          };
        }
        return null;
      }
    };

    const service = new AgentService(mockSessionRepo, mockMessageRepo, mockProjectRepo);

    it('should reject empty or blank prompts with ValidationError', async () => {
      await assert.rejects(
        () => service.processPromptStream('proj-123', '   ', 'user', () => {}),
        (err) => err instanceof ValidationError && err.message.includes('cannot be empty')
      );
    });

    it('should reject prompts for non-existent projects with NotFoundError', async () => {
      await assert.rejects(
        () => service.processPromptStream('unknown-proj', 'Build a hero banner', 'user', () => {}),
        (err) => err instanceof NotFoundError
      );
    });

    it('should stream chunks and persist user prompt and model response in history', async () => {
      storedMessages = [];
      const dispatchedChunks = [];

      const result = await service.processPromptStream(
        'proj-123',
        'How does this app work?',
        'test-user',
        (chunk) => dispatchedChunks.push(chunk)
      );

      assert.ok(result);
      assert.ok(result.text);
      assert.ok(dispatchedChunks.length > 0);
      assert.equal(mockSession.status, AgentStatus.IDLE);

      // Verify that user message and model response were stored
      assert.equal(storedMessages.length, 2);
      assert.equal(storedMessages[0].role, 'user');
      assert.equal(storedMessages[0].content, 'How does this app work?');
      assert.equal(storedMessages[1].role, 'model');
      assert.equal(storedMessages[1].content, result.text);
    });

    it('should retrieve conversation history via getHistory()', async () => {
      const history = await service.getHistory('proj-123', 'test-user');
      assert.ok(history.session);
      assert.equal(history.messages.length, 2);
    });

    it('should clear conversation history and reset session status via clearHistory()', async () => {
      const clearResult = await service.clearHistory('proj-123', 'test-user');
      assert.equal(clearResult.cleared, true);
      assert.equal(storedMessages.length, 0);
      assert.equal(mockSession.status, AgentStatus.IDLE);
    });
  });

});
