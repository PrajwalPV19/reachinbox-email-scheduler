import React, { useState, useEffect } from 'react';
import { campaignApi, senderApi } from '../services/api';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedFileStats {
  totalRows: number;
  validEmails: number;
  invalidEmails: number;
  duplicates: number;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [senders, setSenders] = useState<any[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState(() => {
    // Default to 1 minute in future
    const d = new Date(Date.now() + 60000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(100);

  const [recipients, setRecipients] = useState<string[]>([]);
  const [fileStats, setFileStats] = useState<ParsedFileStats | null>(null);
  const [_fileName, setFileName] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      senderApi.getAll().then((res) => {
        if (res.data && res.data.length > 0) {
          setSenders(res.data);
          setSelectedSenderId(res.data[0].id);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parseEmailsFromText = (text: string, sourceFileName?: string) => {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const lines = text.split(/[\r\n,;]+/).map((l) => l.trim()).filter(Boolean);
    const totalRows = lines.length;

    const matchedEmails = text.match(emailRegex) || [];
    const normalized = matchedEmails.map((e) => e.toLowerCase().trim());
    const unique = Array.from(new Set(normalized));

    const validCount = unique.length;
    const duplicateCount = normalized.length - validCount;
    const invalidCount = Math.max(0, totalRows - normalized.length);

    setRecipients(unique);
    setFileStats({
      totalRows,
      validEmails: validCount,
      invalidEmails: invalidCount,
      duplicates: duplicateCount,
    });
    if (sourceFileName) {
      setFileName(sourceFileName);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      parseEmailsFromText(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleManualAdd = () => {
    if (!manualInput.trim()) return;
    parseEmailsFromText(manualInput, 'Manual list');
    setManualInput('');
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updated = recipients.filter((e) => e !== emailToRemove);
    setRecipients(updated);
    if (fileStats) {
      setFileStats({
        ...fileStats,
        validEmails: updated.length,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (recipients.length === 0) {
      setErrorMsg('Please upload a CSV/text file or input at least 1 lead email.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Subject line is required.');
      return;
    }

    if (!body.trim()) {
      setErrorMsg('Email body content is required.');
      return;
    }

    try {
      setSubmitting(true);
      await campaignApi.create({
        subject,
        body,
        startTime: new Date(startTime).toISOString(),
        delayMs: delaySeconds * 1000,
        hourlyLimit,
        senderId: selectedSenderId || undefined,
        recipients,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Failed to schedule campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Compose & Schedule Campaign</h2>
            <p className="text-xs text-gray-500">Configure email jobs, throttling, and lead recipients</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sender & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">From Sender</label>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="w-full text-xs py-2 px-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ? `${s.name} (${s.email})` : s.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Subject Line</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Accelerate your pipeline with ReachInbox AI"
                required
                className="w-full text-xs py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{firstName}}, reached out because we noticed..."
              required
              className="w-full text-xs py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white leading-relaxed"
            />
          </div>

          {/* CSV / Lead Upload Section */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50/50 hover:bg-gray-50 transition">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800">Upload Leads CSV / Text</p>
                  <p className="text-[11px] text-gray-400">Drag or select a file containing lead email addresses</p>
                </div>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-xs font-medium text-gray-700 shadow-sm transition">
                <span>Browse File</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick paste alternative */}
            <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Or paste emails: test1@acme.com, test2@domain.com"
                className="flex-1 text-xs py-1.5 px-2.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleManualAdd}
                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-md transition"
              >
                Add Leads
              </button>
            </div>

            {/* Parsing Statistics */}
            {fileStats && (
              <div className="mt-3 p-2.5 bg-white rounded-lg border border-gray-200 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase">Total Rows</span>
                  <span className="font-bold text-gray-800">{fileStats.totalRows}</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-600 block uppercase font-medium">Valid Leads</span>
                  <span className="font-bold text-emerald-700">{fileStats.validEmails}</span>
                </div>
                <div>
                  <span className="text-[10px] text-amber-500 block uppercase">Duplicates</span>
                  <span className="font-bold text-amber-600">{fileStats.duplicates}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block uppercase">Invalid</span>
                  <span className="font-bold text-gray-600">{fileStats.invalidEmails}</span>
                </div>
              </div>
            )}

            {/* Recipient preview chips */}
            {recipients.length > 0 && (
              <div className="mt-3 max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-1">
                {recipients.slice(0, 15).map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="text-indigo-400 hover:text-indigo-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {recipients.length > 15 && (
                  <span className="text-[11px] text-gray-400 self-center pl-1">
                    +{recipients.length - 15} more leads
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Scheduler Parameters: Start Time, Delay, Rate Limit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full text-xs py-2 px-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Delay Between Sends
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 2)}
                  required
                  className="w-full text-xs py-2 px-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400">sec</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Hourly Limit
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 100)}
                  required
                  className="w-full text-xs py-2 px-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <span className="absolute right-3 top-2 text-xs text-gray-400">/hr</span>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || recipients.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Schedule {recipients.length > 0 ? `(${recipients.length} Emails)` : 'Campaign'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
