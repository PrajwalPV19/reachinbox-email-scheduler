import React from 'react';
import { EmptyState } from './EmptyState';

interface ScheduledEmail {
  id: string;
  recipient: string;
  subject: string;
  scheduledAt: string;
  status: string;
  senderEmail?: string;
}

interface ScheduledTableProps {
  emails: ScheduledEmail[];
  loading: boolean;
  onComposeNew: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  onComposeNew,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
            <div className="space-y-2 flex-1 max-w-sm">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-100 rounded-full w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        title="No scheduled emails in queue"
        description="Schedule a new outreach campaign to see your scheduled emails queued with BullMQ delayed timers."
        actionText="Compose New Campaign"
        onAction={onComposeNew}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/75">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Recipient
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Scheduled For
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {emails.map((email) => {
              const scheduledDate = new Date(email.scheduledAt);
              const formattedDate = isNaN(scheduledDate.getTime())
                ? email.scheduledAt
                : scheduledDate.toLocaleString();

              return (
                <tr key={email.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{email.recipient}</div>
                    {email.senderEmail && (
                      <div className="text-xs text-gray-400">From: {email.senderEmail}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                    {email.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                    {formattedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {email.status === 'rescheduled' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Rescheduled (Rate Limit)
                      </span>
                    ) : email.status === 'processing' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Processing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Scheduled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
