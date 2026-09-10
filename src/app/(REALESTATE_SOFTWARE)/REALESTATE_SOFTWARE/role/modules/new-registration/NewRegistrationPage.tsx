'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ClipboardPlus, Loader2, AlertCircle, CheckCircle2, IndianRupee, Search, UserRound, X } from 'lucide-react';
import { getMyProjectsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/my-projects/actions';
import { createRegistrationAction, searchCustomersAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/registration-status/actions';
import { notifyRegistrationsChanged } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/events/registrations-notify';
import SearchableSelect from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/components/SearchableSelect';
import { calculateReferenceTotalAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/modules/new-registration/actions';

export default function NewRegistrationPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [areaId, setAreaId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [plotSize, setPlotSize] = useState('');
  const [finalTotalAmount, setFinalTotalAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // "Old Customer" — links the new registration to an existing
  // account instead of creating (or silently reusing, as this used to
  // do) another one. See searchCustomersAction/createRegistrationAction.
  const [customerMode, setCustomerMode] = useState<'new' | 'existing'>('new');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<{ id: string; full_name: string; phone: string; email: string; last_address: string }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; full_name: string; phone: string; email: string; last_address: string } | null>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  // Old-customer flow: their last known address is reused as-is unless
  // the seller explicitly says it changed, so the common case (same
  // address) needs no typing at all.
  const [addressChanged, setAddressChanged] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // The banner renders above a long form, so a submit from the bottom
  // would otherwise leave the confirmation off-screen.
  const messageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (message) messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [message]);

  useEffect(() => {
    (async () => {
      setLoadingProjects(true);
      const res = await getMyProjectsAction();
      if (res.success) setProjects(res.data);
      setLoadingProjects(false);
    })();
  }, []);

  // Areas derived from the seller's actually-assigned projects only —
  // never a company-wide area list, since a seller can only ever pick a
  // project their Director is assigned to (§5).
  const areas = Array.from(new Map(projects.filter((p) => p.s_areas).map((p) => [p.s_areas.id, p.s_areas])).values());
  const projectsInArea = projects.filter((p) => p.s_areas?.id === areaId);
  const selectedProject = projects.find((p) => p.id === projectId);

  const resetForm = () => {
    setAreaId('');
    setProjectId('');
    setPlotSize('');
    setFinalTotalAmount('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerMode('new');
    setCustomerSearchQuery('');
    setCustomerSearchResults([]);
    setSelectedCustomer(null);
    setCustomerSearchError(null);
    setIsCustomerSearchOpen(false);
    setAddressChanged(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !plotSize || !finalTotalAmount) {
      setMessage({ type: 'error', text: 'Select a Project, and enter the plot size and the Final MRP Customer Should Pay.' });
      return;
    }
    if (customerMode === 'existing' && !selectedCustomer) {
      setMessage({ type: 'error', text: 'Search for the old customer and select them before submitting.' });
      return;
    }
    if (customerMode === 'new' && (!customerName.trim() || !customerPhone.trim() || !customerEmail.trim())) {
      setMessage({ type: 'error', text: 'Customer name, phone, and email are required.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await createRegistrationAction({
      areaId,
      projectId,
      plotSizeSqyd: parseFloat(plotSize),
      finalTotalAmount: parseFloat(finalTotalAmount),
      // For an old customer whose address hasn't changed, carry their
      // last known address onto this registration rather than leaving
      // this row's snapshot blank.
      customerAddress:
        customerMode === 'existing' && !addressChanged
          ? selectedCustomer?.last_address || undefined
          : customerAddress.trim() || undefined,
      ...(customerMode === 'existing'
        ? { existingCustomerId: selectedCustomer!.id }
        : {
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerEmail: customerEmail.trim(),
          }),
    });

    if (res.success) {
      setMessage({ type: 'success', text: res.message! });
      resetForm();
      notifyRegistrationsChanged();
    } else {
      setMessage({ type: 'error', text: res.error! });
    }
    setLoading(false);
  };

  const formatPrice = (v: number | null) => (v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v));

  // Reference-only math shown to the agent, never submitted (submission
  // sends plotSize/finalTotalAmount as-is — see handleSubmit). Computed
  // server-side (calculateReferenceTotalAction) rather than in the
  // browser — this app's zero-frontend-math rule applies even to a
  // cosmetic, non-submitted readout. Debounced so it doesn't hit the
  // server on every single keystroke.
  const [referenceCalc, setReferenceCalc] = useState<{ raw: number; rounded: number; roundingDiff: number } | null>(null);
  const mrpRate = selectedProject?.mrp_default;

  useEffect(() => {
    const parsedPlotSize = parseFloat(plotSize);
    if (mrpRate == null || !plotSize || !Number.isFinite(parsedPlotSize) || parsedPlotSize <= 0) {
      setReferenceCalc(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const res = await calculateReferenceTotalAction(parsedPlotSize, mrpRate);
      if (res.success) setReferenceCalc({ raw: res.raw, rounded: res.rounded, roundingDiff: res.roundingDiff });
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [plotSize, mrpRate]);

  // Returning-customer search — debounced, only once the query is long
  // enough to be worth a lookup (matches the 3-char minimum
  // searchCustomersAction itself enforces). Clears stale results/errors
  // on every keystroke so nothing lingers against a query that's since
  // changed.
  useEffect(() => {
    setCustomerSearchResults([]);
    setCustomerSearchError(null);

    if (!isCustomerSearchOpen || customerSearchQuery.trim().length < 3) {
      return;
    }

    setSearchingCustomer(true);
    const timeoutId = setTimeout(async () => {
      const res = await searchCustomersAction(customerSearchQuery.trim());
      if (res.success) {
        setCustomerSearchResults(res.customers);
        if (res.customers.length === 0) setCustomerSearchError('No customers found matching that search.');
      } else {
        setCustomerSearchError(res.error || 'Failed to search for that customer.');
      }
      setSearchingCustomer(false);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      setSearchingCustomer(false);
    };
  }, [isCustomerSearchOpen, customerSearchQuery]);

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <ClipboardPlus className="w-6 h-6 text-[#c4a55a]" />
            New Registration
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Submit a new plot sale. The Operation Manager processes it once the customer completes payment.</p>
        </div>

        {message && (
          <div
            ref={messageRef}
            className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${message.type === 'success' ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-800' : 'text-red-800'}`}>{message.text}</p>
          </div>
        )}

        {loadingProjects ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl text-amber-800 text-sm">
            No Project is available for you to sell yet — ask IT, CEO, or Governing Council to assign one before you can submit a New Registration.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-6 space-y-5">
            <div className="pb-4 border-b border-[#e8ecf2]">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <p className="text-sm font-bold text-[#0f1d33]">Customer Details</p>
                <div className="flex items-center gap-2 bg-[#f7f8fa] p-1 rounded-lg border border-[#e8ecf2] w-fit">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('new')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${customerMode === 'new' ? 'bg-[#1e3a5f] text-white shadow' : 'text-[#5a6a82] hover:bg-white'}`}
                  >
                    New Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${customerMode === 'existing' ? 'bg-[#1e3a5f] text-white shadow' : 'text-[#5a6a82] hover:bg-white'}`}
                  >
                    Old Customer
                  </button>
                </div>
              </div>

              {customerMode === 'new' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      title="Used to create their Customer Dashboard login."
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-[#0f1d33] mb-2">Address (optional)</label>
                    <textarea
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      rows={2}
                      className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedCustomer ? (
                    <div className="flex items-start justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3 max-w-sm">
                      <div className="flex items-start gap-3 min-w-0">
                        <UserRound className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="text-sm min-w-0">
                          <p className="font-semibold text-[#0f1d33] truncate">
                            {selectedCustomer.full_name} <span className="font-normal text-emerald-700">— Selected</span>
                          </p>
                          <p className="text-[#5a6a82] text-xs mt-0.5 truncate">
                            {selectedCustomer.phone} · {selectedCustomer.email}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerSearchQuery('');
                          setAddressChanged(false);
                          setCustomerAddress('');
                        }}
                        title="Change customer"
                        className="text-[#5a6a82] hover:text-[#0f1d33] shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                        Phone Number or Email <span className="text-red-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCustomerSearchOpen(true)}
                        className="w-full flex items-center gap-2 bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-sm text-left text-[#5a6a82] hover:border-[#1e3a5f] transition-colors"
                      >
                        <Search className="w-4 h-4 shrink-0" />
                        <span>Search for a customer</span>
                      </button>
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="max-w-md">
                      {selectedCustomer.last_address ? (
                        <>
                          <label className="block text-sm font-semibold text-[#0f1d33] mb-2">Address on file</label>
                          <p className="bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-sm text-[#0f1d33] whitespace-pre-wrap">{selectedCustomer.last_address}</p>
                          <label className="flex items-center gap-2 mt-2 text-sm text-[#5a6a82] cursor-pointer w-fit">
                            <input
                              type="checkbox"
                              checked={addressChanged}
                              onChange={(e) => {
                                setAddressChanged(e.target.checked);
                                if (!e.target.checked) setCustomerAddress('');
                              }}
                              className="rounded border-[#e8ecf2] accent-[#1e3a5f]"
                            />
                            The address has changed
                          </label>
                          {addressChanged && (
                            <div className="mt-3">
                              <label className="block text-sm font-semibold text-[#0f1d33] mb-2">New Address</label>
                              <textarea
                                value={customerAddress}
                                onChange={(e) => setCustomerAddress(e.target.value)}
                                rows={2}
                                autoFocus
                                className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <label className="block text-sm font-semibold text-[#0f1d33] mb-2">Address (optional)</label>
                          <p className="text-xs text-[#5a6a82] mb-2">No address on file for this customer yet.</p>
                          <textarea
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            rows={2}
                            className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] resize-none"
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                  Area <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={areaId}
                  onChange={(id) => {
                    setAreaId(id);
                    setProjectId('');
                  }}
                  options={areas.map((area: any) => ({ id: area.id, name: area.name }))}
                  placeholder="Select an Area"
                  title="Select an Area"
                  searchPlaceholder="Search areas..."
                  noResultsText="No areas match your search."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                  Project <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={projectId}
                  onChange={setProjectId}
                  options={projectsInArea.map((p: any) => ({ id: p.id, name: p.name }))}
                  placeholder={areaId ? 'Select a Project' : 'Select an Area first'}
                  title="Select a Project"
                  disabled={!areaId}
                  searchPlaceholder="Search projects..."
                  noResultsText="No projects match your search."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-2">
                  Plot Size (sq.yards) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={plotSize}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const decimalIndex = raw.indexOf('.');
                    // Cap at 2 digits after the decimal point — the DB
                    // column is DECIMAL(10,2), so a 3rd digit would just
                    // get silently rounded away by Postgres on insert.
                    // Capping it here means what's shown always matches
                    // what actually gets stored.
                    setPlotSize(decimalIndex !== -1 && raw.length - decimalIndex - 1 > 2 ? raw.slice(0, decimalIndex + 3) : raw);
                  }}
                  placeholder="e.g. 150"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg px-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
              </div>
            </div>

            {selectedProject && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg p-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#5a6a82] font-semibold">Base Price (fixed)</p>
                  <p className="text-sm font-bold text-[#0f1d33] mt-0.5">{formatPrice(selectedProject.base_price)}/sq.yd</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#5a6a82] font-semibold">Default MRP</p>
                  <p className="text-sm font-bold text-[#0f1d33] mt-0.5">{formatPrice(selectedProject.mrp_default)}/sq.yd</p>
                </div>
              </div>
            )}

            {referenceCalc && (
              <div className="-mt-1 px-3 py-2 bg-[#f7f8fa] border border-[#e8ecf2] rounded-lg text-xs text-[#5a6a82]">
                <p className="font-semibold text-[#0f1d33] mb-1">Reference Math Calculation</p>
                <p className="flex flex-wrap items-baseline gap-x-1.5">
                  <span>
                    {plotSize} sq.yd × {formatPrice(mrpRate!)}/sq.yd = ₹{referenceCalc.raw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} →
                  </span>
                  <span className="font-semibold">Ceiling-rounded to the nearest rupee:</span>
                  <span className="font-semibold text-[#0f1d33]">
                    {formatPrice(referenceCalc.rounded)}
                    {referenceCalc.roundingDiff > 0.001 && <span className="font-normal text-[#5a6a82]"> (rounded up by ₹{referenceCalc.roundingDiff.toFixed(2)})</span>}
                  </span>
                </p>
              </div>
            )}

            {selectedProject && (
              <div>
                <label className="block text-sm font-semibold text-[#0f1d33] mb-1">
                  Final MRP Customer Should Pay <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-[#5a6a82] mb-2">
                  The final total amount the customer pays for this plot — see Reference Math Calculation above for the project&apos;s default, or enter a different negotiated total.
                </p>
                <div className="relative max-w-xs">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finalTotalAmount}
                    onChange={(e) => setFinalTotalAmount(e.target.value)}
                    placeholder={referenceCalc ? String(referenceCalc.rounded) : 'e.g. 2500000'}
                    className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2.5 text-[#0f1d33] text-sm focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-gold text-white font-semibold rounded-lg shadow-lg shadow-[#c4a55a]/20 py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardPlus className="w-4 h-4" />}
              {loading ? 'Submitting...' : 'Submit Registration'}
            </button>
          </form>
        )}
      </div>

      {isCustomerSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsCustomerSearchOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <h3 className="text-base font-bold text-[#0f1d33]">Find an Old Customer</h3>
              <button
                type="button"
                onClick={() => setIsCustomerSearchOpen(false)}
                className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-[#e8ecf2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-[#e8ecf2] shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
                <input
                  type="text"
                  autoFocus
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Search by phone number or email"
                  className="w-full bg-[#f3f5f8] border border-[#e8ecf2] rounded-lg pl-9 pr-9 py-2 text-sm text-[#0f1d33] focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f]"
                />
                {searchingCustomer && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82] animate-spin" />}
              </div>
            </div>

            <div className="overflow-y-auto">
              {customerSearchQuery.trim().length < 3 ? (
                <p className="px-4 py-8 text-center text-sm text-[#5a6a82]">Type at least 3 characters to search.</p>
              ) : customerSearchResults.length > 0 ? (
                <ul className="divide-y divide-[#e8ecf2]">
                  {customerSearchResults.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearchResults([]);
                          setIsCustomerSearchOpen(false);
                          setAddressChanged(false);
                          setCustomerAddress('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-[#f3f5f8] transition-colors"
                      >
                        <p className="text-sm font-semibold text-[#0f1d33]">{c.full_name}</p>
                        <p className="text-xs text-[#5a6a82] mt-0.5">
                          {c.phone} · {c.email}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : customerSearchError && !searchingCustomer ? (
                <div className="px-4 py-8 text-center">
                  <AlertCircle className="w-6 h-6 text-[#e8ecf2] mx-auto mb-2" />
                  <p className="text-sm text-[#5a6a82]">{customerSearchError}</p>
                  <p className="text-xs text-[#a0abbb] mt-1">If this is a new customer, close this and switch to &quot;New Customer&quot;.</p>
                </div>
              ) : (
                <p className="px-4 py-8 text-center text-sm text-[#5a6a82]">Searching...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
