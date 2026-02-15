import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, DollarSign, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { crmApi, type PipelineView, type Lead, formatCurrency } from '../../../api/crm';
import { LeadCard } from '../../../components/crm';

export default function LeadPipelinePage() {
  const navigate = useNavigate();
  const [pipeline, setPipeline] = useState<PipelineView[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleMoveStage = async (lead: Lead, newStageId: string) => {
    try {
      await crmApi.leads.moveStage(lead.id, newStageId);
      loadPipeline();
    } catch (error) {
      console.error('Failed to move lead:', error);
    }
  };

  const handleConvert = async (lead: Lead) => {
    if (!confirm('Chuyển đổi lead này thành khách hàng?')) return;
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
      </div>
    );
  }

  // Calculate totals
  const totalLeads = pipeline.reduce((sum, p) => sum + p.leads.length, 0);
  const totalValue = pipeline.reduce((sum, p) => sum + p.stage.totalEstimatedValue, 0);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Users size={14} />
              {totalLeads} leads
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={14} />
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/backoffice/crm/leads')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            <span>Xem danh sách</span>
          </button>
          <button
            onClick={() => navigate('/backoffice/crm/leads?new=true')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
          >
            <Plus size={18} />
            <span>Thêm Lead</span>
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full pb-4">
          {pipeline.map((column, columnIndex) => (
            <motion.div
              key={column.stage.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: columnIndex * 0.1 }}
              className="w-80 flex-shrink-0 bg-gray-50 rounded-2xl p-4 flex flex-col"
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between mb-4 pb-3 border-b"
                style={{ borderColor: column.stage.color }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.stage.color }}
                  />
                  <h3 className="font-semibold text-gray-800">{column.stage.name}</h3>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                    {column.leads.length}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{column.stage.winProbability}%</p>
                  <p className="text-sm font-medium text-green-600">
                    {formatCurrency(column.stage.totalEstimatedValue)}
                  </p>
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-3">
                {column.leads.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Không có lead nào
                  </div>
                ) : (
                  column.leads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onEdit={(lead) => navigate(`/backoffice/crm/leads/${lead.id}`)}
                      onConvert={handleConvert}
                    />
                  ))
                )}
              </div>

              {/* Add Lead Button */}
              {!column.stage.isFinalStage && (
                <button
                  onClick={() => navigate('/backoffice/crm/leads?new=true')}
                  className="mt-3 flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Plus size={16} />
                  <span>Thêm lead</span>
                </button>
              )}
            </motion.div>
          ))}

          {/* Empty State */}
          {pipeline.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Target size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Chưa có pipeline stage nào</p>
                <button
                  onClick={() => navigate('/backoffice/crm/settings/pipeline')}
                  className="mt-4 text-red-600 hover:underline"
                >
                  Cấu hình Pipeline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
