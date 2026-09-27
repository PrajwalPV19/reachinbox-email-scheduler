import React from 'react';
import { EmptyState } from './EmptyState';

interface SentEmail {
  id: string;
  recipient: string;
  subject: string;
  sentAt?: string | null;
  status: string;
  etherealPreviewUrl?: string | null;
  failureReason?: string | null;
}

interface SentTableProps {
  emails: SentEmail[];
  loading: boolean;
  onComposeNew: () => void;
}

export const SentTable: React.FC<SentTableProps> = ({
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
        title="No sent emails yet"
        description="When scheduled jobs execute and emails are delivered via Ethereal SMTP, they will appear here with live preview links."
        actionText="Schedule New Campaign"
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
                Delivered At
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ethereal Preview
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-sm">
            {emails.map((email) => {
              const sentDate = email.sentAt ? new Date(email.sentAt) : null;
              const formattedDate = sentDate && !isNaN(sentDate.getTime())
                ? sentDate.toLocaleString()
                : 'Pending timestamp';

              return (
                <tr key={email.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {email.recipient}
                  </td>
                  <td className="px-6 py-4 text-gray-700 max-w-xs truncate">
                    {email.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">
                    {formattedDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {email.status === 'sent' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Delivered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {email.etherealPreviewUrl ? (
                      <a
                        href={email.etherealPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 transition"
                      >
                        <span>View Ethereal</span>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
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
