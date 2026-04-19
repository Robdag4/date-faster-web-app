'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Star } from 'lucide-react';

export default function EventsPage() {
  // Placeholder events data
  const events = [
    {
      id: '1',
      type: 'speed_dating',
      name: 'Speed Dating Night',
      date: '2024-02-20',
      time: '19:00',
      venue: 'The Rooftop Lounge',
      address: '123 Main St, Downtown',
      attendees: 24,
      capacity: 30,
      price: 35,
      description: 'Meet 10+ singles in a fun, relaxed atmosphere'
    },
    {
      id: '2',
      type: 'mixer',
      name: 'Singles Mixer: Two Truths & A Lie',
      date: '2024-02-22',
      time: '20:00',
      venue: 'Wine & Dine Bar',
      address: '456 Oak Ave, Midtown',
      attendees: 18,
      capacity: 25,
      price: 25,
      description: 'Interactive game night to break the ice'
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

      {/* Coming Soon Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 text-center text-white"
      >
        <Star className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Coming Soon!</h2>
        <p className="text-rose-100">
          Speed dating events and singles mixers are launching soon in your city
        </p>
      </motion.div>

      {/* Preview Events */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Preview: Upcoming Events</h3>
        
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-4 border border-slate-200 opacity-60"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-slate-900">{event.name}</h4>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  event.type === 'speed_dating' 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {event.type === 'speed_dating' ? 'Speed Dating' : 'Singles Mixer'}
                </span>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">${event.price}</p>
                <p className="text-xs text-slate-500">per person</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-3">{event.description}</p>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.date).toLocaleDateString()}</span>
                <Clock className="w-4 h-4 ml-2" />
                <span>{event.time}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>{event.venue}, {event.address}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Users className="w-4 h-4" />
                <span>{event.attendees}/{event.capacity} attending</span>
              </div>
            </div>

            <div className="mt-4">
              <button
                disabled
                className="w-full bg-slate-200 text-slate-500 py-2 px-4 rounded-lg font-medium cursor-not-allowed"
              >
                Available Soon
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Waitlist */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🎉 Join the Waitlist</h3>
        <p className="text-sm text-blue-800 mb-3">
          Be the first to know when events launch in your city!
        </p>
        <button className="btn-primary w-full">
          Join Waitlist
        </button>
      </div>

      {/* How it Works */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">How Events Work</h3>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Book your spot</h4>
              <p className="text-sm text-slate-600">Reserve your place at upcoming events</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Meet in person</h4>
              <p className="text-sm text-slate-600">Attend the event and meet other singles</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Make connections</h4>
              <p className="text-sm text-slate-600">Matches appear in your app automatically</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}