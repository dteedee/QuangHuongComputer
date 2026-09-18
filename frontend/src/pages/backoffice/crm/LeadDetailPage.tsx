import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, Building2, Calendar, DollarSign, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { crmApi, type LeadDetail, formatCurrency, formatDateTime, getLeadStatusColor } from '../../../api/crm';
import { LeadDetailConvertPanel } from '../../../components/crm/lead-detail-convert-panel';
import { LeadDetailInteractionsPanel } from '../../../components/crm/lead-detail-interactions-panel';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await crmApi.leads.getById(id);
      setLead(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="p-6 text-center py-20 text-gray-500">
        <p>Không tìm thấy lead này.</p>
        <button onClick={() => navigate('/backoffice/crm/leads')} className="mt-4 text-accent hover:underline">
          Về danh sách Leads
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/backoffice/crm/leads')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft size={16} />
        Danh sách Leads
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{lead.fullName}</h1>
              <span className={`text-xs px-3 py-1 rounded-full ${getLeadStatusColor(lead.status)}`}>{lead.statusName}</span>
            </div>
            <p className="text-gray-500 mt-1">{lead.sourceName}{lead.pipelineStageName ? ` · ${lead.pipelineStageName}` : ''}</p>
          </div>
          {lead.estimatedValue ? (
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase">Giá trị ước tính</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(lead.estimatedValue)}</p>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2 text-gray-600"><Mail size={14} className="text-gray-400" />{lead.email}</div>
          {lead.phone && <div className="flex items-center gap-2 text-gray-600"><Phone size={14} className="text-gray-400" />{lead.phone}</div>}
          {lead.company && <div className="flex items-center gap-2 text-gray-600"><Building2 size={14} className="text-gray-400" />{lead.company}{lead.jobTitle ? ` · ${lead.jobTitle}` : ''}</div>}
          {(lead.address || lead.city) && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin size={14} className="text-gray-400" />
              {[lead.address, lead.district, lead.city].filter(Boolean).join(', ')}
            </div>
          )}
          {lead.assignedToUserName && <div className="flex items-center gap-2 text-gray-600">Phân công: {lead.assignedToUserName}</div>}
          {lead.nextFollowUpAt && (
            <div className="flex items-center gap-2 text-orange-600">
              <Calendar size={14} />
              Follow-up: {formatDateTime(lead.nextFollowUpAt)}
              {lead.nextFollowUpNote ? ` — ${lead.nextFollowUpNote}` : ''}
            </div>
          )}
        </div>

        {lead.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600 whitespace-pre-wrap">{lead.notes}</div>
        )}

        {lead.interestedProducts && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <DollarSign size={14} />
            Quan tâm: {lead.interestedProducts}
          </div>
        )}
      </motion.div>

      <Can permission={PERMISSIONS.CRM_MANAGE_LEADS}>
        <LeadDetailConvertPanel lead={lead} onConverted={load} />
      </Can>

      <LeadDetailInteractionsPanel leadId={lead.id} interactions={lead.interactions} onAdded={load} />
    </div>
  );
}
