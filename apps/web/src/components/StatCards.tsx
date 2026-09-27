import React from 'react';

interface StatCardsProps {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  sendersCount: number;
}

export const StatCards: React.FC<StatCardsProps> = ({
  scheduledCount,
  sentCount,
  failedCount,
  sendersCount,
}) => {
  const totalProcessed = sentCount + failedCount;
  const deliveryRate = totalProcessed > 0 ? Math.round((sentCount / totalProcessed) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Scheduled Queued</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{scheduledCount}</p>
          <span className="text-xs text-indigo-600 font-medium inline-flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            BullMQ Delayed
          </span>
        </div>
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Delivered Emails</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sentCount}</p>
          <span className="text-xs text-emerald-600 font-medium mt-1">Via Ethereal SMTP</span>
        </div>
        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Delivery Health</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{deliveryRate}%</p>
          <span className="text-xs text-gray-500 mt-1">{failedCount} failed attempts</span>
        </div>
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Sender Mailboxes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sendersCount}</p>
          <span className="text-xs text-purple-600 font-medium mt-1">Rate limits active</span>
        </div>
        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
