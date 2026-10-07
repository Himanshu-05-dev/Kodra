/**
 * @file Message.js
 * Layer 3: Model - Mongoose Entity Schema for AI Chat Messages & Tool Results.
 */

import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentSession',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true,
      default: ''
    },
    toolCalls: {
      type: Array,
      default: []
    },
    toolResults: {
      type: Array,
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const MessageModel = mongoose.model('Message', MessageSchema);
