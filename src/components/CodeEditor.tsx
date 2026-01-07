import { useState, useEffect } from 'react';
import { X, Save, Upload, Code, FileCode, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { fn } from '../utils/supabase/info';

interface CodeEditorProps {
  userId: string;
  username: string;
  userRank: number;
  onClose: () => void;
}

interface FileItem {
  name: string;
  content: string;
  type: 'file' | 'folder';
}

export function CodeEditor({ userId, username, userRank, onClose }: CodeEditorProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Verify rank 5 access
    if (userRank !== 5) {
      setMessage({ type: 'error', text: 'Access Denied: Rank 5 (Owner/Co-Owner) required' });
      setTimeout(onClose, 2000);
      return;
    }

    loadSourceFiles();
  }, []);

  useEffect(() => {
    setHasChanges(fileContent !== originalContent);
  }, [fileContent, originalContent]);

  const loadSourceFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(fn('code'), { headers: { 'x-user-id': userId } });
      const data = await response.json();
      if (data.success) {
        setFiles(data.files || []);
        if (data.files.length > 0) {
          setSelectedFile(data.files[0].name);
          setFileContent(data.files[0].content);
          setOriginalContent(data.files[0].content);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to load files' });
      }
    } catch (error) {
      console.error('Error loading source files:', error);
      setMessage({ type: 'error', text: 'Failed to load source files' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (fileName: string) => {
    const file = files.find(f => f.name === fileName);
    if (file) {
      setSelectedFile(fileName);
      setFileContent(file.content);
      setOriginalContent(file.content);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile || !hasChanges) return;

    setIsSaving(true);
    try {
      const response = await fetch(fn('code/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, fileName: selectedFile, content: fileContent })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: `Saved ${selectedFile} successfully!` });
        setOriginalContent(fileContent);
        
        // Update files array
        setFiles(files.map(f => 
          f.name === selectedFile ? { ...f, content: fileContent } : f
        ));
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save file' });
      }
    } catch (error) {
      console.error('Error saving file:', error);
      setMessage({ type: 'error', text: 'Failed to save file' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishUpdate = async () => {
    if (!confirm('Are you sure you want to publish this update? This will deploy changes to all users.')) {
      return;
    }

    setIsPublishing(true);
    try {
      const response = await fetch(fn('code/publish'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, updateMessage: `Code update by ${username}` })
      });

      const data = await response.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Update published successfully! Reloading...' });
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to publish update' });
      }
    } catch (error) {
      console.error('Error publishing update:', error);
      setMessage({ type: 'error', text: 'Failed to publish update' });
    } finally {
      setIsPublishing(false);
    }
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts')) return '📘';
    if (fileName.endsWith('.css')) return '🎨';
    if (fileName.endsWith('.json')) return '📋';
    return '📄';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0a0a1f]/98 backdrop-blur-xl border border-purple-500/30 rounded-xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl shadow-purple-900/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white text-xl font-bold">Developer Code Editor</h2>
              <p className="text-gray-400 text-sm">Rank 5 Access - {username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="px-3 py-1 bg-yellow-600/30 text-yellow-300 text-sm rounded-lg border border-yellow-500/30">
                Unsaved Changes
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-red-600/30 hover:bg-red-600/50 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`p-3 border-b flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-600/20 border-green-500/30 text-green-300' 
              : 'bg-red-600/20 border-red-500/30 text-red-300'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(null)}
              className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Explorer */}
          <div className="w-64 bg-[#16161f]/80 border-r border-purple-500/20 flex flex-col">
            <div className="p-3 border-b border-purple-500/20">
              <h3 className="text-white text-sm font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Files
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-custom">
              {isLoading ? (
                <div className="p-4 text-gray-400 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading files...
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {files.map((file) => (
                    <button
                      key={file.name}
                      onClick={() => handleFileSelect(file.name)}
                      className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 transition-all ${
                        selectedFile === file.name
                          ? 'bg-purple-600/30 text-white border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-purple-500/10'
                      }`}
                    >
                      <span className="text-sm">{getFileIcon(file.name)}</span>
                      <span className="text-sm truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex flex-col">
            {selectedFile && (
              <>
                <div className="p-3 bg-[#16161f]/60 border-b border-purple-500/20 flex items-center justify-between">
                  <span className="text-white text-sm font-mono">{selectedFile}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveFile}
                      disabled={!hasChanges || isSaving}
                      className="px-4 py-2 bg-green-600/30 text-green-200 rounded-lg hover:bg-green-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm border border-green-500/30"
                    >
                      <Save className="w-4 h-4" />
                      {isSaving ? 'Saving...' : 'Save File'}
                    </button>
                    <button
                      onClick={handlePublishUpdate}
                      disabled={isPublishing}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm shadow-lg shadow-purple-500/30"
                    >
                      <Upload className="w-4 h-4" />
                      {isPublishing ? 'Publishing...' : 'Publish Update'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto">
                  <textarea
                    value={fileContent}
                    onChange={(e) => setFileContent(e.target.value)}
                    className="w-full h-full p-4 bg-[#0a0a1f]/50 text-white font-mono text-sm resize-none focus:outline-none scrollbar-custom"
                    spellCheck={false}
                    style={{
                      tabSize: 2,
                      lineHeight: '1.5'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-purple-500/20 bg-[#16161f]/60 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>⌨️ Ctrl+S to save</span>
            <span>⚡ Rank 5 Developer Access</span>
            <span>🔒 Changes logged</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Download className="w-3 h-3" />
            <span>Lines: {fileContent.split('\n').length}</span>
            <span>Characters: {fileContent.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
