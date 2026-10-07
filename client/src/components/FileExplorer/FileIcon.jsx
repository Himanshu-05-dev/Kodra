import React from 'react';
import {
  FileText,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  Folder,
  FolderOpen,
  File
} from 'lucide-react';

export function FileIcon({ name, isDirectory, isOpen, size = 16 }) {
  if (isDirectory) {
    return isOpen ? (
      <FolderOpen size={size} className="text-yellow-400 shrink-0" />
    ) : (
      <Folder size={size} className="text-yellow-400 shrink-0" />
    );
  }

  const ext = name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'jsx':
    case 'tsx':
      return <FileCode2 size={size} className="text-blue-400 shrink-0" />;
    case 'js':
    case 'ts':
      return <FileCode2 size={size} className="text-yellow-300 shrink-0" />;
    case 'html':
      return <FileCode2 size={size} className="text-orange-400 shrink-0" />;
    case 'css':
      return <FileCode2 size={size} className="text-sky-400 shrink-0" />;
    case 'json':
      return <FileJson size={size} className="text-amber-300 shrink-0" />;
    case 'md':
      return <FileText size={size} className="text-emerald-400 shrink-0" />;
    case 'env':
      return <FileText size={size} className="text-red-400 shrink-0" />;
    default:
      return <File size={size} className="text-gray-400 shrink-0" />;
  }
}
