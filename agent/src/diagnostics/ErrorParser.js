/**
 * @file ErrorParser.js
 * Layer 4: Infrastructure - Diagnostic Analyzer for Build, Test, and Runtime Errors.
 * Parses terminal compiler output, stack traces, and test runners into structured actionable diagnostics.
 */

export class ErrorParser {
  /**
   * Parse stdout and stderr into structured diagnostics
   * @param {string} stdout
   * @param {string} stderr
   * @param {number} exitCode
   * @returns {{ hasError: boolean, errorType: string, summary: string, file?: string, line?: number, column?: number, suggestedAction: string, rawSnippet: string }}
   */
  static parse(stdout = '', stderr = '', exitCode = 0) {
    const combined = `${stderr}\n${stdout}`.trim();

    if (exitCode === 0 && !combined.includes('Error:') && !combined.includes('FAIL')) {
      return {
        hasError: false,
        errorType: 'None',
        summary: 'Command executed successfully without errors.',
        suggestedAction: 'No repair needed.',
        rawSnippet: ''
      };
    }

    // 1. Vite / Rollup compilation errors
    // E.g. [vite] Internal server error: /workspace/src/App.jsx: Unexpected token (14:8)
    const viteMatch = combined.match(/(?:\[vite\]|RollupError|Transform failed)[^\n]*?(?:error:)?\s*([^\s:]+\.[a-zA-Z0-9]+)[:\s]*(.*?)(?:\((\d+):(\d+)\)|:(\d+):(\d+))?(?:$|\n)/i);
    if (viteMatch) {
      const file = this._cleanFilePath(viteMatch[1]);
      const line = viteMatch[3] ? parseInt(viteMatch[3], 10) : (viteMatch[5] ? parseInt(viteMatch[5], 10) : undefined);
      const column = viteMatch[4] ? parseInt(viteMatch[4], 10) : (viteMatch[6] ? parseInt(viteMatch[6], 10) : undefined);

      return {
        hasError: true,
        errorType: 'CompilationError',
        file,
        line,
        column,
        summary: viteMatch[2]?.trim() || 'Compilation failed',
        suggestedAction: `Inspect ${file} and fix syntax or import error.`,
        rawSnippet: combined.slice(0, 600)
      };
    }

    // 2. SyntaxError / Babel / Node syntax error
    // E.g. SyntaxError: Unexpected token, expected "," (15:8) in src/math.js
    const syntaxMatch = combined.match(/SyntaxError:\s*(.*?)(?:in\s+([^\s:]+\.[a-zA-Z0-9]+))?(?:\s*\((\d+):(\d+)\))?/i);
    if (syntaxMatch) {
      return {
        hasError: true,
        errorType: 'SyntaxError',
        summary: syntaxMatch[1]?.trim() || 'Syntax error encountered',
        file: syntaxMatch[2] ? this._cleanFilePath(syntaxMatch[2]) : this._findFirstFileMention(combined),
        line: syntaxMatch[3] ? parseInt(syntaxMatch[3], 10) : undefined,
        column: syntaxMatch[4] ? parseInt(syntaxMatch[4], 10) : undefined,
        suggestedAction: 'Read the failing file and correct the invalid syntax or unclosed delimiters.',
        rawSnippet: combined.slice(0, 600)
      };
    }

    // 3. Module not found / Import resolution error
    // E.g. Cannot find module 'lodash' or Failed to resolve import "xyz"
    const moduleMatch = combined.match(/(?:Cannot find module|Failed to resolve import)\s*['"]([^'"]+)['"](?:\s*from\s*['"]([^'"]+)['"])?/i);
    if (moduleMatch) {
      const missingPackage = moduleMatch[1];
      const fromFile = moduleMatch[2];
      const isNpmPackage = !missingPackage.startsWith('.') && !missingPackage.startsWith('/');

      return {
        hasError: true,
        errorType: 'MissingDependency',
        summary: `Missing module: "${missingPackage}"`,
        file: fromFile ? this._cleanFilePath(fromFile) : this._findFirstFileMention(combined),
        suggestedAction: isNpmPackage
          ? `Run "npm install ${missingPackage}" or update the import path.`
          : `Create missing file "${missingPackage}" or fix relative import path.`,
        rawSnippet: combined.slice(0, 600)
      };
    }

    // 4. Test failure (Node:test, Jest, Vitest)
    // E.g. FAIL src/calculator.test.js or AssertionError [ERR_ASSERTION]: Expected 4 to equal 5
    const testMatch = combined.match(/(?:FAIL|AssertionError|✖)\s*([^\n:]+)?[:\s]*(.*)/i);
    if (testMatch) {
      return {
        hasError: true,
        errorType: 'TestFailure',
        summary: testMatch[2]?.trim() || testMatch[1]?.trim() || 'Assertion test failed',
        file: this._findFirstFileMention(combined),
        suggestedAction: 'Examine failing assertion, review implementation logic, and re-run test suite.',
        rawSnippet: combined.slice(0, 600)
      };
    }

    // 5. Generic runtime exception with stack trace (Error: / ReferenceError:)
    const stackMatch = combined.match(/([a-zA-Z0-9_]+Error):\s*(.*?)\n\s+at\s+.*?\(([^\s:]+\.[a-zA-Z0-9]+):(\d+):(\d+)\)/);
    if (stackMatch) {
      return {
        hasError: true,
        errorType: stackMatch[1],
        summary: stackMatch[2]?.trim() || 'Runtime error',
        file: this._cleanFilePath(stackMatch[3]),
        line: parseInt(stackMatch[4], 10),
        column: parseInt(stackMatch[5], 10),
        suggestedAction: `Investigate runtime exception in ${this._cleanFilePath(stackMatch[3])} at line ${stackMatch[4]}.`,
        rawSnippet: combined.slice(0, 600)
      };
    }

    // 6. Generic failure fallback
    const firstLine = combined.split('\n')[0] || `Command exited with non-zero status (${exitCode})`;
    return {
      hasError: true,
      errorType: 'ExecutionFailure',
      summary: firstLine.slice(0, 160),
      file: this._findFirstFileMention(combined),
      suggestedAction: 'Review error output, inspect code files, and apply necessary correction.',
      rawSnippet: combined.slice(0, 600)
    };
  }

  static _cleanFilePath(filePath) {
    if (!filePath) return undefined;
    return filePath
      .replace(/^.*[\\/]workspace[\\/]/, '')
      .replace(/^[\\/]/, '')
      .replace(/\\/g, '/');
  }

  static _findFirstFileMention(text) {
    const match = text.match(/(?:src|app|lib|test)[\\/][a-zA-Z0-9_/-]+\.[a-zA-Z0-9]+/);
    return match ? match[0].replace(/\\/g, '/') : undefined;
  }
}
