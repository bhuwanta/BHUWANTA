'use client';

import React, { useState } from 'react';
import { Settings, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { changeOwnPasswordAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/settings/actions';

export default function SelfSettingsPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLengthValid = password.length >= 8 && password.length <= 20;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    const res = await changeOwnPasswordAction(password);
    if (res.success) {
      setMessage({ type: 'success', text: res.message! });
      setPassword('');
      setConfirmPassword('');
    } else {
      setMessage({ type: 'error', text: res.error! });
    }
    setLoading(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#c4a55a]" />
            Settings
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Change your account password.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 space-y-4">
          {message && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{message.text}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#0f1d33] mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="space-y-1.5 mt-3 text-xs">
                {[
                  { ok: isLengthValid, label: '8-20 characters long' },
                  { ok: hasUpperCase, label: 'One uppercase letter' },
                  { ok: hasNumber, label: 'One number' },
                  { ok: hasSpecialChar, label: 'One special character (!@#$...)' },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-2 ${item.ok ? 'text-emerald-600' : 'text-[#5a6a82]'}`}>
                    {item.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50" />}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0f1d33] mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && <p className="text-xs text-red-600 mt-1.5">Passwords do not match.</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !password || !passwordsMatch}
            className="w-full gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
