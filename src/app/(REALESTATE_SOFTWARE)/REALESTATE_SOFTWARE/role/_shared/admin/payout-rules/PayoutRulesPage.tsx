'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Scale, Info, ChevronDown, Users, Globe2 } from 'lucide-react';
import {
  getPayoutRulesAction,
  setRoleScopeAction,
  setUserEarnsCommissionAction,
  previewPayoutAction,
  getPreviewRolesAction,
  getDirectorGcAssignmentsAction,
  setDirectorGcAction,
} from './actions';
import SearchableSelect from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/components/SearchableSelect';

type Scope = 'chain' | 'company_wide' | 'director_assigned' | 'company_wide_split';
type Message = { type: 'success' | 'error'; text: string } | null;

interface DirectorGcRow {
  directorId: string;
  directorName: string;
  gcId: string | null;
  gcName: string | null;
}

interface RoleRule {
  role_code: string;
  label: string;
  percentage: number | null;
  scope: Scope;
  holders: { id: string; full_name: string; earns_commission: boolean }[];
}

interface Preview {
  sellerName: string;
  sellerRole: string;
  pool: number;
  payees: { id: string; full_name: string; role: string; percentage: number; amount: number; isSeller: boolean }[];
  totalAmount: number;
  totalPercentage: number;
}

