'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Users, 
  Heart, 
  Timer, 
  Star, 
  Vote,
  CheckCircle,
  XCircle,
  Info 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface SpeedDatingEvent {
  id: string;
  name: string;
  status: string;
  roundDurationSeconds: number;
  venueName: string;
  city: string;
  date: string;
}

interface Round {
  id: string;
  round_number: number;
  status: string;
  started_at: string | null;
  voted: boolean;
}

interface Pairing {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerAge: number;
  round_number: number;
  round_status: string;
  icebreaker?: string;
}

interface EventStatus {
  active: boolean;
  event?: SpeedDatingEvent;
  rounds: Round[];
  pairings: Pairing[];
  currentRound: Round | null;
  votingRound: Round | null;
  currentPairing: Pairing | null;
  nextParticipatingRound: number | null;
  isBye: boolean;
  metEveryone: boolean;
  metCount: number;
  totalOpposites: number;
}

export default function SpeedDatingPage() {
  const [eventStatus, setEventStatus] = useState<EventStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [voting, setVoting] = useState(false);
  const [voteData, setVoteData] = useState({
    compatibilityRating: 3,
    notes: '',
    wantsMatch: false
  });

  useEffect(() => {
    checkCurrentEvent();
  }, []);

  const checkCurrentEvent = async () => {
    try {
      const response = await fetch('/api/speed-dating/current');
      if (response.ok) {
        const data = await response.json();
        setEventStatus(data);
      } else {
        setEventStatus({ active: false } as EventStatus);
      }
    } catch (error) {
      console.error('Error checking current event:', error);
      setEventStatus({ active: false } as EventStatus);
    } finally {
      setLoading(false);
    }
  };

  const joinEvent = async () => {
    if (!eventCode.trim()) {
      toast.error('Please enter an event code');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch('/api/speed-dating/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: eventCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Checked in successfully!');
        setEventCode('');
        checkCurrentEvent();
      } else {
        toast.error(data.error || 'Failed to check in');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const submitVote = async () => {
    if (!eventStatus?.votingRound || !eventStatus?.currentPairing) return;

    setVoting(true);
    try {
      const response = await fetch('/api/speed-dating/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: eventStatus.votingRound.id,
          targetId: eventStatus.currentPairing.partnerId,
          compatibilityRating: voteData.compatibilityRating,
          notes: voteData.notes,
          wantsMatch: voteData.wantsMatch
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vote submitted!');
        setVoteData({ compatibilityRating: 3, notes: '', wantsMatch: false });
        checkCurrentEvent();
      } else {
        toast.error(data.error || 'Failed to submit vote');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!eventStatus?.active) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Speed Dating
          </h1>
          <p className="text-slate-600">
            Join a speed dating event with your code
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200"
        >
          <h2 className="font-semibold text-slate-900 mb-4">Enter Event Code</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter 4-digit event code"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-center text-lg font-mono tracking-widest"
              maxLength={4}
            />
            <button
              onClick={joinEvent}
              disabled={joining || !eventCode.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              {joining ? 'Checking in...' : 'Join Event'}
            </button>
          </div>
        </motion.div>

        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Get your event code from the host</p>
            <p>• Check in and wait for the event to start</p>
            <p>• Meet people in timed rounds</p>
            <p>• Vote on who you'd like to match with</p>
            <p>• Get your results after the event</p>
          </div>
        </div>
      </div>
    );
  }

  const event = eventStatus.event!;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Event Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {event.name}
        </h1>
        <p className="text-slate-600">{event.venueName}, {event.city}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${
          event.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {event.status === 'active' ? 'In Progress' : event.status === 'checkin' ? 'Check-in Open' : 'Waiting'}
        </span>
      </div>

      {/* Current Status */}
      {event.status === 'active' && (
        <AnimatePresence mode="wait">
          {eventStatus.currentRound && !eventStatus.isBye ? (
            <motion.div
              key="active-round"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 text-center text-white"
            >
              <Timer className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                Round {eventStatus.currentRound.round_number}
              </h2>
              {eventStatus.currentPairing && (
                <>
                  <p className="text-rose-100 mb-4">
                    You're paired with <strong>{eventStatus.currentPairing.partnerName}</strong> ({eventStatus.currentPairing.partnerAge})
                  </p>
                  {eventStatus.currentPairing.icebreaker && (
                    <div className="bg-white/20 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium mb-1">Icebreaker:</p>
                      <p className="text-rose-100">{eventStatus.currentPairing.icebreaker}</p>
                    </div>
                  )}
                </>
              )}
              <p className="text-rose-100">Round is active • {formatTime(event.roundDurationSeconds)}</p>
            </motion.div>
          ) : eventStatus.isBye ? (
            <motion.div
              key="bye-round"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-blue-100 rounded-2xl p-6 text-center"
            >
              <Info className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <h2 className="text-xl font-bold text-blue-900 mb-2">
                Round {eventStatus.currentRound?.round_number} - Bye
              </h2>
              <p className="text-blue-800 mb-4">
                You have a bye this round. Relax and enjoy a break!
              </p>
              {eventStatus.nextParticipatingRound && (
                <p className="text-blue-700 text-sm">
                  You'll be back in round {eventStatus.nextParticipatingRound}
                </p>
              )}
            </motion.div>
          ) : eventStatus.votingRound ? (
            <motion.div
              key="voting-round"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-purple-100 rounded-2xl p-6"
            >
              <Vote className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <h2 className="text-xl font-bold text-purple-900 mb-4 text-center">
                Vote on Round {eventStatus.votingRound.round_number}
              </h2>
              
              {eventStatus.pairings.find(p => p.round_number === eventStatus.votingRound?.round_number) && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="font-medium text-slate-900 mb-2">
                      Rate your connection with {eventStatus.pairings.find(p => p.round_number === eventStatus.votingRound?.round_number)?.partnerName}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Compatibility Rating: {voteData.compatibilityRating}/5
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={voteData.compatibilityRating}
                          onChange={(e) => setVoteData(prev => ({ 
                            ...prev, 
                            compatibilityRating: parseInt(e.target.value) 
                          }))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>1 - Not compatible</span>
                          <span>5 - Very compatible</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          placeholder="Any thoughts about this person?"
                          value={voteData.notes}
                          onChange={(e) => setVoteData(prev => ({ 
                            ...prev, 
                            notes: e.target.value 
                          }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="wantsMatch"
                          checked={voteData.wantsMatch}
                          onChange={(e) => setVoteData(prev => ({ 
                            ...prev, 
                            wantsMatch: e.target.checked 
                          }))}
                          className="h-4 w-4 text-rose-500 focus:ring-rose-500 border-gray-300 rounded"
                        />
                        <label htmlFor="wantsMatch" className="text-sm font-medium text-slate-700">
                          I'd like to match with this person
                        </label>
                      </div>

                      <button
                        onClick={submitVote}
                        disabled={voting}
                        className="btn-primary w-full disabled:opacity-50"
                      >
                        {voting ? 'Submitting...' : 'Submit Vote'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-100 rounded-2xl p-6 text-center"
            >
              <Clock className="w-12 h-12 mx-auto mb-4 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Waiting for next round
              </h2>
              <p className="text-slate-600">
                The host will start the next round soon
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Progress */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Your Progress</h3>
          <span className="text-sm text-slate-600">
            {eventStatus.metCount}/{eventStatus.totalOpposites} people met
          </span>
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
          <div 
            className="bg-rose-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${eventStatus.totalOpposites ? (eventStatus.metCount / eventStatus.totalOpposites) * 100 : 0}%` 
            }}
          ></div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900">{eventStatus.rounds.length}</p>
            <p className="text-sm text-slate-600">Total Rounds</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {eventStatus.rounds.filter(r => r.voted).length}
            </p>
            <p className="text-sm text-slate-600">Votes Cast</p>
          </div>
        </div>
      </div>

      {/* Round History */}
      {eventStatus.pairings.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Round History</h3>
          <div className="space-y-3">
            {eventStatus.pairings.map((pairing) => {
              const round = eventStatus.rounds.find(r => r.round_number === pairing.round_number);
              return (
                <div key={pairing.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">
                      Round {pairing.round_number}: {pairing.partnerName} ({pairing.partnerAge})
                    </p>
                    <p className="text-sm text-slate-600">
                      {pairing.round_status === 'completed' ? 'Completed' : 
                       pairing.round_status === 'active' ? 'In Progress' : 'Upcoming'}
                    </p>
                  </div>
                  {round?.voted ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : pairing.round_status === 'voting' ? (
                    <div className="w-5 h-5 rounded-full bg-purple-500 animate-pulse" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {eventStatus.metEveryone && event.status === 'active' && (
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <Star className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <h3 className="font-semibold text-green-900 mb-1">Amazing!</h3>
          <p className="text-sm text-green-800">
            You've met everyone! Results will be available after the event ends.
          </p>
        </div>
      )}
    </div>
  );
}