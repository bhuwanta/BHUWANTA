'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, UserCheck, Loader2, AlertCircle, Search, ChevronLeft, ChevronRight, X, Eye, EyeOff, Edit2, Trash2, CheckCircle2, Users, GitBranch, Clock, KeyRound, ShieldAlert } from 'lucide-react';
import {
  createExecutiveAction,
  getExecutivesAction,
  updateExecutiveAction,
  toggleExecutiveStatusAction,
  deleteExecutiveAction,
  getCreatableRolesAction,
  getFilterableRolesAction,
  getReportsToCandidatesAction,
  reassignReportsToAction,
  getSingletonRoleCountsAction,
} from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/user-management/actions';
import {
  getUsersForBulkPasswordAction,
  checkBulkPasswordModuleStatusAction,
  type BulkPasswordUser,
} from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/bulk-password-reset/actions';
import { getDirectorGcAssignmentsAction, setDirectorGcAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/payout-rules/actions';
import { getSalesRoleOrderAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/actions';
import { getFixedRoleLabelsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/commission-rates/fixed-role-actions';
import { ROLE_LABELS, type RealEstateRole } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/access/permissions';
import SearchableSelect from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/components/SearchableSelect';

interface PendingSaleInfo {
  registrationId: string;
  projectName: string;
  areaName: string;
  customerName: string;
  sellerName: string;
  submittedAt: string;
  plotSizeSqyd: number;
}

const ROLE_BADGE_CLASS: Record<RealEstateRole, string> = {
  it: 'bg-purple-50 text-purple-600',
  ceo: 'bg-amber-50 text-amber-600',
  governing_council: 'bg-[#c4a55a]/10 text-[#c4a55a]',
  operation_manager: 'bg-blue-50 text-blue-600',
  director: 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
  sr_core: 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
  core: 'bg-[#1e3a5f]/10 text-[#1e3a5f]',
  gm: 'bg-emerald-50 text-emerald-600',
  agm: 'bg-emerald-50 text-emerald-600',
  rm: 'bg-emerald-50 text-emerald-600',
  lio: 'bg-emerald-50 text-emerald-600',
  lia: 'bg-emerald-50 text-emerald-600',
  customer: 'bg-[#f3f5f8] text-[#5a6a82]',
};

interface UserManagementModuleProps {
  currentUserRole: RealEstateRole;
  currentUserId: string;
}

export default function UserManagementModule({ currentUserRole, currentUserId }: UserManagementModuleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [creatableRoles, setCreatableRoles] = useState<RealEstateRole[]>([]);
  // Separate from creatableRoles: peers can FILTER by Customer but must
  // never be offered it when CREATING a user (see getFilterableRolesAction).
  const [filterableRoles, setFilterableRoles] = useState<RealEstateRole[]>([]);
  const [roleSelection, setRoleSelection] = useState<RealEstateRole | ''>('');
  const [formData, setFormData] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // "Reports To" — IT-only, per-role: a Director's real upline is
  // S_director_gc (Governing Council), never parent_id (which is just
  // creation lineage for them); every other sales tier's parent_id IS
  // their real upline. reportsToMode picks which of those two this
  // edited user actually needs, based on their ORIGINAL role at the
  // moment the modal opened — not roleSelection, which the same form
  // lets IT change live, so this section doesn't shift under them mid-edit.
  const [reportsToMode, setReportsToMode] = useState<'director' | 'sales' | null>(null);
  const [reportsToOptions, setReportsToOptions] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [reportsToValue, setReportsToValue] = useState('');
  const [reportsToLoading, setReportsToLoading] = useState(false);
  const [savingReportsTo, setSavingReportsTo] = useState(false);
  const [reportsToMessage, setReportsToMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [blockedPendingSales, setBlockedPendingSales] = useState<PendingSaleInfo[] | null>(null);

  // ---------- Bulk password reset (IT only) ----------
  const [bulkOpen, setBulkOpen] = useState(false);
  // IT always has this; a sales-tier role only sees the button once
  // IT switches it on for their role via the Bulk Change Passwords
  // module (Modules page) — display-only, the real check re-runs
  // server-side on every actual request (requireBulkPasswordAccess).
  const [bulkPasswordEnabled, setBulkPasswordEnabled] = useState(false);
  const [bulkStep, setBulkStep] = useState<'pick' | 'password'>('pick');
  const [bulkUsers, setBulkUsers] = useState<BulkPasswordUser[]>([]);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState('');
  const [bulkShowPassword, setBulkShowPassword] = useState(false);
  const [bulkShowConfirm, setBulkShowConfirm] = useState(false);
  // Same four rules validatePassword() enforces server-side — shown live
  // here through the same PasswordChecklist the Edit User modal and the
  // set-password / forgot-password pages use, so the requirements read
  // identically everywhere a password is chosen.
  const bulkIsLengthValid = bulkPassword.length >= 8 && bulkPassword.length <= 20;
  const bulkHasUpperCase = /[A-Z]/.test(bulkPassword);
  const bulkHasNumber = /[0-9]/.test(bulkPassword);
  const bulkHasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(bulkPassword);
  const bulkPasswordValid = bulkIsLengthValid && bulkHasUpperCase && bulkHasNumber && bulkHasSpecialChar;
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<{ updated: number; failed: number } | null>(null);
  // Live progress while the streaming reset is running — the Route
  // Handler (role/it/modules/bulk-password-reset) sends one line per completed
  // batch, so this updates well before the whole run finishes instead
  // of sitting on a static spinner for however long 1,000+ accounts take.
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RealEstateRole | 'all'>('all');
  // Default to role order (IT, Operation Manager, Company, Governing
  // Council, sales cascade, Customer last) — same fixed structure as the
  // All/IT/OM/... filter tabs above the table, so the "All" view reads
  // as one coherent hierarchy instead of insertion order.
  const [sortCol, setSortCol] = useState('role');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  // Live counts for the two singleton-protected roles (Operation
  // Manager, Company) — lets the toggle disable itself up front for the
  // LAST active one of either, same as a user's own row, instead of
  // letting the click through and bouncing off the server-side guard.
  const [singletonCounts, setSingletonCounts] = useState({ operation_manager: 0, ceo: 0 });
  const itemsPerPage = 50;
  // ROLE_LABELS only covers the 5 fixed roles + the 8 built-in
  // sales-tier ones — a role renamed (or newly created) via the Roles/
  // Commissions page isn't reflected there, so every label lookup on
  // this page falls back to this dynamic map via roleLabel().
  const [dynamicLabels, setDynamicLabels] = useState<Record<string, string>>({});
  const roleLabel = (role: string): string => dynamicLabels[role] || ROLE_LABELS[role as RealEstateRole] || role;

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  useEffect(() => {
    getCreatableRolesAction(currentUserRole).then(setCreatableRoles);
    getFilterableRolesAction(currentUserRole).then(setFilterableRoles);
    if (currentUserRole === 'it') setBulkPasswordEnabled(true);
    else checkBulkPasswordModuleStatusAction(currentUserRole).then((res) => setBulkPasswordEnabled(res.isEnabled));
    Promise.all([getSalesRoleOrderAction(), getFixedRoleLabelsAction()]).then(([roleOrderRes, fixedLabelsRes]) => {
      const mergedLabels: Record<string, string> = {};
      roleOrderRes.data.forEach((r) => {
        mergedLabels[r.role_code] = r.label;
      });
      fixedLabelsRes.data.forEach((r) => {
        mergedLabels[r.role_code] = r.label;
      });
      setDynamicLabels(mergedLabels);
    });
  }, [currentUserRole]);

  const fetchUsers = async (showLoading = true) => {
    if (showLoading) setLoadingData(true);
    const [res] = await Promise.all([
      getExecutivesAction(currentUserRole, currentUserId, currentPage, itemsPerPage, searchQuery, roleFilter, sortCol, sortDir),
      getSingletonRoleCountsAction().then(setSingletonCounts),
    ]);
    if (res.success) {
      setUsers(res.data);
      setTotalUsers(res.count || 0);
    }
    if (showLoading) setLoadingData(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, roleFilter, sortCol, sortDir, searchQuery]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronRight className="w-3 h-3 rotate-90 opacity-40 ml-1 inline" />;
    return <ChevronRight className={`w-3 h-3 ml-1 inline transition-transform ${sortDir === 'asc' ? '-rotate-90' : 'rotate-90'}`} />;
  };

  const openBulkPassword = async () => {
    setBulkOpen(true);
    setBulkStep('pick');
    setBulkSearch('');
    setBulkPassword('');
    setBulkConfirm('');
    setBulkError('');
    setBulkResult(null);
    setBulkProgress(null);
    setBulkLoading(true);
    const res = await getUsersForBulkPasswordAction();
    if (res.success) {
      setBulkUsers(res.data);
      // Everyone selected by default — unticking is the deliberate act.
      setBulkSelected(new Set(res.data.map((u) => u.id)));
    } else {
      setBulkError(res.error || 'Failed to load users.');
    }
    setBulkLoading(false);
  };

  const bulkFiltered = bulkUsers.filter((u) => {
    const q = bulkSearch.trim().toLowerCase();
    if (!q) return true;
    return [u.full_name, u.bhuwanta_id, roleLabel(u.role)].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
  });

  const handleBulkReset = async () => {
    setBulkError('');
    if (bulkPassword !== bulkConfirm) {
      setBulkError('The two passwords do not match.');
      return;
    }
    setBulkSaving(true);
    setBulkProgress({ done: 0, total: bulkSelected.size });
    try {
      const response = await fetch('/REALESTATE_SOFTWARE/role/it/modules/bulk-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [...bulkSelected], password: bulkPassword }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        setBulkError(body.error || 'Bulk reset failed.');
        setBulkSaving(false);
        return;
      }

      // Newline-delimited JSON: read the stream as it arrives and update
      // the "X / Y done" count on every `progress` line, rather than
      // waiting for the single final response a plain Server Action
      // would have to give all at once.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: { updated: number; failed: number } | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line);
          if (evt.type === 'progress' || evt.type === 'start') {
            setBulkProgress({ done: evt.done ?? 0, total: evt.total });
          } else if (evt.type === 'done') {
            finalResult = { updated: evt.updated, failed: evt.failures?.length || 0 };
          } else if (evt.type === 'error') {
            streamError = evt.error;
          }
        }
      }

      setBulkSaving(false);
      if (streamError && !finalResult) {
        setBulkError(streamError);
        return;
      }
      if (finalResult) setBulkResult(finalResult);
    } catch (e: any) {
      setBulkSaving(false);
      setBulkError(e?.message || 'Bulk reset failed.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !roleSelection) return;

    setLoading(true);
    setMessage(null);

    if (isEditMode && editingUserId) {
      const res = await updateExecutiveAction(currentUserRole, currentUserId, editingUserId, {
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        role: roleSelection,
        password: formData.password || undefined,
      });

      if (res.success) {
        setMessage({ type: 'success', text: res.message! });
        fetchUsers(false);
        setTimeout(() => setIsModalOpen(false), 1500);
      } else {
        setMessage({ type: 'error', text: res.error! });
      }
      setLoading(false);
      return;
    }

    const res = await createExecutiveAction(currentUserRole, currentUserId, {
      fullName: formData.fullName,
      phone: formData.phone,
      email: formData.email,
      role: roleSelection,
    });

    if (res.success) {
      setMessage({ type: 'success', text: res.message! });
      setFormData({ fullName: '', phone: '', email: '', password: '' });
      fetchUsers(false);
      setTimeout(() => setIsModalOpen(false), 1500);
    } else {
      setMessage({ type: 'error', text: res.error! });
    }
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const confirmed = window.confirm(
      currentStatus
        ? 'Are you sure you want to deactivate this user? They will immediately lose access to their dashboard.'
        : 'Are you sure you want to activate this user? They will regain access to their dashboard.'
    );
    if (!confirmed) return;

    setUsers(users.map((u) => (u.id === id ? { ...u, is_active: !currentStatus } : u)));

    const res = await toggleExecutiveStatusAction(currentUserRole, currentUserId, id, currentStatus);
    if (!res.success) {
      alert(res.error);
      fetchUsers(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    const confirmed = window.confirm('Are you absolutely sure you want to PERMANENTLY DELETE this user? This action cannot be undone.');
    if (!confirmed) return;

    const res = await deleteExecutiveAction(currentUserRole, currentUserId, id);
    if (res.success) {
      await fetchUsers(true);
    } else {
      alert(res.error);
      setLoadingData(false);
    }
  };

  const openEditModal = (user: any) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setRoleSelection(user.role);
    setFormData({ fullName: user.full_name, phone: user.phone, email: user.email || '', password: '' });
    setIsModalOpen(true);
    setMessage(null);

    setReportsToMode(null);
    setReportsToOptions([]);
    setReportsToValue('');
    setReportsToMessage(null);
    setBlockedPendingSales(null);

    if (currentUserRole !== 'it') return;

    if (user.role === 'director') {
      setReportsToLoading(true);
      getDirectorGcAssignmentsAction().then((res) => {
        if (res.success) {
          setReportsToMode('director');
          setReportsToOptions(res.gcMembers.map((g) => ({ id: g.id, full_name: g.full_name, role: 'governing_council' })));
          const mine = res.directors.find((d) => d.directorId === user.id);
          setReportsToValue(mine?.gcId || '');
        }
        setReportsToLoading(false);
      });
    } else {
      setReportsToLoading(true);
      getReportsToCandidatesAction(user.id).then((res) => {
        if (res.success) {
          setReportsToMode('sales');
          setReportsToOptions(res.data);
          setReportsToValue(user.parent_id || '');
        }
        setReportsToLoading(false);
      });
    }
  };

  const handleSaveReportsTo = async () => {
    if (!editingUserId || !reportsToValue) return;
    setSavingReportsTo(true);
    setReportsToMessage(null);
    setBlockedPendingSales(null);

    const res = reportsToMode === 'director' ? await setDirectorGcAction(editingUserId, reportsToValue) : await reassignReportsToAction(editingUserId, reportsToValue);

    if (res.success) {
      setReportsToMessage({ type: 'success', text: res.message! });
      fetchUsers(false);
    } else if ('pendingSales' in res && res.pendingSales && res.pendingSales.length > 0) {
      setBlockedPendingSales(res.pendingSales);
    } else {
      setReportsToMessage({ type: 'error', text: res.error || 'Failed to reassign.' });
    }
    setSavingReportsTo(false);
  };

  const totalPages = Math.ceil(totalUsers / itemsPerPage);

  const hasUpperCase = /[A-Z]/.test(formData.password);
  const hasNumber = /[0-9]/.test(formData.password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
  const isLengthValid = formData.password.length >= 8 && formData.password.length <= 20;

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1d33]">User Management</h1>
          <p className="text-[#5a6a82] text-sm mt-1">Create and manage the people you're responsible for.</p>
        </div>

        <button
          onClick={() => {
            setIsEditMode(false);
            setEditingUserId(null);
            setFormData({ fullName: '', phone: '', email: '', password: '' });
            setRoleSelection(creatableRoles[0] || '');
            setIsModalOpen(true);
            setMessage(null);
          }}
          disabled={creatableRoles.length === 0}
          className="shrink-0 gradient-gold text-white font-semibold rounded-lg shadow-sm px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-opacity text-sm disabled:opacity-50"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-[#e8ecf2] flex flex-col gap-4 bg-white shrink-0">
          <div className="flex bg-[#f3f5f8] p-1 rounded-lg w-full overflow-x-auto hide-scrollbar">
            <button
              onClick={() => {
                setRoleFilter('all');
                setCurrentPage(1);
              }}
              className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                roleFilter === 'all' ? 'bg-white text-[#c4a55a] shadow-sm' : 'text-[#5a6a82] hover:text-[#0f1d33]'
              }`}
            >
              All
            </button>
            {filterableRoles.map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setCurrentPage(1);
                }}
                className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  roleFilter === role ? 'bg-white text-[#c4a55a] shadow-sm' : 'text-[#5a6a82] hover:text-[#0f1d33]'
                }`}
              >
                {roleLabel(role)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-4 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
              />
            </div>
            {bulkPasswordEnabled && (
              <button onClick={openBulkPassword} className="shrink-0 flex items-center gap-2 bg-white border border-[#e8ecf2] text-[#0f1d33] px-3 py-2 rounded-lg font-semibold shadow-sm hover:bg-[#f3f5f8] transition-colors text-sm whitespace-nowrap">
                <KeyRound className="w-4 h-4 text-[#5a6a82]" />
                Bulk Change Passwords
              </button>
            )}
            {!loadingData && (
              <div
                className="shrink-0 bg-white border border-[#e8ecf2] shadow-sm rounded-xl px-4 py-2 flex items-center gap-3"
                title={roleFilter !== 'all' || searchQuery ? 'Matches the current search/filter' : undefined}
              >
                <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-[#1e3a5f]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#5a6a82] font-semibold uppercase tracking-wide leading-none">Total Users</p>
                  <p className="text-lg font-bold text-[#0f1d33] leading-tight mt-0.5">{totalUsers}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse relative min-w-[900px]">
            <thead className="bg-[#f7f8fa] sticky top-0 z-10 shadow-[0_1px_0_#e8ecf2]">
              <tr className="text-[13px] uppercase tracking-wider text-[#5a6a82]">
                <th className="py-4 px-5 font-semibold w-20 whitespace-nowrap">Sr. No.</th>
                <th className="py-4 px-5 font-semibold w-40 whitespace-nowrap cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('bhuwanta_id')}>
                  Bhuwanta ID <SortIcon col="bhuwanta_id" />
                </th>
                <th className="py-4 px-5 font-semibold whitespace-nowrap cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('full_name')}>
                  Name <SortIcon col="full_name" />
                </th>
                <th className="py-4 px-5 font-semibold whitespace-nowrap cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('role')}>
                  Role <SortIcon col="role" />
                </th>
                <th className="py-4 px-5 font-semibold whitespace-nowrap cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('phone')}>
                  Phone / Email <SortIcon col="phone" />
                </th>
                <th className="py-4 px-5 font-semibold whitespace-nowrap cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('is_active')}>
                  Status <SortIcon col="is_active" />
                </th>
                <th className="py-4 px-5 font-semibold text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm text-[#0f1d33] divide-y divide-[#e8ecf2]">
              {loadingData ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a] mx-auto mb-2" />
                    <p className="text-[#5a6a82] text-sm">Loading users...</p>
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr key={user.id} className="hover:bg-[#f3f5f8] transition-colors">
                    <td className="py-4 px-5 text-[#5a6a82] text-sm whitespace-nowrap">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="py-4 px-5 font-mono text-sm text-[#0f1d33] font-semibold whitespace-nowrap">{user.bhuwanta_id || 'Pending...'}</td>
                    <td className="py-4 px-5 font-medium text-[#0f1d33] whitespace-nowrap">{user.full_name}</td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded text-xs font-semibold ${ROLE_BADGE_CLASS[user.role as RealEstateRole] || 'bg-emerald-50 text-emerald-600'}`}>
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-[#5a6a82] font-mono whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span>{user.phone}</span>
                        <span className="text-xs text-[#c4a55a]">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 whitespace-nowrap">
                      {(() => {
                        const isProtectedIt = user.role === 'it' && currentUserRole !== 'it';
                        const isLastActiveOm = user.role === 'operation_manager' && user.is_active && singletonCounts.operation_manager <= 1;
                        const isLastActiveCeo = user.role === 'ceo' && user.is_active && singletonCounts.ceo <= 1;
                        const toggleDisabled = user.id === currentUserId || isProtectedIt || isLastActiveOm || isLastActiveCeo;
                        const title = user.id === currentUserId
                          ? 'You cannot deactivate your own account'
                          : isProtectedIt
                            ? 'Only IT can deactivate an IT Admin account'
                            : isLastActiveOm
                              ? 'Cannot deactivate the last active Operation Manager — create or activate another one first'
                              : isLastActiveCeo
                                ? 'Cannot deactivate the last active Company account — create or activate another one first'
                                : user.is_active ? 'Click to Deactivate' : 'Click to Activate';
                        return (
                          <>
                            <button
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              disabled={toggleDisabled}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                user.is_active ? (toggleDisabled ? 'bg-emerald-500/50 cursor-not-allowed' : 'bg-emerald-500') : 'bg-[#e8ecf2]'
                              }`}
                              title={title}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                            <span className={`ml-2 text-xs font-semibold ${user.is_active ? 'text-emerald-600' : 'text-[#5a6a82]'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap space-x-1">
                      <button onClick={() => openEditModal(user)} className="text-[#5a6a82] hover:text-[#0f1d33] hover:bg-[#f3f5f8] p-2 rounded transition-colors inline-block" title="Edit User">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!user.is_active && !(user.role === 'it' && currentUserRole !== 'it') && (
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors inline-block" title="Delete User Permanently">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
              {!loadingData && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#5a6a82]">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#e8ecf2] p-4 flex items-center justify-between bg-white shrink-0 rounded-b-xl text-sm">
          <p className="text-[#5a6a82]">
            Showing <span className="font-semibold text-[#0f1d33]">{users.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{' '}
            <span className="font-semibold text-[#0f1d33]">{Math.min(currentPage * itemsPerPage, totalUsers)}</span> of <span className="font-semibold text-[#0f1d33]">{totalUsers}</span> users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-[#e8ecf2] rounded hover:bg-[#f3f5f8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[#0f1d33] font-medium px-2">
              Page {currentPage} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 border border-[#e8ecf2] rounded hover:bg-[#f3f5f8] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1d33]/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-[#e8ecf2] shrink-0">
              <h2 className="text-xl font-bold text-[#0f1d33]">{isEditMode ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#5a6a82] hover:bg-[#f3f5f8] p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              {message && (
                <div className={`p-3 rounded-lg mb-4 flex items-start gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <UserCheck className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Role</label>
                  <div className="flex flex-wrap gap-2">
                    {creatableRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleSelection(role)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${
                          roleSelection === role ? 'bg-[#0f1d33] text-white border-[#0f1d33]' : 'bg-white text-[#5a6a82] border-[#e8ecf2] hover:border-[#c4a55a]'
                        }`}
                      >
                        {roleLabel(role)}
                      </button>
                    ))}
                  </div>
                </div>

                {isEditMode && currentUserRole === 'it' && (reportsToLoading || reportsToMode) && (
                  <div className="bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg p-3">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#0f1d33] mb-2">
                      <GitBranch className="w-3.5 h-3.5 text-[#5a6a82]" />
                      {reportsToMode === 'director' ? 'Reports To (Governing Council)' : 'Reports To (Upline)'}
                    </label>
                    {reportsToLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[#5a6a82] py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1">
                            <SearchableSelect
                              value={reportsToValue}
                              onChange={setReportsToValue}
                              options={reportsToOptions.map((o) => ({ id: o.id, name: o.full_name || 'Unnamed' }))}
                              placeholder={reportsToMode === 'director' ? 'Pick a Governing Council member' : 'Pick who they report to'}
                              title={reportsToMode === 'director' ? 'Assign to a Governing Council member' : 'Who does this person report to?'}
                              searchPlaceholder="Search..."
                              noResultsText="No one available."
                              disabled={savingReportsTo}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveReportsTo}
                            disabled={savingReportsTo || !reportsToValue}
                            className="shrink-0 bg-[#1e3a5f] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#0f1d33] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {savingReportsTo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                          </button>
                        </div>
                        {reportsToMessage && (
                          <p className={`text-xs mt-2 ${reportsToMessage.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{reportsToMessage.text}</p>
                        )}
                        <p className="text-[11px] text-[#a0abbb] mt-2">
                          Only affects sales made from now on — nothing already recorded changes. Their whole existing team moves with them.
                        </p>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Phone Number (Login ID)</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                    />
                    {formData.phone.length > 0 && formData.phone.length < 10 && (
                      <p className="text-xs text-amber-600 mt-1">{10 - formData.phone.length} more digit{10 - formData.phone.length === 1 ? '' : 's'} needed.</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. user@example.com"
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                    />
                  </div>
                </div>

                {isEditMode ? (
                  <div>
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Reset Password (Optional)</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave blank to keep current password."
                        className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formData.password.length > 0 && <PasswordChecklist isLengthValid={isLengthValid} hasUpperCase={hasUpperCase} hasNumber={hasNumber} hasSpecialChar={hasSpecialChar} />}
                  </div>
                ) : (
                  <div className="bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg p-3 flex items-start gap-2.5">
                    <UserCheck className="w-4 h-4 text-[#1e3a5f] mt-0.5 shrink-0" />
                    <p className="text-[#5a6a82] text-xs">
                      No password to set here — an email will be sent to <span className="font-medium text-[#0f1d33]">{formData.email || 'their address'}</span> with a secure link for them to create their own password.
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !roleSelection}
                    className="w-full bg-[#0f1d33] text-white font-semibold rounded-lg py-2.5 flex items-center justify-center gap-2 hover:bg-[#1e3a5f] transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditMode ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {loading ? (isEditMode ? 'Updating...' : 'Creating...') : `${isEditMode ? 'Update' : 'Create'} ${roleSelection ? roleLabel(roleSelection) : 'User'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Bulk password reset (IT only) ---------- */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0f1d33]/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-[#e8ecf2] shrink-0">
              <h2 className="text-xl font-bold text-[#0f1d33] flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#c4a55a]" />
                Bulk Change Passwords
              </h2>
              <button onClick={() => setBulkOpen(false)} className="text-[#5a6a82] hover:bg-[#f3f5f8] p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkResult ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-lg font-bold text-[#0f1d33]">
                  Password changed for {bulkResult.updated} account{bulkResult.updated === 1 ? '' : 's'}.
                </p>
                {bulkResult.failed > 0 && <p className="text-sm text-red-600 mt-2">{bulkResult.failed} account(s) could not be updated.</p>}
                <p className="text-sm text-[#5a6a82] mt-2">Everyone affected must now sign in with the new password.</p>
                <button onClick={() => setBulkOpen(false)} className="mt-6 px-5 py-2.5 rounded-lg bg-[#0f1d33] text-white font-semibold text-sm hover:bg-[#1e3a5f] transition-colors">
                  Done
                </button>
              </div>
            ) : bulkStep === 'pick' ? (
              <>
                <div className="p-4 border-b border-[#e8ecf2] shrink-0 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
                    <input
                      type="text"
                      placeholder="Search by name, ID, or role..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#0f1d33]">
                      {bulkSelected.size} of {bulkUsers.length} selected
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setBulkSelected((prev) => new Set([...prev, ...bulkFiltered.map((u) => u.id)]))}
                        className="text-[#1e3a5f] font-semibold hover:underline text-xs"
                        title={bulkSearch ? 'Select everyone matching the current search' : 'Select everyone'}
                      >
                        Select all{bulkSearch ? ` (${bulkFiltered.length} shown)` : ''}
                      </button>
                      <button onClick={() => setBulkSelected(new Set())} className="text-[#5a6a82] font-semibold hover:underline text-xs">
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0">
                  {bulkLoading ? (
                    <div className="flex justify-center p-10">
                      <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
                    </div>
                  ) : bulkFiltered.length === 0 ? (
                    <p className="p-8 text-center text-sm text-[#5a6a82]">No users match that search.</p>
                  ) : (
                    bulkFiltered.map((u) => {
                      const checked = bulkSelected.has(u.id);
                      return (
                        <label key={u.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#f7f8fa] cursor-pointer border-b border-[#e8ecf2] last:border-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setBulkSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(u.id)) next.delete(u.id);
                                else next.add(u.id);
                                return next;
                              })
                            }
                            className="w-4 h-4 accent-[#c4a55a] shrink-0"
                          />
                          <span className="text-sm text-[#0f1d33] flex-1 truncate">{u.full_name || 'Unnamed'}</span>
                          <span className="text-xs text-[#5a6a82] shrink-0">{roleLabel(u.role)}</span>
                          <span className="text-[11px] text-[#a0abbb] shrink-0 w-32 text-right truncate">{u.bhuwanta_id || '—'}</span>
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="p-4 border-t border-[#e8ecf2] bg-[#f7f8fa] flex justify-end gap-3 shrink-0">
                  <button onClick={() => setBulkOpen(false)} className="px-4 py-2 text-sm font-semibold text-[#5a6a82] hover:bg-[#e8ecf2] rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setBulkError('');
                      setBulkStep('password');
                    }}
                    disabled={bulkSelected.size === 0}
                    className="px-5 py-2 text-sm font-semibold text-white bg-[#0f1d33] rounded-lg hover:bg-[#1e3a5f] transition-colors disabled:opacity-50"
                  >
                    Proceed ({bulkSelected.size})
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start text-amber-800 text-sm">
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                      Replaces the password on <strong>{bulkSelected.size} account{bulkSelected.size === 1 ? '' : 's'}</strong>
                      {' — '}can&apos;t be undone. Each gets an email with their new login. Your own account is excluded.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={bulkShowPassword ? 'text' : 'password'}
                        value={bulkPassword}
                        onChange={(e) => setBulkPassword(e.target.value)}
                        placeholder="8-20 chars, 1 uppercase, 1 number, 1 special"
                        className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                      />
                      <button type="button" onClick={() => setBulkShowPassword(!bulkShowPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]">
                        {bulkShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {bulkPassword.length > 0 && (
                      <PasswordChecklist isLengthValid={bulkIsLengthValid} hasUpperCase={bulkHasUpperCase} hasNumber={bulkHasNumber} hasSpecialChar={bulkHasSpecialChar} />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0f1d33] mb-1.5">Confirm Password</label>
                    <div className="relative">
                      <input
                        type={bulkShowConfirm ? 'text' : 'password'}
                        value={bulkConfirm}
                        onChange={(e) => setBulkConfirm(e.target.value)}
                        placeholder="Type it again"
                        className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2 pr-10 text-[#0f1d33] text-sm focus:outline-none focus:border-[#c4a55a] focus:ring-1 focus:ring-[#c4a55a]"
                      />
                      <button type="button" onClick={() => setBulkShowConfirm(!bulkShowConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6a82] hover:text-[#0f1d33]">
                        {bulkShowConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {bulkConfirm.length > 0 && (
                      <div className={`flex items-center gap-2 mt-2 text-xs ${bulkPassword === bulkConfirm ? 'text-emerald-600' : 'text-[#5a6a82]'}`}>
                        {bulkPassword === bulkConfirm ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50" />}
                        <span>Both passwords match</span>
                      </div>
                    )}
                  </div>

                  {bulkError && (
                    <p className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {bulkError}
                    </p>
                  )}

                  {/* Live "X / Y done" — one line arrives from the
                      streaming route per batch, well before the whole
                      run finishes. */}
                  {bulkSaving && bulkProgress && (
                    <div className="bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-semibold text-[#0f1d33] flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c4a55a]" />
                          Changing passwords...
                        </span>
                        <span className="text-[#5a6a82] font-medium">
                          {bulkProgress.done} / {bulkProgress.total} done
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#e8ecf2] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#c4a55a] transition-all duration-300 ease-out"
                          style={{ width: `${bulkProgress.total > 0 ? Math.round((bulkProgress.done / bulkProgress.total) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-[#e8ecf2] bg-[#f7f8fa] flex justify-end gap-3 shrink-0">
                  <button onClick={() => setBulkStep('pick')} disabled={bulkSaving} className="px-4 py-2 text-sm font-semibold text-[#5a6a82] hover:bg-[#e8ecf2] rounded-lg transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handleBulkReset}
                    disabled={bulkSaving || !bulkPasswordValid || bulkPassword !== bulkConfirm}
                    className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {bulkSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {bulkSaving ? `${bulkProgress?.done ?? 0} / ${bulkProgress?.total ?? bulkSelected.size} done...` : `Change ${bulkSelected.size} Password${bulkSelected.size === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Blocked-by-pending-sales popup ---------- */}
      {blockedPendingSales && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#0f1d33]/50 backdrop-blur-sm" onClick={() => setBlockedPendingSales(null)}>
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-[#e8ecf2] bg-amber-50 shrink-0">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-[#0f1d33]">Can&apos;t reassign yet</h3>
                  <p className="text-xs text-[#5a6a82] mt-1">
                    {blockedPendingSales.length} sale{blockedPendingSales.length === 1 ? ' is' : 's are'} still pending in this person&apos;s team. Commission for a sale only gets
                    locked in once it&apos;s marked <span className="font-semibold text-[#0f1d33]">Registration Done</span> — reassigning now would risk it paying out on a
                    different chain than the one that existed when the customer actually bought. Resolve the sale(s) below first (customer payment, then Registration Done),
                    then come back and reassign.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setBlockedPendingSales(null)} className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-white/60 shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-3 space-y-2">
              {blockedPendingSales.map((s) => (
                <div key={s.registrationId} className="border border-[#e8ecf2] rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0f1d33] truncate">
                      {s.projectName}
                      {s.areaName && <span className="text-[#5a6a82] font-normal"> — {s.areaName}</span>}
                    </p>
                    <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs text-[#5a6a82]">
                    <p>
                      Customer: <span className="text-[#0f1d33] font-medium">{s.customerName}</span>
                    </p>
                    <p>
                      Sold by: <span className="text-[#0f1d33] font-medium">{s.sellerName}</span>
                    </p>
                    <p>
                      Plot size: <span className="text-[#0f1d33] font-medium">{s.plotSizeSqyd} sq.yd</span>
                    </p>
                    <p>
                      Submitted: <span className="text-[#0f1d33] font-medium">{new Date(s.submittedAt).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <p className="text-[10px] text-[#a0abbb] mt-2 font-mono truncate" title={s.registrationId}>
                    Registration ID: {s.registrationId}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PasswordChecklist({ isLengthValid, hasUpperCase, hasNumber, hasSpecialChar }: { isLengthValid: boolean; hasUpperCase: boolean; hasNumber: boolean; hasSpecialChar: boolean }) {
  const items = [
    { ok: isLengthValid, label: '8-20 characters long' },
    { ok: hasUpperCase, label: 'One uppercase letter' },
    { ok: hasNumber, label: 'One number' },
    { ok: hasSpecialChar, label: 'One special character (!@#$...)' },
  ];
  return (
    <div className="space-y-2 mt-3 text-xs">
      {items.map((item) => (
        <div key={item.label} className={`flex items-center gap-2 ${item.ok ? 'text-emerald-600' : 'text-[#5a6a82]'}`}>
          {item.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current opacity-50" />}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
