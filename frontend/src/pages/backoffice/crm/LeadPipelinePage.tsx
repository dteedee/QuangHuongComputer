import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, DollarSign, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type PipelineView, type Lead, formatCurrency } from '../../../api/crm';
import { useConfirm } from '../../../context/ConfirmContext';
import { LeadCard } from '../../../components/crm';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';

// Draggable Wrapper
const DraggableLeadCard = ({ lead, onEdit, onConvert }: { lead: Lead, onEdit: any, onConvert: any }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.3 : 1,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none cursor-grab active:cursor-grabbing">
      <LeadCard
        lead={lead}
        onEdit={onEdit}
        onConvert={onConvert}
        isDragging={isDragging}
      />
    </div>
  );
};

// Droppable Column Wrapper
const DroppableColumn = ({ column, children }: { column: PipelineView, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: column.stage.id,
    data: { stageId: column.stage.id }
  });

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-80 flex-shrink-0 rounded-2xl p-4 flex flex-col transition-colors border-2 ${isOver ? 'bg-gray-100 border-accent/30 shadow-inner' : 'bg-gray-50 border-transparent'}`}
    >
      <div
        className="flex items-center justify-between mb-4 pb-3 border-b"
        style={{ borderColor: column.stage.color }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shadow-sm"
            style={{ backgroundColor: column.stage.color }}
          />
          <h3 className="font-bold text-gray-800 uppercase tracking-tight text-sm flex items-center gap-2">
             {column.stage.name}
             <span className="text-[10px] px-2 py-0.5 bg-white text-gray-600 rounded-full font-black drop-shadow-sm">
              {column.leads.length}
            </span>
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400">{column.stage.winProbability}% THẮNG</p>
          <p className="text-sm font-black text-emerald-600 tracking-tighter">
            {formatCurrency(column.stage.totalEstimatedValue)}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[150px]">
        {children}
      </div>
    </motion.div>
  );
};

export default function LeadPipelinePage() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineView[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const confirm = useConfirm();

  // Sensors to differentiate click vs drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Drag starts after 8px, allowing clicks on buttons
      },
    })
  );

  useEffect(() => {
    loadPipeline();
  }, []);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const data = await crmApi.leads.getPipeline();
      setPipeline(data);
    } catch (error) {
      console.error('Failed to load pipeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = active.data.current?.lead as Lead;
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;

    if (!over) return; // Dropped outside a column

    const leadId = String(active.id);
    const newStageId = String(over.id);

    // Find the current stage of the lead
    const currentColumn = pipeline.find(col => col.leads.some(l => l.id === leadId));
    if (!currentColumn) return;

    if (currentColumn.stage.id === newStageId) return; // Dropped in the same column

    // Optimistic UI Update
    setPipeline(prev => prev.map(col => {
      // Remove from old column
      if (col.stage.id === currentColumn.stage.id) {
        return { ...col, leads: col.leads.filter(l => l.id !== leadId) };
      }
      // Add to new column
      if (col.stage.id === newStageId) {
        const lead = active.data.current?.lead as Lead;
        return { ...col, leads: [...col.leads, lead] };
      }
      return col;
    }));

    try {
      await crmApi.leads.moveStage(leadId, newStageId);
      // Re-fetch to guarantee sync with server
      loadPipeline();
    } catch (error) {
      console.error('Failed to move lead:', error);
      loadPipeline(); // Rollback on failure
    }
  };

  const handleConvert = async (lead: Lead) => {
    const ok = await confirm({ message: 'Chuyển đổi lead này thành khách hàng?', variant: 'info' });
    if (!ok) return;
    try {
      await crmApi.leads.convert(lead.id);
      loadPipeline();
    } catch (error) {
      console.error('Failed to convert lead:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  // Calculate totals
  const totalLeads = pipeline.reduce((sum, p) => sum + p.leads.length, 0);
  const totalValue = pipeline.reduce((sum, p) => sum + p.stage.totalEstimatedValue, 0);

  return (
    <div className="p-6 h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Lead Pipeline</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
              <Users size={16} />
              {totalLeads} leads
            </span>
            <span className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">
              <DollarSign size={16} />
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/leads')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border-2 border-gray-100 rounded-xl hover:bg-gray-100 text-xs font-black uppercase tracking-widest text-gray-600 transition-colors"
          >
            Danh sách
          </button>
          <button
            onClick={() => navigate('/backoffice/crm/leads?new=true')}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-xl shadow-xl shadow-accent/20 hover:bg-accent-hover text-xs font-black uppercase tracking-widest transition-transform hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Thêm Lead
          </button>
        </div>
      </div>

      {/* Kanban Board Layout */}
      <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-max h-full items-start">
            {pipeline.map((column) => (
              <DroppableColumn key={column.stage.id} column={column}>
                {column.leads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    onEdit={(l: Lead) => navigate(`/backoffice/crm/leads/${l.id}`)}
                    onConvert={handleConvert}
                  />
                ))}

                {/* Add Lead Button at bottom of column */}
                {!column.stage.isFinalStage && (
                  <button
                    onClick={() => navigate(`/backoffice/crm/leads?new=true&stageId=${column.stage.id}`)}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-accent hover:bg-accent/5 rounded-xl border-2 border-dashed border-transparent hover:border-accent/20 transition-all"
                  >
                    <Plus size={16} />
                    Thêm lead
                  </button>
                )}
              </DroppableColumn>
            ))}

            {/* Empty State */}
            {pipeline.length === 0 && (
              <div className="flex-1 flex items-center justify-center w-full min-h-[300px]">
                <div className="text-center">
                  <Target size={48} className="mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-400 font-bold uppercase tracking-widest">Chưa có pipeline stage nào</p>
                  <button
                    onClick={() => navigate('/backoffice/crm/settings/pipeline')}
                    className="mt-4 text-accent hover:underline font-bold"
                  >
                    Cấu hình ngay
                  </button>
                </div>
              </div>
            )}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeLead ? (
              <div className="transform scale-105 rotate-3 shadow-2xl opacity-90">
                <LeadCard lead={activeLead} isDragging={true} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
