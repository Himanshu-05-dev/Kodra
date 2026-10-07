/**
 * @file AgentSession.js
 * Layer 3: Model - Mongoose Entity Schema for AI Agent Sessions.
 */

import mongoose from 'mongoose';
import { AgentStatus } from '@kodra/shared';

const AgentSessionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    userId: {
      type: String,
      default: 'anonymous',
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AgentStatus),
      default: AgentStatus.IDLE
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const AgentSessionModel = mongoose.model('AgentSession', AgentSessionSchema);
