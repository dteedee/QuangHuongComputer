import { motion } from 'framer-motion';
import {
  FileText, Phone, Mail, Calendar, CheckSquare,
  MessageSquare, MessageCircle, Share2, Clock
} from 'lucide-react';
import type { Interaction, InteractionType } from '../../api/crm';
import { formatDateTime } from '../../api/crm';

interface CustomerTimelineProps {
  interactions: Interaction[];
  maxItems?: number;
}

const interactionIcons: Record<InteractionType, typeof FileText> = {
  Note: FileText,
  Call: Phone,
  Email: Mail,
  Meeting: Calendar,
  Task: CheckSquare,
  SMS: MessageSquare,
  Chat: MessageCircle,
  SocialMedia: Share2,
};

const interactionColors: Record<InteractionType, string> = {
  Note: 'bg-gray-100 text-gray-600',
  Call: 'bg-green-100 text-green-600',
  Email: 'bg-blue-100 text-blue-600',
  Meeting: 'bg-purple-100 text-purple-600',
  Task: 'bg-orange-100 text-orange-600',
  SMS: 'bg-cyan-100 text-cyan-600',
  Chat: 'bg-pink-100 text-pink-600',
  SocialMedia: 'bg-indigo-100 text-indigo-600',
};

export default function CustomerTimeline({ interactions, maxItems = 10 }: CustomerTimelineProps) {
  const displayedInteractions = interactions.slice(0, maxItems);

  if (displayedInteractions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Chưa có tương tác nào</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-4">
        {displayedInteractions.map((interaction, index) => {
          const Icon = interactionIcons[interaction.type] || FileText;
          const colorClass = interactionColors[interaction.type] || 'bg-gray-100 text-gray-600';

          return (
            <motion.div
              key={interaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex gap-4 pl-2"
            >
              {/* Icon */}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                <Icon size={16} />
              </div>

              {/* Content */}
              <div className="flex-1 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{interaction.subject}</h4>
                    <p className="text-xs text-gray-500">
                      {interaction.performedByUserName} - {formatDateTime(interaction.performedAt)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${colorClass}`}>
                    {interaction.typeName}
                  </span>
                </div>

                {interaction.content && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {interaction.content}
                  </p>
                )}

                {/* Extra details */}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                  {interaction.durationMinutes && (
                    <span className="bg-gray-50 px-2 py-1 rounded">
                      {interaction.durationMinutes} phút
                    </span>
                  )}
                  {interaction.callOutcome && (
                    <span className="bg-gray-50 px-2 py-1 rounded">
                      Kết quả: {interaction.callOutcome}
                    </span>
                  )}
                  {interaction.meetingLocation && (
                    <span className="bg-gray-50 px-2 py-1 rounded">
                      Địa điểm: {interaction.meetingLocation}
                    </span>
                  )}
                  {interaction.sentiment && (
                    <span className={`px-2 py-1 rounded ${
                      interaction.sentiment === 'Positive' ? 'bg-green-50 text-green-600' :
                      interaction.sentiment === 'Negative' ? 'bg-red-50 text-red-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {interaction.sentiment}
                    </span>
                  )}
                </div>

                {/* Follow-up */}
                {interaction.followUpDate && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded-lg text-sm">
                    <span className="font-medium text-yellow-800">Follow-up:</span>{' '}
                    <span className="text-yellow-700">{formatDateTime(interaction.followUpDate)}</span>
                    {interaction.followUpNote && (
                      <p className="text-yellow-600 mt-1">{interaction.followUpNote}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {interactions.length > maxItems && (
        <div className="text-center mt-4 text-sm text-gray-500">
          ... và {interactions.length - maxItems} tương tác khác
        </div>
      )}
    </div>
  );
}
