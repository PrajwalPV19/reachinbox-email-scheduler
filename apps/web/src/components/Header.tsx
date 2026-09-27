import React, { useState } from 'react';
import { slackApi } from '../services/api';

interface HeaderProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string;
  };
  slackStatus: {
    connected: boolean;
    teamName?: string;
    channelName?: string;
  };
  onRefreshSlack: () => void;
  onLogout: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  slackStatus,
  onRefreshSlack,
  onLogout,
  onSearch,
  searchQuery,
}) => {
  const [connectingSlack, setConnectingSlack] = useState(false);

  const handleConnectSlack = async () => {
    try {
      setConnectingSlack(true);
      const res = await slackApi.getConnectUrl();
      if (res.authUrl) {
        window.location.href = res.authUrl;
      }
    } catch (err) {
      console.error('Failed to get Slack OAuth URL', err);
    } finally {
      setConnectingSlack(false);
    }
  };

  const handleDisconnectSlack = async () => {
    if (confirm('Disconnect Slack notifications?')) {
      await slackApi.disconnect();
      onRefreshSlack();
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-md shadow-indigo-100">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-900 tracking-tight">ReachInbox</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                Scheduler
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Outreach Job Engine</p>
          </div>
        </div>

        {/* Global Elasticsearch Search */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search leads, subjects, or body (Elasticsearch)..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => onSearch('')}
                className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Action Tools: BullMQ, Slack & User */}
        <div className="flex items-center gap-3">
          {/* Bull Board Queues Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition"
            title="Open Live BullMQ Dashboard"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Queue Board
          </a>

          {/* Slack Integration */}
          {slackStatus.connected ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-medium">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-7a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2H9zm0 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9V9zm7 6a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V10a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2-7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H8a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z"/>
              </svg>
              <span className="hidden md:inline">Slack Connected</span>
              <button
                onClick={handleDisconnectSlack}
                className="text-gray-400 hover:text-red-500 ml-1 text-xs"
                title="Disconnect Slack"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectSlack}
              disabled={connectingSlack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-sm transition"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 15a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2a2 2 0 0 1-2 2zm1 0a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zm2-7a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2H9zm0 1a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9V9zm7 6a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2v-2a2 2 0 0 1 2-2zm-1 0a2 2 0 0 1-2 2 2 2 0 0 1-2-2V10a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zm-2-7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H8a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5z"/>
              </svg>
              <span>Connect Slack</span>
            </button>
          )}

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2 border-l border-gray-200">
            <img
              src={user.avatarUrl || 'https://ui-avatars.com/api/?name=User&background=6366f1&color=fff'}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-gray-200 object-cover"
            />
            <div className="hidden lg:block text-left text-xs">
              <p className="font-semibold text-gray-900 leading-tight">{user.name}</p>
              <p className="text-gray-400 truncate max-w-[140px]">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
              title="Logout"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
