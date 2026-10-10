import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export function MainLayout({
  activityBar,
  sidebar,
  editorTabs,
  editor,
  terminal,
  chatPanel,
  rightPanel,
  isSidebarOpen = true,
  isTerminalOpen = true,
  isChatOpen = true,
  isRightPanelOpen
}) {
  const showRightPanel = isRightPanelOpen !== undefined ? isRightPanelOpen : isChatOpen;
  const rightContent = rightPanel || chatPanel;

  return (
    <div className="flex-1 w-full h-[calc(100vh-68px)] overflow-hidden bg-[#08090d] flex">
      {/* Activity Bar Dock */}
      {activityBar}

      {/* Main Panels Group */}
      <div className="flex-1 h-full overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar: File Explorer */}
          {isSidebarOpen && (
            <>
              <Panel defaultSize={18} minSize={14} maxSize={32} id="sidebar-panel">
                {sidebar}
              </Panel>
              <PanelResizeHandle className="w-1 bg-white/[0.04] hover:bg-purple-500 transition-colors" />
            </>
          )}

          {/* Center Workspace: Editor & Terminal */}
          <Panel defaultSize={showRightPanel ? 50 : 82} minSize={25} id="center-panel">
            <PanelGroup direction="vertical">
              {/* Top: Tabs & Monaco Editor */}
              <Panel defaultSize={isTerminalOpen ? 70 : 100} minSize={30} id="editor-panel">
                <div className="flex flex-col h-full w-full overflow-hidden bg-[#0c0e15]">
                  {editorTabs}
                  {editor}
                </div>
              </Panel>

              {/* Bottom: Terminal */}
              {isTerminalOpen && (
                <>
                  <PanelResizeHandle className="h-1 bg-white/[0.04] hover:bg-cyan-400 transition-colors" />
                  <Panel defaultSize={30} minSize={15} maxSize={60} id="terminal-panel">
                    {terminal}
                  </Panel>
                </>
              )}
            </PanelGroup>
          </Panel>

          {/* Right Panel: AI Copilot / Live Preview */}
          {showRightPanel && (
            <>
              <PanelResizeHandle className="w-1 bg-white/[0.04] hover:bg-purple-500 transition-colors" />
              <Panel defaultSize={32} minSize={18} maxSize={60} id="right-panel">
                {rightContent}
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
