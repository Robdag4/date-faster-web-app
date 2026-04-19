'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Lock, 
  Heart, 
  ArrowLeft,
  Calendar,
  MapPin,
  Gift
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Match {
  id: string;
  status: string;
  source: string;
  otherUser: {
    id: string;
    first_name: string;
    age: number;
    photos: string[];
  };
}

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (matchId) {
      loadMatchAndMessages();
      getCurrentUser();
      subscribeToMessages();
    }
  }, [matchId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadMatchAndMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load match from Supabase
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchErr || !matchData) {
        setMatch(null);
        setLoading(false);
        return;
      }

      const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;
      const { data: otherData } = await supabase
        .from('users')
        .select('id, first_name, age, photos')
        .eq('id', otherId)
        .single();

      // Check if chat should be unlocked: accepted date_request with completed payment, or mixer match
      let effectiveStatus = matchData.status;
      if (matchData.source !== 'mixer' && matchData.source !== 'speed_dating') {
        const { data: paidDate } = await supabase
          .from('date_requests')
          .select('id, status, payments!inner(status)')
          .eq('match_id', matchId)
          .eq('status', 'accepted')
          .limit(1);

        const hasPaidDate = paidDate && paidDate.length > 0 &&
          (paidDate[0] as any).payments?.some((p: any) => p.status === 'completed');

        if (!hasPaidDate && effectiveStatus !== 'paid' && effectiveStatus !== 'completed') {
          effectiveStatus = matchData.status; // keep as-is (locked)
        } else if (hasPaidDate) {
          effectiveStatus = 'paid';
        }
      }

      setMatch({
        id: matchId,
        status: effectiveStatus,
        source: matchData.source || 'swipe',
        otherUser: {
          id: otherData?.id || otherId,
          first_name: otherData?.first_name || 'Match',
          age: otherData?.age || 0,
          photos: otherData?.photos || []
        }
      });

      // Load messages
      const response = await fetch(`/api/chat/${matchId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else if (response.status === 403) {
        setMatch(prev => prev ? { ...prev, status: 'matched' } : null);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast.error('Network error loading chat');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel(`chat:${matchId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `match_id=eq.${matchId}`
        }, 
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !match || sending) return;

    setSending(true);
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: matchId,
          content: newMessage.trim()
        })
      });

      if (response.ok) {
        setNewMessage('');
        // Message will be added via real-time subscription
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Network error sending message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Match not found</h2>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const chatLocked = match.status !== 'paid' && match.status !== 'completed' && match.source !== 'mixer' && match.source !== 'speed_dating';

  return (
    <div className="max-w-md mx-auto bg-white h-full flex flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 flex items-center space-x-3 shrink-0">
        <button 
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
          {match.otherUser.photos.length > 0 ? (
            <img 
              src={match.otherUser.photos[0]} 
              alt={match.otherUser.first_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <span className="text-slate-500 font-semibold">
              {match.otherUser.first_name[0]}
            </span>
          )}
        </div>
        
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">
            {match.otherUser.first_name}
          </h2>
          <p className="text-sm text-slate-600">
            Age {match.otherUser.age} • {match.source === 'mixer' || match.source === 'speed_dating' ? 'Mixer Match' : 'Dating Match'}
          </p>
        </div>
        
        {match.source !== 'mixer' && match.source !== 'speed_dating' && (
          <button className="p-2 rounded-full hover:bg-slate-100">
            <Gift className="w-5 h-5 text-slate-600" />
          </button>
        )}
      </div>

      {/* Chat Locked State */}
      {chatLocked && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <Lock className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Chat Locked
            </h2>
            <p className="text-slate-600 mb-6">
              Accept a date proposal and complete payment to unlock chat with {match.otherUser.first_name}.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => router.push(`/matches/${matchId}`)}
                className="btn-primary w-full"
              >
                View Match Details
              </button>
              <button 
                onClick={() => router.push('/dates')}
                className="text-rose-500 text-sm font-medium"
              >
                Browse Date Ideas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {!chatLocked && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto mb-3 text-rose-300" />
                <p className="text-slate-500 text-sm">
                  Start the conversation! Say hello to {match.otherUser.first_name}.
                </p>
              </div>
            )}
            
            <AnimatePresence>
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === currentUserId;
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwnMessage 
                        ? 'bg-rose-500 text-white' 
                        : 'bg-slate-100 text-slate-900'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isOwnMessage ? 'text-rose-200' : 'text-slate-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-slate-200 p-4 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`Message ${match.otherUser.first_name}...`}
                  className="w-full px-4 py-3 border border-slate-200 rounded-2xl resize-none text-sm"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>
              
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || sending}
                className={`p-3 rounded-full transition-colors ${
                  newMessage.trim() && !sending
                    ? 'bg-rose-500 text-white' 
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}