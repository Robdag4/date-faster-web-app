'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Search, Calendar, Clock, MessageSquare, Check } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface DatePackage {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  image_url: string;
  venue_id: string | null;
  active: boolean;
}

export default function DateProposalPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const counterId = searchParams.get('counter');

  const [packages, setPackages] = useState<DatePackage[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [step, setStep] = useState<'package' | 'details'>('package');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('date_packages')
        .select('*')
        .eq('active', true)
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch {
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const categories = [...new Set(packages.map(p => p.category).filter(Boolean))];

  const filtered = packages.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (filter && !p.name.toLowerCase().includes(filter.toLowerCase()) &&
        !p.description.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const selectedPackage = packages.find(p => p.id === selectedPkg);

  // Min date is tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSelectPackage = (pkgId: string) => {
    setSelectedPkg(pkgId);
    setStep('details');
    // Scroll to top of details
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!selectedPkg) { toast.error('Pick a date package'); return; }
    if (!scheduledDate) { toast.error('Pick a date'); return; }
    if (!scheduledTime) { toast.error('Pick a time'); return; }

    setSending(true);
    try {
      if (counterId) {
        const res = await fetch('/api/dates/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: counterId,
            action: 'counter',
            counterPackageId: selectedPkg,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            note
          })
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || 'Failed'); return; }
        toast.success('Suggestion sent! 🔄');
      } else {
        const res = await fetch('/api/dates/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            packageId: selectedPkg,
            note,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime
          })
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || 'Failed'); return; }
        toast.success('Date proposed! 🎉');
      }
      router.push(`/matches/${matchId}`);
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  };

  const formatDateNice = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTimeNice = (t: string) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-50 pb-32">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 flex items-center gap-3">
        <button
          onClick={() => step === 'details' ? setStep('package') : router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">
            {counterId ? 'Suggest Something Else' : 'Propose a Date'}
          </h1>
          <p className="text-xs text-slate-500">
            {step === 'package' ? 'Step 1: Pick a date experience' : 'Step 2: Choose date & time'}
          </p>
        </div>
        {/* Step indicators */}
        <div className="flex gap-1.5">
          <div className={`w-2 h-2 rounded-full ${step === 'package' ? 'bg-rose-500' : 'bg-rose-300'}`} />
          <div className={`w-2 h-2 rounded-full ${step === 'details' ? 'bg-rose-500' : 'bg-slate-300'}`} />
        </div>
      </div>

      {/* ==================== STEP 1: PACKAGE SELECTION ==================== */}
      {step === 'package' && (
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search date experiences..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
            />
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setCategoryFilter('')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  !categoryFilter ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    categoryFilter === cat ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Package cards */}
          <div className="space-y-3">
            {filtered.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg.id)}
                className={`w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${
                  selectedPkg === pkg.id ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex">
                  {pkg.image_url && (
                    <div className="relative w-24 h-24 flex-shrink-0">
                      <Image src={pkg.image_url} alt={pkg.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{pkg.name}</h3>
                      <span className="text-rose-600 font-bold text-sm whitespace-nowrap">
                        ${(pkg.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                    {pkg.category && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[10px] font-medium">
                        {pkg.category}
                      </span>
                    )}
                  </div>
                  {selectedPkg === pkg.id && (
                    <div className="flex items-center pr-3">
                      <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-slate-500 py-8">No packages found</p>
            )}
          </div>
        </div>
      )}

      {/* ==================== STEP 2: DATE, TIME & NOTE ==================== */}
      {step === 'details' && selectedPackage && (
        <div className="max-w-md mx-auto px-4 py-4 space-y-5">
          {/* Selected package summary */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 p-4">
              {selectedPackage.image_url && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <Image src={selectedPackage.image_url} alt={selectedPackage.name} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-sm">{selectedPackage.name}</h3>
                <p className="text-xs text-slate-500 truncate">{selectedPackage.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-rose-600 font-bold">${(selectedPackage.price_cents / 100).toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setStep('package')}
              className="w-full py-2 text-xs text-rose-500 font-medium border-t border-slate-100 hover:bg-slate-50"
            >
              Change package
            </button>
          </div>

          {/* Date picker */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Calendar className="w-4 h-4 text-rose-500" />
              When should the date be?
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 appearance-none"
            />
            {scheduledDate && (
              <p className="text-xs text-slate-500 mt-2">
                📅 {formatDateNice(scheduledDate)}
              </p>
            )}
          </div>

          {/* Time picker */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <Clock className="w-4 h-4 text-rose-500" />
              What time?
            </label>
            {/* Quick-pick time buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {['12:00', '14:00', '17:00', '18:00', '18:30', '19:00', '19:30', '20:00'].map(t => (
                <button
                  key={t}
                  onClick={() => setScheduledTime(t)}
                  className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                    scheduledTime === t
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-50 text-slate-700 border border-slate-200 hover:border-rose-300'
                  }`}
                >
                  {formatTimeNice(t)}
                </button>
              ))}
            </div>
            <div className="relative">
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900"
              />
            </div>
            {scheduledTime && (
              <p className="text-xs text-slate-500 mt-2">
                🕐 {formatTimeNice(scheduledTime)}
              </p>
            )}
          </div>

          {/* Personal note */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900 mb-3">
              <MessageSquare className="w-4 h-4 text-rose-500" />
              Personal note
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="I'd love to take you here — I heard their pasta is amazing..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none placeholder:text-slate-400"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-slate-400 mt-1 text-right">{note.length}/500</p>
          </div>

          {/* Preview summary */}
          {scheduledDate && scheduledTime && (
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
              <p className="text-xs font-semibold text-rose-600 mb-2">YOUR PROPOSAL</p>
              <p className="text-sm text-slate-900 font-medium">{selectedPackage.name}</p>
              <p className="text-sm text-slate-700">
                📅 {formatDateNice(scheduledDate)} at {formatTimeNice(scheduledTime)}
              </p>
              <p className="text-sm font-semibold text-rose-600 mt-1">
                ${(selectedPackage.price_cents / 100).toFixed(2)}
              </p>
              {note && (
                <p className="text-sm text-slate-600 mt-2 italic">"{note}"</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fixed bottom CTA */}
      {step === 'details' && selectedPkg && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-area-bottom">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmit}
              disabled={sending || !scheduledDate || !scheduledTime}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 gradient-bg text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : counterId ? 'Send Suggestion' : 'Send Date Proposal'}
            </button>
            {(!scheduledDate || !scheduledTime) && (
              <p className="text-xs text-slate-400 text-center mt-2">Pick a date and time to continue</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
