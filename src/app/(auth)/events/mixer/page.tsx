'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Edit3, 
  Play, 
  Star, 
  Heart,
  Trophy,
  Target,
  Lightbulb,
  CheckCircle,
  XCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface MixerEvent {
  id: string;
  name: string;
  status: string;
  venueName?: string;
  city?: string;
  date?: string;
}

interface Statements {
  statement1: string;
  statement2: string;
  statement3: string;
  lie_index: number;
}

interface Attendee {
  id: string;
  firstName: string;
  age: number;
  photo?: string;
  bio?: string;
  liked: boolean;
  mutual: boolean;
  statements?: {
    statement1: string;
    statement2: string;
    statement3: string;
  };
}

interface PlayTarget {
  userId: string;
  firstName: string;
  age: number;
  statements: { index: number; text: string }[];
  _mapping: string;
}

export default function MixerPage() {
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } as Record<string, string> : {} as Record<string, string>;
  };

  const authFetch = async (url: string, opts: any = {}) => {
    const ah = await getAuthHeaders();
    return fetch(url, { ...opts, headers: { ...ah, ...(opts.headers || {}) } });
  };
  const [activeTab, setActiveTab] = useState<'join' | 'statements' | 'play' | 'attendees'>('join');
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<string>('draft');
  const [eventCode, setEventCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  // Statements tab
  const [statements, setStatements] = useState<Statements>({
    statement1: '',
    statement2: '',
    statement3: '',
    lie_index: 1
  });
  const [savingStatements, setSavingStatements] = useState(false);
  
  // Play tab
  const [currentTarget, setCurrentTarget] = useState<PlayTarget | null>(null);
  const [selectedGuess, setSelectedGuess] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<{
    correct: boolean;
    lieIndex: number;
  } | null>(null);
  
  // Attendees tab
  const [attendees, setAttendees] = useState<Attendee[]>([]);

  useEffect(() => {
    checkMixerStatus();
  }, []);

  const checkMixerStatus = async () => {
    try {
      // Check for statements first to see if we're in an event
      const statementsResponse = await authFetch('/api/events/mixer/statements');
      if (statementsResponse.ok) {
        const data = await statementsResponse.json();
        if (data.eventId) {
          setEventId(data.eventId);
          setEventStatus(data.eventStatus);
          
          if (data.statements) {
            setStatements(data.statements);
            setActiveTab('play');
          } else {
            setActiveTab('statements');
          }
          
          // Load attendees if event is active
          if (data.eventStatus === 'active' || data.eventStatus === 'completed') {
            loadAttendees();
          }
        }
      }
    } catch (error) {
      console.error('Error checking mixer status:', error);
    }
  };

  const joinEvent = async () => {
    if (!eventCode.trim()) {
      toast.error('Please enter an event code');
      return;
    }

    setJoining(true);
    try {
      const response = await authFetch('/api/events/mixer/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: eventCode.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Checked in successfully!');
        setEventCode('');
        setEventId(data.eventId);
        setActiveTab('statements');
        checkMixerStatus();
      } else {
        toast.error(data.error || 'Failed to check in');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const saveStatements = async () => {
    if (!statements.statement1 || !statements.statement2 || !statements.statement3) {
      toast.error('Please fill in all three statements');
      return;
    }

    setSavingStatements(true);
    try {
      const response = await authFetch('/api/events/mixer/statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statements)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Statements saved!');
        setActiveTab('play');
      } else {
        toast.error(data.error || 'Failed to save statements');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setSavingStatements(false);
    }
  };

  const startPlaying = async () => {
    try {
      const response = await authFetch('/api/events/mixer/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (response.ok) {
        if (data.done) {
          setGameComplete(true);
          setCurrentTarget(null);
          loadAttendees(); // Load attendees for the final tab
          setActiveTab('attendees');
        } else {
          setCurrentTarget(data.target);
          setSelectedGuess(null);
          setLastGuessResult(null);
        }
      } else {
        toast.error(data.error || 'Failed to load next person');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const submitGuess = async () => {
    if (!currentTarget || selectedGuess === null) return;

    try {
      const response = await authFetch('/api/events/mixer/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId: currentTarget.userId,
          guessedIndex: selectedGuess,
          mapping: currentTarget._mapping
        })
      });

      const data = await response.json();

      if (response.ok) {
        setLastGuessResult({
          correct: data.correct,
          lieIndex: data.lieIndex
        });
        
        if (data.correct) {
          toast.success('Correct! You found the lie!');
        } else {
          toast.error('Incorrect. Better luck next time!');
        }
        
        setTimeout(() => {
          startPlaying(); // Load next person
        }, 3000);
      } else {
        toast.error(data.error || 'Failed to submit guess');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const loadAttendees = async () => {
    try {
      const response = await authFetch('/api/events/mixer/attendees');
      if (response.ok) {
        const data = await response.json();
        setAttendees(data);
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
    }
  };

  const toggleLike = async (attendeeId: string, currentlyLiked: boolean) => {
    try {
      const response = await authFetch('/api/events/mixer/like', {
        method: currentlyLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: attendeeId })
      });

      const data = await response.json();

      if (response.ok) {
        if (data.mutual && data.matchId) {
          toast.success('🎉 It\'s a match! You can now chat.');
        }
        loadAttendees(); // Refresh attendees
      } else {
        toast.error(data.error || 'Failed to update like');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  if (!eventId) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Singles Mixer
          </h1>
          <p className="text-slate-600">
            Join a mixer event with your code
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
              {joining ? 'Checking in...' : 'Join Mixer'}
            </button>
          </div>
        </motion.div>

        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Join with your event code</p>
            <p>• Submit 3 statements (2 truths, 1 lie)</p>
            <p>• Guess other people's lies</p>
            <p>• Star people you want to match with</p>
            <p>• Connect with your mutual matches</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Singles Mixer
        </h1>
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          eventStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {eventStatus === 'active' ? 'Active' : eventStatus === 'completed' ? 'Completed' : 'Preparing'}
        </span>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-slate-100 rounded-lg p-1">
        {[
          { id: 'statements', label: 'Statements', icon: Edit3 },
          { id: 'play', label: 'Play', icon: Play },
          { id: 'attendees', label: 'People', icon: Users }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-rose-500 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Statements Tab */}
        {activeTab === 'statements' && (
          <motion.div
            key="statements"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h2 className="font-semibold text-slate-900 mb-4">
                Two Truths and a Lie
              </h2>
              <p className="text-slate-600 text-sm mb-4">
                Write 2 true statements and 1 lie about yourself. Others will try to guess which is the lie!
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Statement 1
                  </label>
                  <textarea
                    placeholder="Write something interesting about yourself..."
                    value={statements.statement1}
                    onChange={(e) => setStatements(prev => ({ 
                      ...prev, 
                      statement1: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Statement 2
                  </label>
                  <textarea
                    placeholder="Write something interesting about yourself..."
                    value={statements.statement2}
                    onChange={(e) => setStatements(prev => ({ 
                      ...prev, 
                      statement2: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Statement 3
                  </label>
                  <textarea
                    placeholder="Write something interesting about yourself..."
                    value={statements.statement3}
                    onChange={(e) => setStatements(prev => ({ 
                      ...prev, 
                      statement3: e.target.value 
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Which statement is the lie?
                  </label>
                  <select
                    value={statements.lie_index}
                    onChange={(e) => setStatements(prev => ({ 
                      ...prev, 
                      lie_index: parseInt(e.target.value) 
                    }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value={1}>Statement 1</option>
                    <option value={2}>Statement 2</option>
                    <option value={3}>Statement 3</option>
                  </select>
                </div>

                <button
                  onClick={saveStatements}
                  disabled={savingStatements || !statements.statement1 || !statements.statement2 || !statements.statement3}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {savingStatements ? 'Saving...' : 'Save Statements'}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Play Tab */}
        {activeTab === 'play' && (
          <motion.div
            key="play"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {eventStatus !== 'active' ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h2 className="font-semibold text-slate-900 mb-2">
                  Waiting for event to start
                </h2>
                <p className="text-slate-600">
                  The host will start the mixer soon. Make sure you've submitted your statements!
                </p>
              </div>
            ) : gameComplete ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h2 className="font-semibold text-slate-900 mb-2">
                  Great job!
                </h2>
                <p className="text-slate-600 mb-4">
                  You've guessed everyone's lies. Now check out the people tab to see who you want to match with!
                </p>
                <button
                  onClick={() => setActiveTab('attendees')}
                  className="btn-primary"
                >
                  View People
                </button>
              </div>
            ) : currentTarget ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <div className="text-center mb-6">
                  <Target className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                  <h2 className="font-semibold text-slate-900 mb-1">
                    Guess {currentTarget.firstName}'s lie
                  </h2>
                  <p className="text-slate-600">Age {currentTarget.age}</p>
                </div>

                {lastGuessResult ? (
                  <div className={`rounded-lg p-4 mb-6 text-center ${
                    lastGuessResult.correct ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    {lastGuessResult.correct ? (
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    ) : (
                      <XCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                    )}
                    <h3 className={`font-medium ${
                      lastGuessResult.correct ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {lastGuessResult.correct ? 'Correct!' : 'Incorrect!'}
                    </h3>
                    <p className={`text-sm ${
                      lastGuessResult.correct ? 'text-green-700' : 'text-red-700'
                    }`}>
                      The lie was statement {lastGuessResult.lieIndex}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {currentTarget.statements.map((statement) => (
                      <button
                        key={statement.index}
                        onClick={() => setSelectedGuess(statement.index)}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                          selectedGuess === statement.index
                            ? 'border-rose-500 bg-rose-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                            selectedGuess === statement.index
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}>
                            {statement.index}
                          </div>
                          <p className="text-slate-900 flex-1">{statement.text}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!lastGuessResult && (
                  <button
                    onClick={submitGuess}
                    disabled={selectedGuess === null}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {selectedGuess ? `This is the lie (Statement ${selectedGuess})` : 'Select a statement'}
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                <Play className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                <h2 className="font-semibold text-slate-900 mb-2">
                  Ready to play?
                </h2>
                <p className="text-slate-600 mb-4">
                  Start guessing other people's lies!
                </p>
                <button
                  onClick={startPlaying}
                  className="btn-primary"
                >
                  Start Playing
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Attendees Tab */}
        {activeTab === 'attendees' && (
          <motion.div
            key="attendees"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-semibold text-slate-900 mb-2">
                People at this mixer
              </h2>
              <p className="text-slate-600 text-sm">
                Star people you'd like to match with
              </p>
            </div>

            {attendees.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <p className="text-slate-600">
                  No other attendees visible yet. Wait for the mixer to become active!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {attendees.map(attendee => (
                  <div key={attendee.id} className="bg-white rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 flex-shrink-0">
                        {attendee.photo ? (
                          <img src={attendee.photo} alt={attendee.firstName} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold">{attendee.firstName[0]}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-slate-900">
                            {attendee.firstName}, {attendee.age}
                          </h3>
                          
                          <div className="flex items-center space-x-2">
                            {attendee.mutual && (
                              <div className="flex items-center space-x-1 text-green-600">
                                <Heart className="w-4 h-4 fill-current" />
                                <span className="text-xs font-medium">Match!</span>
                              </div>
                            )}
                            
                            <button
                              onClick={() => toggleLike(attendee.id, attendee.liked)}
                              className={`p-2 rounded-full transition-colors ${
                                attendee.liked
                                  ? 'bg-rose-100 text-rose-500'
                                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                              }`}
                            >
                              <Star className={`w-4 h-4 ${attendee.liked ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>
                        
                        {attendee.bio && (
                          <p className="text-sm text-slate-600 mb-3">{attendee.bio}</p>
                        )}
                        
                        {attendee.statements && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Their statements:
                            </p>
                            <div className="space-y-1">
                              <p className="text-sm text-slate-700">• {attendee.statements.statement1}</p>
                              <p className="text-sm text-slate-700">• {attendee.statements.statement2}</p>
                              <p className="text-sm text-slate-700">• {attendee.statements.statement3}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}