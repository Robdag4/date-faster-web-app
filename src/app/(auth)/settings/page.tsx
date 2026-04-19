'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Eye, EyeOff, MapPin, Shield, Trash2, LogOut } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [discoveryRadius, setDiscoveryRadius] = useState(user?.discovery_radius || 25);
  const [ageMin, setAgeMin] = useState(user?.age_min || 18);
  const [ageMax, setAgeMax] = useState(user?.age_max || 99);
  const [incognito, setIncognito] = useState(user?.incognito || false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({
        discovery_radius: discoveryRadius,
        age_min: ageMin,
        age_max: ageMax,
        incognito,
      }).eq('id', user.id);

      if (error) throw error;
      await refreshUser();
      toast.success('Settings saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      await supabase.from('users').update({
        deleted_at: new Date().toISOString(),
        phone_number: `deleted-${user.id}`,
      }).eq('id', user.id);
      await signOut();
      router.push('/');
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <div className="flex items-center space-x-3 mb-6">
        <Link href="/profile" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* Discovery */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-rose-500" />
            <span>Discovery</span>
          </h3>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Distance</span>
              <span className="text-sm font-medium text-slate-900">{discoveryRadius} miles</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={discoveryRadius}
              onChange={(e) => setDiscoveryRadius(Number(e.target.value))}
              className="w-full slider accent-rose-500"
            />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-slate-600">Age range</span>
              <span className="text-sm font-medium text-slate-900">{ageMin} - {ageMax}</span>
            </div>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="18"
                max="99"
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="w-20 input text-center text-sm"
              />
              <span className="text-slate-400">to</span>
              <input
                type="number"
                min="18"
                max="99"
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="w-20 input text-center text-sm"
              />
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-rose-500" />
            <span>Privacy</span>
          </h3>

          <button
            onClick={() => setIncognito(!incognito)}
            className="w-full flex items-center justify-between py-2"
          >
            <div className="flex items-center space-x-3">
              {incognito ? <EyeOff className="w-5 h-5 text-slate-500" /> : <Eye className="w-5 h-5 text-slate-500" />}
              <div className="text-left">
                <p className="text-sm font-medium text-slate-900">Incognito Mode</p>
                <p className="text-xs text-slate-500">Hide your profile from discovery</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${incognito ? 'bg-rose-500' : 'bg-slate-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${incognito ? 'translate-x-5.5 ml-[22px]' : 'translate-x-0.5 ml-[2px]'}`} />
            </div>
          </button>
        </div>

        {/* Premium */}
        <Link href="/premium" className="block bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center space-x-2">
                <span>⭐</span>
                <span>{user?.is_premium ? 'Premium Active' : 'Upgrade to Premium'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {user?.is_premium
                  ? 'Manage your subscription'
                  : 'Unlimited likes, see who likes you, priority discovery & more'}
              </p>
            </div>
            <span className="text-slate-400">→</span>
          </div>
        </Link>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="btn-secondary w-full flex items-center justify-center space-x-2"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>

        {/* Delete Account */}
        <div className="pt-4 border-t border-slate-200">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-center text-sm text-red-500 hover:text-red-600"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm text-red-700">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500 text-white"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
