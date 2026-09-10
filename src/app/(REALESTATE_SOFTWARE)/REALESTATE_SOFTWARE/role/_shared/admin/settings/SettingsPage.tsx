'use client';

import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { resetPasswordByEmailAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/admin/settings/actions';

export default function SettingsPage() {
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [lastResetPasswords, setLastResetPasswords] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    const targetId = email.toLowerCase().trim();
    if (lastResetPasswords[targetId] === newPassword) {
      setMessage({ type: 'error', text: 'New password cannot be the exact same as the password you just set for this user.' });
      return;
    }

    const confirmed = window.confirm(`CRITICAL WARNING:\n\nAre you absolutely sure you want to reset the password for: ${targetId}?\n\nThis will instantly override their current password.`);
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    const res = await resetPasswordByEmailAction(email, newPassword);

    if (res.success) {
      setLastResetPasswords((prev) => ({ ...prev, [targetId]: newPassword }));
      setMessage({ type: 'success', text: res.message! });
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: res.error! });
    }

    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="flex flex-col mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-[#c4a55a]" />
          Security
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">Manage system security, roles, and access controls.</p>
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 flex-1">
        <h2 className="text-lg font-bold text-[#0f1d33] mb-4">Security Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-[#e8ecf2] rounded-xl p-5 flex flex-col items-start bg-[#f7f8fa]/50 hover:bg-[#f7f8fa] transition-colors">
            <div className="bg-white p-2.5 rounded-lg shadow-sm border border-[#e8ecf2] mb-4">
              <KeyRound className="w-5 h-5 text-[#1e3a5f]" />
            </div>
            <h3 className="font-semibold text-[#0f1d33] mb-1">Force Password Reset</h3>
            <p className="text-sm text-[#5a6a82] mb-4">Reset the password for any user using their Email Address.</p>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="mt-auto w-full py-2 bg-white border border-[#e8ecf2] text-[#0f1d33] font-semibold rounded-lg text-sm hover:bg-[#f3f5f8] transition-colors shadow-sm"
            >
              Reset Password
            </button>
          </div>
        </div>
      </div>

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1d33]/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-[#e8ecf2]">
              <h2 className="text-lg font-bold text-[#0f1d33] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#c4a55a]" />
                Reset User Password
              </h2>
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setMessage(null);
                  setEmail('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-[#5a6a82] hover:bg-[#f3f5f8] p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-4 md:p-5 space-y-4">
              {message && (
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a] transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-3 pr-10 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a] transition-all"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33] focus:outline-none">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-3 pr-10 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a] transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e8ecf2] flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-[#5a6a82] hover:bg-[#f3f5f8] rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="gradient-gold text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center min-w-[130px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
