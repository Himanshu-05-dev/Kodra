/**
 * @file WorkspaceService.js
 * Layer 2: Business Logic - Manages Project Workspace Scaffolding and File Operations.
 */

import path from 'node:path';
import { ZipArchive } from 'archiver';
import { config } from '../config/index.js';
import { StorageLimitError, ValidationError } from '../utils/AppError.js';
import { ProjectTemplates } from '@kodra/shared';

export class WorkspaceService {
  /**
   * @param {import('../repositories/FileSystemRepository.js').FileSystemRepository} fileSystemRepo
   */
  constructor(fileSystemRepo) {
    this.fs = fileSystemRepo;
  }

  /**
   * Initialize a project workspace directory with starter code based on template
   */
  async scaffoldWorkspace(workspacePath, template = ProjectTemplates.VITE_REACT, projectName = 'kodra-app') {
    await this.fs.createDirectory(workspacePath);

    switch (template) {
      case ProjectTemplates.VITE_REACT:
        await this._scaffoldViteReact(workspacePath, projectName);
        break;
      case ProjectTemplates.NODE_EXPRESS:
        await this._scaffoldNodeExpress(workspacePath, projectName);
        break;
      case ProjectTemplates.VANILLA:
      default:
        await this._scaffoldVanilla(workspacePath, projectName);
        break;
    }
  }

  /**
   * Get the file tree for a project workspace
   */
  async getFileTree(workspacePath) {
    return await this.fs.getDirectoryTree(workspacePath, workspacePath);
  }

  /**
   * Read file content safely
   */
  async readFile(workspacePath, relativePath) {
    const safePath = this.fs.resolveSafePath(workspacePath, relativePath);
    const stats = await this.fs.getStats(safePath);

    if (stats.size > config.storage.maxFileSizeBytes) {
      throw new StorageLimitError(
        `File size (${stats.size} bytes) exceeds maximum allowable limit (${config.storage.maxFileSizeBytes} bytes).`
      );
    }

    const content = await this.fs.readFile(safePath);
    return {
      path: relativePath,
      content,
      size: stats.size,
      updatedAt: stats.mtime
    };
  }

  /**
   * Write file content safely with size validation
   */
  async writeFile(workspacePath, relativePath, content) {
    if (typeof content !== 'string') {
      throw new ValidationError('File content must be a string.');
    }

    const byteLength = Buffer.byteLength(content, 'utf8');
    if (byteLength > config.storage.maxFileSizeBytes) {
      throw new StorageLimitError(
        `Content size (${byteLength} bytes) exceeds maximum allowable limit (${config.storage.maxFileSizeBytes} bytes).`
      );
    }

    const safePath = this.fs.resolveSafePath(workspacePath, relativePath);
    await this.fs.writeFile(safePath, content);

    return {
      path: relativePath,
      size: byteLength,
      updatedAt: new Date()
    };
  }

  /**
   * Delete file safely
   */
  async deleteFile(workspacePath, relativePath) {
    const safePath = this.fs.resolveSafePath(workspacePath, relativePath);
    await this.fs.deleteFile(safePath);
  }

  // --- Template Scaffolding Helpers ---

  async _scaffoldViteReact(workspacePath, projectName) {
    const packageJson = JSON.stringify({
      name: projectName,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite --host 0.0.0.0',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.0',
        vite: '^5.2.11'
      }
    }, null, 2);

    const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173
  }
});
`;

    const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName} - Kodra IDE</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

    const mainJsx = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`;

    const appJsx = `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center',
      color: '#333'
    }}>
      <h1>Welcome to ${projectName}</h1>
      <p>Built and running in <strong>Kodra Cloud IDE</strong>.</p>
      <div style={{ marginTop: '2rem' }}>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          Count is: {count}
        </button>
      </div>
    </div>
  );
}
`;

    const indexCss = `body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  background-color: #f9fafb;
}
`;

    await this.fs.writeFile(path.join(workspacePath, 'package.json'), packageJson);
    await this.fs.writeFile(path.join(workspacePath, 'vite.config.js'), viteConfig);
    await this.fs.writeFile(path.join(workspacePath, 'index.html'), indexHtml);
    await this.fs.writeFile(path.join(workspacePath, 'src/main.jsx'), mainJsx);
    await this.fs.writeFile(path.join(workspacePath, 'src/App.jsx'), appJsx);
    await this.fs.writeFile(path.join(workspacePath, 'src/index.css'), indexCss);
  }

  async _scaffoldNodeExpress(workspacePath, projectName) {
    const packageJson = JSON.stringify({
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'node src/server.js'
      },
      dependencies: {
        express: '^4.19.2'
      }
    }, null, 2);

    const serverJs = `import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from ${projectName} on Kodra!' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server is running on port \${PORT}\`);
});
`;

    await this.fs.writeFile(path.join(workspacePath, 'package.json'), packageJson);
    await this.fs.writeFile(path.join(workspacePath, 'src/server.js'), serverJs);
  }

  async _scaffoldVanilla(workspacePath, projectName) {
    const indexHtml = `<!doctype html>
<html>
  <head>
    <title>${projectName}</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>${projectName}</h1>
    <p>Running on Kodra Web IDE.</p>
    <script src="app.js"></script>
  </body>
</html>
`;
    const styleCss = `body { font-family: sans-serif; padding: 2rem; }`;
    const appJs = `console.log('App loaded in Kodra');`;

    await this.fs.writeFile(path.join(workspacePath, 'index.html'), indexHtml);
    await this.fs.writeFile(path.join(workspacePath, 'style.css'), styleCss);
    await this.fs.writeFile(path.join(workspacePath, 'app.js'), appJs);
  }

  /**
   * Clone a workspace directory to another destination path
   */
  async cloneWorkspace(sourcePath, destPath) {
    return await this.fs.copyDirectory(sourcePath, destPath);
  }

  /**
   * Create a streaming ZIP archive of the workspace directory
   * @param {string} workspacePath
   * @returns {import('archiver').ZipArchive}
   */
  exportZipStream(workspacePath) {
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    archive.glob('**/*', {
      cwd: workspacePath,
      dot: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', '.DS_Store']
    });

    archive.finalize();
    return archive;
  }
}
