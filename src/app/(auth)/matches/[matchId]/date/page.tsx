'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, MapPin, Send, Search } from 'lucide-react';
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
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

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

  const handleSubmit = async () => {
    if (!selectedPkg) { toast.error('Pick a date package'); return; }
    setSending(true);
    try {
      if (counterId) {
        // Counter proposal
        const res = await fetch('/api/dates/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId: counterId, action: 'counter', counterPackageId: selectedPkg })
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error || 'Failed'); return; }
        toast.success('Counter proposal sent! 🔄');
      } else {
        // New proposal
        const res = await fetch('/api/dates/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, packageId: selectedPkg, note })
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
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          {counterId ? 'Counter with a Date' : 'Propose a Date'}
        </h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Search packages..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm"
          />
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryFilter('')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                !categoryFilter ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? '' : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  categoryFilter === cat ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Packages */}
        <div className="space-y-3">
          {filtered.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPkg(pkg.id)}
              className={`w-full text-left bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all ${
                selectedPkg === pkg.id ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-200'
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
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-8">No packages found</p>
          )}
        </div>

        {/* Note */}
        {!counterId && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm resize-none"
            rows={2}
          />
        )}
      </div>

      {/* Fixed bottom CTA */}
      {selectedPkg && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 gradient-bg text-white rounded-xl font-semibold disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {sending ? 'Sending...' : counterId ? 'Send Counter Proposal' : 'Send Date Proposal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
