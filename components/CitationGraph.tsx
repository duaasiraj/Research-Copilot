
import React, { useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import { Reference } from '../types';
import { XIcon } from './Icons';

interface CitationGraphProps {
  onClose: () => void;
  mainPaperTitle: string;
  references: Reference[];
}

const CitationGraph: React.FC<CitationGraphProps> = ({ onClose, mainPaperTitle, references }) => {
  
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Main Node (Center)
    const centerNode: Node = {
      id: 'main',
      type: 'input',
      data: { label: mainPaperTitle || 'Current Paper' },
      position: { x: 0, y: 0 },
      style: { 
        background: '#7c3aed', 
        color: '#fff', 
        border: 'none', 
        borderRadius: '12px', 
        width: 280, 
        padding: '16px',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)',
        fontSize: '14px',
        lineHeight: '1.4'
      }
    };

    // Reference Nodes (Radial)
    const refNodes: Node[] = references.map((ref, i) => {
      // Calculate position in a circle
      const angle = (i / references.length) * 2 * Math.PI;
      const radius = 450; // Increased radius for better spacing
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      return {
        id: `ref-${i}`,
        data: { 
          label: (
            <div className="flex flex-col h-full justify-between">
              <div 
                className="font-semibold text-slate-800 dark:text-slate-100 leading-tight mb-2 line-clamp-3" 
                title={ref.title}
              >
                {ref.title}
              </div>
              <div className="text-slate-500 dark:text-slate-400 text-[11px] font-medium border-t border-slate-100 dark:border-slate-700 pt-2 mt-auto">
                {ref.author}
                {ref.year && <span className="ml-1 text-slate-400">• {ref.year}</span>}
              </div>
            </div>
          ) 
        },
        position: { x, y },
        style: {
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          width: 240, // Wider nodes
          padding: '12px',
          fontSize: '12px',
          color: '#1e293b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          height: 'auto',
          minHeight: '100px', // Ensure consistent height for aesthetics
          display: 'flex',
          flexDirection: 'column'
        }
      };
    });

    const edges: Edge[] = references.map((_, i) => ({
      id: `e-main-${i}`,
      source: 'main',
      target: `ref-${i}`,
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 1.5, opacity: 0.6 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }));

    return { nodes: [centerNode, ...refNodes], edges };
  }, [mainPaperTitle, references]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[95vw] h-[90vh] bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-500"></span>
              Citation Network
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Visualizing key references extracted from the bibliography
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.2}
            maxZoom={2.0}
            className="bg-slate-50 dark:bg-slate-950"
          >
            <Background color="#94a3b8" gap={20} size={1} variant={undefined} className="opacity-20" />
            <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg !m-4" />
          </ReactFlow>
          
          <div className="absolute bottom-6 left-6 pointer-events-none bg-white/80 dark:bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
             Scroll to zoom • Drag to move
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitationGraph;