export default function PayoutRulesPage() {
  const [rules, setRules] = useState<RoleRule[]>([]);
  const [previewRoles, setPreviewRoles] = useState<{ role_code: string; label: string; representativeId: string; representativeName: string; holderCount: number }[]>([]);
  const [previewRoleCode, setPreviewRoleCode] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [directorRows, setDirectorRows] = useState<DirectorGcRow[]>([]);
  const [gcMembers, setGcMembers] = useState<{ id: string; full_name: string }[]>([]);

  const formatPrice = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const load = async () => {
    const [rulesRes, rolesRes, directorGcRes] = await Promise.all([getPayoutRulesAction(), getPreviewRolesAction(), getDirectorGcAssignmentsAction()]);
    if (rulesRes.success) setRules(rulesRes.data as RoleRule[]);
    else if (rulesRes.error) setMessage({ type: 'error', text: rulesRes.error });
    if (rolesRes.success) {
      setPreviewRoles(rolesRes.data);
      // Default to the lowest tier that anyone actually holds — the most
      // common seller, and the case with the longest payout chain.
      setPreviewRoleCode((prev) => prev || rolesRes.data[rolesRes.data.length - 1]?.role_code || '');
    }
    if (directorGcRes.success) {
      setDirectorRows(directorGcRes.directors as DirectorGcRow[]);
      setGcMembers(directorGcRes.gcMembers);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recomputed on every rule change so the headline number always
  // reflects what's on screen — the whole point of the panel is that a
  // costly change is visible before a real sale applies it.
  useEffect(() => {
    const chosen = previewRoles.find((r) => r.role_code === previewRoleCode);
    if (!chosen) return;
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      const res = await previewPayoutAction(chosen.representativeId);
      if (cancelled) return;
      setPreview(res.success ? (res.data as Preview) : null);
      setPreviewLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [previewRoleCode, previewRoles, rules]);

  const handleScopeChange = async (role: RoleRule, scope: Scope) => {
    if (role.scope === scope) return;
    const earning = role.holders.filter((h) => h.earns_commission).length;
    const confirmed = window.confirm(
      scope === 'company_wide'
        ? `Pay all ${earning} ${role.label} on EVERY sale in the company?\n\nThis means more money goes out on each sale. It only affects sales completed from now on.`
        : scope === 'company_wide_split'
        ? `Pay all ${earning} ${role.label} on EVERY sale, splitting their marginal cut equally among them?\n\nThe group earns the same total as one full share — each person gets 1/${earning || 1}. It only affects sales completed from now on.`
        : scope === 'director_assigned'
        ? `Pay only the one ${role.label} assigned to the selling Director's wing?\n\nEveryone else in this role stops earning on that sale. It only affects sales completed from now on.`
        : `Pay ${role.label} only when their own team makes a sale?\n\nThey will stop earning on sales made by anyone else. It only affects sales completed from now on.`
    );
    if (!confirmed) return;

    setBusyKey(role.role_code);
    setMessage(null);
    const res = await setRoleScopeAction(role.role_code, scope);
    setMessage(res.success ? { type: 'success', text: res.message! } : { type: 'error', text: res.error! });
    if (res.success) await load();
    setBusyKey(null);
  };

  const handleDirectorGcChange = async (directorId: string, gcId: string) => {
    if (!gcId) return;
    setBusyKey(directorId);
    setMessage(null);
    const res = await setDirectorGcAction(directorId, gcId);
    setMessage(res.success ? { type: 'success', text: res.message! } : { type: 'error', text: res.error! });
    if (res.success) await load();
    setBusyKey(null);
  };

  const handleEarnsToggle = async (holderId: string, next: boolean) => {
    setBusyKey(holderId);
    setMessage(null);
    const res = await setUserEarnsCommissionAction(holderId, next);
    setMessage(res.success ? { type: 'success', text: res.message! } : { type: 'error', text: res.error! });
    if (res.success) await load();
    setBusyKey(null);
  };

  /** What this role actually costs on the previewed sale — read off the
   * preview rather than recomputed here, so the per-role figure and the
   * headline total can never disagree. */
  const roleCost = (roleCode: string) => {
    if (!preview) return null;
    const lines = preview.payees.filter((p) => p.role === roleCode);
    if (lines.length === 0) return null;
    return { people: lines.length, each: lines[0].amount, total: lines.reduce((s, l) => s + l.amount, 0) };
  };

  if (loading) {
    return (
      <div className="p-6 bg-[#f7f8fa] min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] min-h-screen">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#c4a55a]" />
            Payout Rules
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Decides who earns money when a sale is made. How much each role earns is set on Roles / Commissions.</p>
        </div>

        {message && (
          <div className={`p-3 rounded-lg flex items-start gap-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{message.text}</p>
          </div>
        )}

        {/* ---------- Headline: what a sale costs right now ---------- */}
        <div className="bg-white border border-[#e8ecf2] rounded-xl shadow-sm overflow-hidden">
          <div className="p-5">
            <p className="text-[11px] uppercase tracking-widest font-bold text-[#5a6a82] mb-3">Try it out</p>

            <div className="max-w-sm">
              <SearchableSelect
                value={previewRoleCode}
                onChange={setPreviewRoleCode}
                options={previewRoles.map((r) => ({ id: r.role_code, name: r.label }))}
                placeholder="Pick a role"
                title="Which role made the sale?"
                searchPlaceholder="Search roles..."
                noResultsText="No matching role."
              />
            </div>

            {previewLoading || !preview ? (
              <div className="flex items-center gap-2 text-[#5a6a82] text-sm py-4 mt-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Working it out…
              </div>
            ) : (
              <>
                <div className="mt-5 pt-5 border-t border-[#e8ecf2]">
                  <p className="text-sm text-[#5a6a82]">
                    When a <span className="font-semibold text-[#0f1d33]">{previewRoles.find((r) => r.role_code === previewRoleCode)?.label || 'person'}</span> sells a plot, out of every{' '}
                    <span className="font-semibold text-[#0f1d33]">{formatPrice(preview.pool)}</span> of commission money the company sets aside:
                  </p>

                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-3">
                    <span className="text-4xl font-bold tracking-tight text-[#0f1d33]">{formatPrice(preview.totalAmount)}</span>
                    <span className="text-[#5a6a82] text-sm">
                      is shared between {preview.payees.length} {preview.payees.length === 1 ? 'person' : 'people'}
                    </span>
                  </div>
                  <p className="text-[#a0abbb] text-xs mt-1.5">The company keeps the remaining {formatPrice(preview.pool - preview.totalAmount)}.</p>
                  {/* Wing-scoped roles are resolved from real parent_id
                      links, so the example has to be based on somebody
                      real — said out loud, because a different person in
                      the same role can sit in a different team. */}
                  <p className="text-[#a0abbb] text-xs mt-1">Based on {preview.sellerName}&apos;s team as the example.</p>

                  <button onClick={() => setShowBreakdown((v) => !v)} className="mt-4 text-xs font-semibold text-[#1e3a5f] hover:underline inline-flex items-center gap-1">
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
                    {showBreakdown ? 'Hide' : 'Show'} who gets what
                  </button>

                  {showBreakdown && (
                    <div className="mt-3 rounded-lg border border-[#e8ecf2] divide-y divide-[#e8ecf2] overflow-hidden">
                      {preview.payees.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-[#f7f8fa]">
                          <span className="truncate text-[#0f1d33]">
                            {p.full_name}
                            {p.isSeller && <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-[#c4a55a]">made the sale</span>}
                          </span>
                          <span className="text-[#5a6a82] shrink-0 tabular-nums font-semibold">{formatPrice(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 bg-[#1e3a5f]/5 border border-[#1e3a5f]/15 rounded-lg p-3">
          <Info className="w-4 h-4 text-[#1e3a5f] mt-0.5 shrink-0" />
          <p className="text-sm text-[#1e3a5f]">
            Anything you change here only affects sales completed <span className="font-semibold">from now on</span>. Money already recorded against past sales never changes.
          </p>
        </div>

        {/* ---------- One card per role: scope + people together ---------- */}
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-[#5a6a82] mb-3">Roles, lowest to highest</p>
          <div className="space-y-3">
            {rules.map((role) => {
              const earning = role.holders.filter((h) => h.earns_commission);
              const cost = roleCost(role.role_code);
              const isCompanyWide = role.scope === 'company_wide';
              const isCompanyWideSplit = role.scope === 'company_wide_split';
              const isDirectorAssigned = role.scope === 'director_assigned';
              const busy = busyKey === role.role_code;
              const isGc = role.role_code === 'governing_council';

              return (
                <div key={role.role_code} className="bg-white border border-[#e8ecf2] rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#0f1d33]">{role.label}</h3>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#1e3a5f]/10 text-[#1e3a5f]">
                          {role.percentage != null ? `${role.percentage}%` : 'no rate set'}
                        </span>
                        {(isCompanyWide || isCompanyWideSplit) && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#c4a55a]/15 text-[#8a7333] inline-flex items-center gap-1">
                            <Globe2 className="w-3 h-3" />
                            {isCompanyWideSplit ? 'every sale, split equally' : 'every sale'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5a6a82] mt-1">
                        {isCompanyWide
                          ? `All ${earning.length} ${earning.length === 1 ? 'person' : 'people'} in this role earn on every sale in the company.`
                          : isCompanyWideSplit
                          ? `All ${earning.length} ${earning.length === 1 ? 'person' : 'people'} in this role earn on every sale in the company, splitting the marginal cut equally${earning.length > 1 ? ` (1/${earning.length} each)` : ''}.`
                          : isDirectorAssigned
                          ? 'Only the one Governing Council member assigned to the selling Director earns — see the section below to assign or reassign.'
                          : 'Earns only when someone in their own team makes the sale.'}
                        {cost && (
                          <span className="text-[#0f1d33] font-semibold">
                            {' '}
                            Gets {formatPrice(cost.total)} on this sale{cost.people > 1 ? ` — ${formatPrice(cost.each)} each` : ''}.
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="inline-flex items-center gap-1 bg-[#f3f5f8] p-1 rounded-lg border border-[#e8ecf2] shrink-0 self-start md:self-auto">
                      {(
                        isGc
                          ? [
                              { value: 'director_assigned' as const, label: 'By Director' },
                              { value: 'chain' as const, label: 'Own team only' },
                              { value: 'company_wide' as const, label: 'Every sale' },
                              { value: 'company_wide_split' as const, label: 'Every sale, split' },
                            ]
                          : [
                              { value: 'chain' as const, label: 'Own team only' },
                              { value: 'company_wide' as const, label: 'Every sale' },
                              { value: 'company_wide_split' as const, label: 'Every sale, split' },
                            ]
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => handleScopeChange(role, opt.value)}
                          disabled={busy}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all disabled:opacity-50 whitespace-nowrap ${
                            role.scope === opt.value ? 'bg-[#1e3a5f] text-white shadow' : 'text-[#5a6a82] hover:bg-white'
                          }`}
                        >
                          {busy && role.scope !== opt.value ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {role.holders.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-[#e8ecf2] pt-3">
                        <p className="text-[11px] text-[#5a6a82] mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {earning.length} of {role.holders.length} earning — click a name to switch them off
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {role.holders.map((h) => (
                            <button
                              key={h.id}
                              onClick={() => handleEarnsToggle(h.id, !h.earns_commission)}
                              disabled={busyKey === h.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 inline-flex items-center gap-2 ${
                                h.earns_commission ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' : 'bg-[#f3f5f8] border-[#e8ecf2] text-[#a0abbb] hover:bg-[#e8ecf2]'
                              }`}
                              title={h.earns_commission ? 'Earning — click to stop' : 'Not earning — click to resume'}
                            >
                              {busyKey === h.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${h.earns_commission ? 'bg-emerald-500' : 'bg-[#a0abbb]'}`} />
                              )}
                              {h.full_name || 'Unnamed'}
                              {!h.earns_commission && <span className="text-[10px] uppercase tracking-wide">off</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {role.holders.length === 0 && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-[#e8ecf2] pt-3">
                        <p className="text-xs text-[#a0abbb]">Nobody holds this role yet.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ---------- Director → Governing Council assignment ---------- */}
        <div>
          <p className="text-[11px] uppercase tracking-widest font-bold text-[#5a6a82] mb-3">Director → Governing Council</p>
          <div className="bg-white border border-[#e8ecf2] rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[#e8ecf2]">
              <p className="text-sm text-[#5a6a82]">
                Each Director is assigned to exactly one Governing Council member. When a sale happens inside a Director&apos;s wing, only their assigned Governing Council member earns
                — not everyone who holds the role.
              </p>
            </div>

            {directorRows.length === 0 ? (
              <div className="p-4">
                <p className="text-xs text-[#a0abbb]">No active Directors yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#e8ecf2]">
                {directorRows.map((row) => (
                  <div key={row.directorId} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0f1d33] text-sm truncate">{row.directorName || 'Unnamed'}</p>
                      <p className="text-xs text-[#5a6a82] mt-0.5">{row.gcName ? `Assigned to ${row.gcName}` : 'Not assigned yet'}</p>
                    </div>
                    <div className="w-full md:w-64 shrink-0">
                      <SearchableSelect
                        value={row.gcId || ''}
                        onChange={(gcId) => handleDirectorGcChange(row.directorId, gcId)}
                        options={gcMembers.map((g) => ({ id: g.id, name: g.full_name || 'Unnamed' }))}
                        placeholder="Assign a Governing Council member"
                        title={`Assign ${row.directorName || 'this Director'} to`}
                        searchPlaceholder="Search Governing Council..."
                        noResultsText="No Governing Council members found."
                        disabled={busyKey === row.directorId || gcMembers.length === 0}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gcMembers.length === 0 && (
              <div className="px-4 pb-4">
                <p className="text-xs text-[#a0abbb]">No active Governing Council members yet — add one before assigning Directors.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
