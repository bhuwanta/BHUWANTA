'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Key, Eye, EyeOff, ShieldAlert, CheckCircle2, Loader2 } from 'lucide-react';
import { checkPasswordsModuleStatusAction, updatePasswordAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/passwords/actions';

interface PasswordsModuleProps {
  role: string;
}

export default function PasswordsModule({ role }: PasswordsModuleProps) {
  const [loading, setLoading] = useState(true);
  const [moduleEnabled, setModuleEnabled] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkModuleStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const checkModuleStatus = async () => {
    setLoading(true);
    const res = await checkPasswordsModuleStatusAction(role);
    if (res.success) {
      setModuleEnabled(res.isEnabled);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setError('');
    setSuccess(false);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);
    const res = await updatePasswordAction(newPassword);
    if (res.success) {
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setError(res.error || 'Failed to update password.');
    }
    setSaving(false);
  };

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] min-h-full flex flex-col relative">
      <div className="flex flex-col mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#c4a55a]" />
          Settings
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">Manage your account preferences and security.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-[#5a6a82]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="max-w-xl w-full">
          {!moduleEnabled ? (
            <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <ShieldAlert className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-[#0f1d33] mb-2">Security Settings Disabled</h3>
              <p className="text-[#5a6a82] text-sm">
                The password management module is currently disabled for your role by the IT Administrator. Please contact support if you need to reset your password.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl overflow-hidden">
              <div className="border-b border-[#e8ecf2] p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f3f5f8] rounded-lg flex items-center justify-center shrink-0">
                  <Key className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0f1d33]">Change Password</h3>
                  <p className="text-[#5a6a82] text-xs">Update your account password securely.</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    Password updated successfully!
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-11 bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-4 pr-11 text-[#0f1d33] text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-11 bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-4 pr-11 text-[#0f1d33] text-sm focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full h-11 bg-gradient-to-r from-[#c4a55a] to-[#a38743] hover:from-[#a38743] hover:to-[#8c7336] text-white rounded-lg shadow-lg shadow-[#c4a55a]/20 font-semibold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Password'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
