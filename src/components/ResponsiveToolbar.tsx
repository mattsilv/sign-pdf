import React, { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import './ResponsiveToolbar.css';

interface Tool {
  id: string;
  name: string;
  icon: string;
  action: () => void;
  active?: boolean;
}

interface ResponsiveToolbarProps {
  tools: Tool[];
  primaryTools?: string[];
  isDrawing?: boolean;
}

export const ResponsiveToolbar: React.FC<ResponsiveToolbarProps> = ({
  tools,
  primaryTools = [],
  isDrawing = false
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool.id);
    tool.action();
    
    if (isMobile && !primaryTools.includes(tool.id)) {
      setIsExpanded(false);
    }
  };

  const visibleTools = isMobile 
    ? tools.filter(t => primaryTools.includes(t.id))
    : tools;

  const hiddenTools = isMobile 
    ? tools.filter(t => !primaryTools.includes(t.id))
    : [];

  if (!isMobile) {
    return (
      <div className="desktop-toolbar">
        {tools.map(tool => (
          <button
            key={tool.id}
            className={`toolbar-button ${tool.active ? 'active' : ''} ${selectedTool === tool.id ? 'selected' : ''}`}
            onClick={() => handleToolClick(tool)}
            disabled={isDrawing && tool.id !== 'draw'}
            aria-label={tool.name}
          >
            <span className="toolbar-icon">{tool.icon}</span>
            <span className="toolbar-label">{tool.name}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mobile-toolbar">
        <div className="mobile-toolbar-primary">
          {visibleTools.map(tool => (
            <button
              key={tool.id}
              className={`mobile-toolbar-button ${tool.active ? 'active' : ''} ${selectedTool === tool.id ? 'selected' : ''}`}
              onClick={() => handleToolClick(tool)}
              disabled={isDrawing && tool.id !== 'draw'}
              aria-label={tool.name}
            >
              <span className="toolbar-icon">{tool.icon}</span>
            </button>
          ))}
          {hiddenTools.length > 0 && (
            <button
              className="mobile-toolbar-button more-button"
              onClick={() => setIsExpanded(true)}
              aria-label="More tools"
            >
              <span className="toolbar-icon">⋯</span>
            </button>
          )}
        </div>
      </div>

      <BottomSheet
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        snapPoints={[0.3, 0.5]}
        defaultSnapPoint={0}
        showHandle={true}
      >
        <div className="bottom-sheet-tools">
          <h3 className="bottom-sheet-title">All Tools</h3>
          <div className="bottom-sheet-grid">
            {hiddenTools.map(tool => (
              <button
                key={tool.id}
                className={`bottom-sheet-tool ${tool.active ? 'active' : ''}`}
                onClick={() => handleToolClick(tool)}
                disabled={isDrawing && tool.id !== 'draw'}
              >
                <span className="bottom-sheet-tool-icon">{tool.icon}</span>
                <span className="bottom-sheet-tool-label">{tool.name}</span>
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
};