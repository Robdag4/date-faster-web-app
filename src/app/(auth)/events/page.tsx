'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Star, ArrowRight, Zap, Target } from 'lucide-react';
import Link from 'next/link';

export default function EventsPage() {
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
                      eventType.color === 'rose' 
                        ? 'bg-rose-100' 
                        : 'bg-blue-100'
                    }`}>
                      <IconComponent className={`w-6 h-6 ${
                        eventType.color === 'rose' 
                          ? 'text-rose-500' 
                          : 'text-blue-500'
                      }`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {eventType.name}
                        </h3>
                        <ArrowRight className="w-5 h-5 text-slate-400" />
                      </div>
                      
                      <p className="text-slate-600 text-sm mb-3">
                        {eventType.description}
                      </p>
                      
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
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Get invited</h4>
              <p className="text-sm text-slate-600">Receive an event code from friends or hosts</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Join the event</h4>
              <p className="text-sm text-slate-600">Check in with your code and complete your profile</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Meet & connect</h4>
              <p className="text-sm text-slate-600">Participate in the event and connect with people you like</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">4</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900 mb-1">Get matches</h4>
              <p className="text-sm text-slate-600">Mutual connections appear in your matches automatically</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Complete your profile before the event starts</p>
          <p>• Be authentic and have fun with the activities</p>
          <p>• Don't overthink it — trust your first impressions</p>
          <p>• Follow up with matches after the event</p>
        </div>
      </div>
    </div>
  );
}