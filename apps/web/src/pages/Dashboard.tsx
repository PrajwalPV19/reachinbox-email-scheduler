import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { StatCards } from '../components/StatCards';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { ComposeModal } from '../components/ComposeModal';
import { emailApi, slackApi, senderApi } from '../services/api';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  const [stats, setStats] = useState({ scheduled: 0, sent: 0, failed: 0, total: 0 });
  const [sendersCount, setSendersCount] = useState(1);
  const [slackStatus, setSlackStatus] = useState<{ connected: boolean; teamName?: string; channelName?: string }>({
    connected: false,
  });

  const [scheduledEmails, setScheduledEmails] = useState<any[]>([]);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSlackStatus = useCallback(async () => {
    try {
      const res = await slackApi.getStatus();
      if (res.data) setSlackStatus(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchStatsAndSenders = useCallback(async () => {
    try {
      const [statsRes, sendersRes] = await Promise.all([
        emailApi.getStats(),
        senderApi.getAll(),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (sendersRes.data) setSendersCount(sendersRes.data.length);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      if (searchQuery.trim().length > 0) {
        // Query Elasticsearch
        const res = await emailApi.search(searchQuery);
        const allMatched = res.data?.emails || [];
        setScheduledEmails(allMatched.filter((e: any) => e.status !== 'sent' && e.status !== 'failed'));
        setSentEmails(allMatched.filter((e: any) => e.status === 'sent' || e.status === 'failed'));
      } else {
        const [scheduledRes, sentRes] = await Promise.all([
          emailApi.getScheduled(),
          emailApi.getSent(),
        ]);
        setScheduledEmails(scheduledRes.data?.emails || []);
        setSentEmails(sentRes.data?.emails || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchSlackStatus();
    fetchStatsAndSenders();
    fetchEmails();

    // Auto-refresh interval (every 8 seconds to reflect background worker progress)
    const interval = setInterval(() => {
      fetchStatsAndSenders();
      fetchEmails();
    }, 8000);

    return () => clearInterval(interval);
  }, [fetchSlackStatus, fetchStatsAndSenders, fetchEmails]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        user={user}
        slackStatus={slackStatus}
        onRefreshSlack={fetchSlackStatus}
        onLogout={onLogout}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome & Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Campaign Scheduler</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage queued outreach runs, inspect live delivery, and monitor Ethereal mailboxes.
            </p>
          </div>
          <button
            onClick={() => setIsComposeOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Compose New Email</span>
          </button>
        </div>

        {/* Real-Time Metrics */}
        <StatCards
          scheduledCount={stats.scheduled}
          sentCount={stats.sent}
          failedCount={stats.failed}
          sendersCount={sendersCount}
        />

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-semibold text-sm transition ${
                activeTab === 'scheduled'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>Scheduled Emails</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'scheduled' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {scheduledEmails.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('sent')}
              className={`py-4 px-1 inline-flex items-center gap-2 border-b-2 font-semibold text-sm transition ${
                activeTab === 'sent'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>Sent Emails</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === 'sent' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {sentEmails.length}
              </span>
            </button>
          </nav>

          <button
            onClick={() => {
              fetchStatsAndSenders();
              fetchEmails();
            }}
            className="text-xs text-gray-500 hover:text-indigo-600 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-gray-100 transition"
            title="Refresh tables"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {/* Content Table Section */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            loading={loading}
            onComposeNew={() => setIsComposeOpen(true)}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            loading={loading}
            onComposeNew={() => setIsComposeOpen(true)}
          />
        )}
      </main>

      {/* Compose Campaign Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchStatsAndSenders();
          fetchEmails();
          setActiveTab('scheduled');
        }}
      />
    </div>
  );
};
