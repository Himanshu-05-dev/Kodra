/**
 * @file Project.js
 * Layer 3: Model - Mongoose Project Entity Schema.
 */

import mongoose from 'mongoose';
import { ProjectStatus, ProjectTemplates } from '@kodra/shared';

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [2, 'Project name must be at least 2 characters'],
      maxlength: [64, 'Project name cannot exceed 64 characters'],
      match: [/^[a-zA-Z0-9-_]+$/, 'Project name can only contain alphanumeric characters, hyphens, and underscores']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [256, 'Description cannot exceed 256 characters'],
      default: ''
    },
    ownerId: {
      type: String,
      required: [true, 'Project owner ID is required'],
      index: true,
      default: 'anonymous'
    },
    template: {
      type: String,
      enum: Object.values(ProjectTemplates),
      default: ProjectTemplates.VITE_REACT
    },
    workspacePath: {
      type: String,
      required: [true, 'Workspace path is required']
    },
    containerId: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.CREATED,
      index: true
    },
    ports: {
      dev: {
        type: Number,
        default: null
      },
      preview: {
        type: Number,
        default: null
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index to ensure unique project names per owner
ProjectSchema.index({ ownerId: 1, name: 1 }, { unique: true });

export const ProjectModel = mongoose.model('Project', ProjectSchema);
