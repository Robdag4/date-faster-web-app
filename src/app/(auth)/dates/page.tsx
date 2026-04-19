'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  DollarSign, 
  Star, 
  Clock, 
  Users,
  Heart,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DatePackage {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  image_url?: string;
  venue_name?: string;
  venue_address?: string;
  distance_miles?: number;
  active: boolean;
}

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  // We would get other user info separately
}

export default function DatesPage() {
  const [packages, setPackages] = useState<DatePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [radiusMiles, setRadiusMiles] = useState(50);

  useEffect(() => {
    loadDatePackages();
  }, [radiusMiles]);

  const loadDatePackages = async () => {
    try {
      const response = await fetch(`/api/dates/packages?radius=${radiusMiles}`);
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      } else {
        toast.error('Failed to load date packages');
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Network error loading packages');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (pkg.venue_name && pkg.venue_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || pkg.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(packages.map(pkg => pkg.category))).filter(Boolean);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Date Packages
        </h1>
        <p className="text-slate-600">
          Browse curated date experiences for you and your matches
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search dates or venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <div className="flex-1">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <select
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value={10}>Within 10 miles</option>
              <option value={25}>Within 25 miles</option>
              <option value={50}>Within 50 miles</option>
              <option value={100}>Within 100 miles</option>
              <option value={9999}>Anywhere</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {filteredPackages.length} date{filteredPackages.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Packages Grid */}
      {filteredPackages.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="font-medium text-slate-900 mb-2">No dates found</h3>
          <p className="text-slate-600 text-sm">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPackages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
              {pkg.image_url && (
                <div className="aspect-video bg-slate-200 relative">
                  <img 
                    src={pkg.image_url} 
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatPrice(pkg.price_cents)}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">
                      {pkg.name}
                    </h3>
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">
                      {pkg.category}
                    </span>
                  </div>
                  {!pkg.image_url && (
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatPrice(pkg.price_cents)}</p>
                    </div>
                  )}
                </div>

                <p className="text-slate-600 text-sm mb-3">
                  {pkg.description}
                </p>

                {(pkg.venue_name || pkg.venue_address) && (
                  <div className="flex items-start space-x-2 text-sm text-slate-600 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      {pkg.venue_name && (
                        <p className="font-medium">{pkg.venue_name}</p>
                      )}
                      {pkg.venue_address && (
                        <p>{pkg.venue_address}</p>
                      )}
                      {pkg.distance_miles && (
                        <p className="text-xs text-slate-500">
                          {pkg.distance_miles} miles away
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  className="btn-primary w-full"
                  onClick={() => {
                    // This would normally open a modal or navigate to a page where
                    // the user can select a match to propose this date to
                    toast('Select a match to propose this date to (coming soon)', { icon: 'ℹ️' });
                  }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Propose This Date
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How Date Packages Work</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Browse curated date experiences near you</p>
          <p>• Propose a date to one of your matches</p>
          <p>• Once accepted, payment unlocks chat</p>
          <p>• Get a redemption code to use at the venue</p>
        </div>
      </div>
    </div>
  );
}