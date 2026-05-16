'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Star, ArrowRight, Zap, Target } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EventsPage() {
  const router = useRouter();
  const [activeEvent, setActiveEvent] = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkActiveEvent();
  }, []);

  const checkActiveEvent = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }

      const res = await fetch('/api/events/mixer/statements', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.eventId && ['active', 'checkin', 'draft'].includes(data.eventStatus)) {
          setActiveEvent(data);
          // Auto-redirect to mixer if event is active
          if (data.eventStatus === 'active') {
            router.push('/events/mixer');
            return;
          }
        }
      }
    } catch (e) {
      console.error('Error checking active event:', e);
    }
    setChecking(false);
  };

  const eventTypes = [
    {
      id: 'speed-dating',
      name: 'Speed Dating',
      description: 'Meet 10+ singles in timed rounds',
      icon: Zap,
      color: 'rose',
      features: [
        'Timed conversation rounds',
        'Meet everyone at the event', 
        'Vote on who you like',
        'Get matches after the event'
      ],
      href: '/events/speed-dating'
    },
    {
      id: 'mixer',
      name: 'Singles Mixer',
      description: 'Interactive games & icebreakers',
      icon: Target,
      color: 'blue',
      features: [
        'Two Truths and a Lie game',
        'Guess other people\'s lies',
        'Star people you like',
        'Instant matching'
      ],
      href: '/events/mixer'
    }
  ];

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Active Event Banner */}
      {activeEvent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link href="/events/mixer" className="block">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">You're checked in!</p>
                  <p className="text-lg font-bold">
                    {activeEvent.eventStatus === 'active' ? '🟢 Game is LIVE — Join now!' : '⏳ Waiting for host to start...'}
                  </p>
                </div>
                <ArrowRight className="w-6 h-6" />
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Dating Events
        </h1>
        <p className="text-slate-600">
          Meet people in real life at our exclusive events
        </p>
      </div>

      {/* Event Types */}
      <div className="space-y-4">
        {eventTypes.map((eventType, index) => {
          const IconComponent = eventType.icon;
          return (
            <motion.div
              key={eventType.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={eventType.href} className="block">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      eventType.color === 'rose' ? 'bg-rose-100' : 'bg-blue-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        eventType.color === 'rose' ? 'text-rose-500' : 'text-blue-500'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{eventType.name}</h3>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-slate-600 text-sm mb-3">{eventType.description}</p>
                      <div className="space-y-1">
                        {eventType.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            <span className="text-sm text-slate-600">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">How Events Work</h3>
        <div className="space-y-4">
          {[
            { num: '1', title: 'Get invited', desc: 'Receive an event code from friends or hosts' },
            { num: '2', title: 'Join the event', desc: 'Check in with your code and complete your profile' },
            { num: '3', title: 'Meet & connect', desc: 'Participate in the event and connect with people you like' },
            { num: '4', title: 'Get matches', desc: 'Mutual connections appear in your matches automatically' },
          ].map(step => (
            <div key={step.num} className="flex items-start space-x-3">
              <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-rose-500 font-bold text-sm">{step.num}</span>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-1">{step.title}</h4>
                <p className="text-sm text-slate-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
