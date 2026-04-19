import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const radiusMiles = Number(url.searchParams.get('radius')) || 50;

    // Get user location and premium status
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('latitude, longitude, custom_latitude, custom_longitude, is_premium')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    const userLat = (userProfile?.is_premium && userProfile?.custom_latitude) 
      ? userProfile.custom_latitude 
      : userProfile?.latitude;
    const userLng = (userProfile?.is_premium && userProfile?.custom_longitude) 
      ? userProfile.custom_longitude 
      : userProfile?.longitude;

    let packages;
    
    if (userLat && userLng) {
      // Haversine distance calculation (approximate)
      const degRange = radiusMiles / 69; // ~1 degree lat ≈ 69 miles

      const { data: packagesData, error: packagesError } = await supabase
        .from('date_packages')
        .select(`
          *,
          venues (
            name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('active', true)
        .or(`venues.latitude.is.null,and(venues.latitude.gte.${userLat - degRange},venues.latitude.lte.${userLat + degRange},venues.longitude.gte.${userLng - degRange},venues.longitude.lte.${userLng + degRange})`)
        .order('price_cents');

      if (packagesError) {
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
      }

      // Calculate distances and sort
      packages = packagesData.map(pkg => {
        let distance = null;
        if (pkg.venues?.latitude && pkg.venues?.longitude) {
          const lat1 = userLat * Math.PI / 180;
          const lat2 = pkg.venues.latitude * Math.PI / 180;
          const deltaLat = (pkg.venues.latitude - userLat) * Math.PI / 180;
          const deltaLng = (pkg.venues.longitude - userLng) * Math.PI / 180;

          const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          distance = Math.round(3959 * c * 10) / 10; // Earth radius in miles
        }

        return {
          ...pkg,
          venue_name: pkg.venues?.name,
          venue_address: pkg.venues?.address,
          venue_lat: pkg.venues?.latitude,
          venue_lng: pkg.venues?.longitude,
          distance_miles: distance
        };
      });

      // Sort by distance, then price
      packages.sort((a, b) => {
        if (a.distance_miles === null && b.distance_miles === null) return a.price_cents - b.price_cents;
        if (a.distance_miles === null) return 1;
        if (b.distance_miles === null) return -1;
        if (a.distance_miles !== b.distance_miles) return a.distance_miles - b.distance_miles;
        return a.price_cents - b.price_cents;
      });

    } else {
      // No location - return all packages sorted by price
      const { data: packagesData, error: packagesError } = await supabase
        .from('date_packages')
        .select(`
          *,
          venues (
            name,
            address,
            latitude,
            longitude
          )
        `)
        .eq('active', true)
        .order('price_cents');

      if (packagesError) {
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 });
      }

      packages = packagesData.map(pkg => ({
        ...pkg,
        venue_name: pkg.venues?.name,
        venue_address: pkg.venues?.address,
        distance_miles: null
      }));
    }

    return NextResponse.json(packages);

  } catch (error) {
    console.error('Date packages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}