import { motion } from 'framer-motion';
import {
  Phone, Mail, Building2, Calendar, DollarSign,
  User, MoreVertical, ArrowRight
} from 'lucide-react';
import type { Lead } from '../../api/crm';
import { formatCurrency, formatDate, getLeadStatusColor } from '../../api/crm';

interface LeadCardProps {
  lead: Lead;
  onEdit?: (lead: Lead) => void;
  onMoveStage?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  isDragging?: boolean;
}

export default function LeadCard({
  lead,
  onEdit,
  onMoveStage,
  onConvert,
  isDragging = false
}: LeadCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
      }}
      whileHover={{ y: -2 }}
      className={`bg-white rounded-xl p-4 border border-gray-100 cursor-pointer transition-all ${
        isDragging ? 'ring-2 ring-blue-400' : ''
      }`}
      onClick={() => onEdit?.(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{lead.fullName}</h4>
          {lead.company && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
              <Building2 size={12} />
              <span className="truncate">{lead.company}</span>
            </div>
          )}
        </div>
        <button
          className="p-1 hover:bg-gray-100 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Show menu
          }}
        >
          <MoreVertical size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Mail size={14} className="text-gray-400" />
          <span className="truncate">{lead.email}</span>
        </div>
        {lead.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone size={14} className="text-gray-400" />
            <span>{lead.phone}</span>
          </div>
        )}
      </div>

      {/* Value & Follow-up */}
      <div className="flex items-center justify-between text-sm mb-3">
        {lead.estimatedValue ? (
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <DollarSign size={14} />
            <span>{formatCurrency(lead.estimatedValue)}</span>
          </div>
        ) : (
          <span className="text-gray-400">--</span>
        )}

        {lead.nextFollowUpAt && (
          <div className="flex items-center gap-1 text-orange-600">
            <Calendar size={14} />
            <span>{formatDate(lead.nextFollowUpAt)}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {lead.assignedToUserName ? (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <User size={12} />
              <span className="truncate max-w-[80px]">{lead.assignedToUserName}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Chưa phân công</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${getLeadStatusColor(lead.status)}`}>
            {lead.sourceName}
          </span>

          {!lead.isConverted && lead.status !== 'Lost' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvert?.(lead);
              }}
              className="p-1 hover:bg-green-100 rounded text-green-600"
              title="Chuyển đổi"
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
