import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Search, Shield, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/axios';
import { useSocket } from '../../hooks/useSocket';

function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await api.get('/messages/conversations');
      return data.data || [];
    },
    refetchInterval: 60000,
  });
}

function useChatMessages(partnerId) {
  return useQuery({
    queryKey: ['messages', partnerId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/${partnerId}`);
      return data.data?.messages || [];
    },
    enabled: !!partnerId,
  });
}

export default function MessagingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { socket, joinRoom, leaveRoom, emitTyping } = useSocket();
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activePartner, setActivePartner] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { data: conversations = [], isLoading: loadingConversations } = useConversations();
  const { data: messages = [], isLoading: loadingMessages } = useChatMessages(activePartnerId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join/leave socket rooms when active chat changes
  useEffect(() => {
    if (activeRoomId) {
      joinRoom(activeRoomId);
      return () => leaveRoom(activeRoomId);
    }
  }, [activeRoomId, joinRoom, leaveRoom]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      const roomId = message.roomId;
      // If message belongs to current chat, add it
      if (roomId === activeRoomId) {
        queryClient.setQueryData(['messages', activePartnerId], (old = []) => {
          if (old.some((m) => m._id === message._id)) return old;
          return [...old, message];
        });
      }
      // Always refresh conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    socket.on('message:new', handleNewMessage);
    return () => { socket.off('message:new', handleNewMessage); };
  }, [socket, activeRoomId, activePartnerId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content) => api.post('/messages', { recipientId: activePartnerId, content }),
    onSuccess: (res) => {
      const message = res.data.data;
      queryClient.setQueryData(['messages', activePartnerId], (old = []) => [...old, message]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setMessageInput('');
    },
  });

  const selectChat = useCallback((conv) => {
    setActivePartnerId(conv.partner.id);
    setActiveRoomId(conv.roomId);
    setActivePartner(conv.partner);
  }, []);

  const handleTyping = useCallback(() => {
    if (activeRoomId) {
      emitTyping(activeRoomId, true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => emitTyping(activeRoomId, false), 2000);
    }
  }, [activeRoomId, emitTyping]);

  const handleSend = () => {
    if (!messageInput.trim() || !activePartnerId) return;
    sendMutation.mutate(messageInput);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.partner?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col pb-4">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-display font-bold text-neutral-900">Secure Messaging</h1>
          <p className="text-neutral-500 mt-1">Communicate directly with your care team.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-0">
        {/* Chat List */}
        <div className="w-full md:w-80 lg:w-96 border-r border-neutral-100 flex flex-col shrink-0 h-1/2 md:h-full">
          <div className="p-4 border-b border-neutral-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-transparent rounded-xl focus:bg-white focus:border-primary-300 focus:ring-2 focus:ring-primary-100 transition-all text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConversations && (
              <div className="p-6 text-center text-neutral-400 text-sm">Loading conversations...</div>
            )}
            {!loadingConversations && filteredConversations.length === 0 && (
              <div className="p-6 text-center text-neutral-400 text-sm">No conversations yet.</div>
            )}
            {filteredConversations.map((conv) => (
              <div
                key={conv.roomId}
                onClick={() => selectChat(conv)}
                className={`p-4 border-b border-neutral-50 cursor-pointer transition-colors flex gap-3 ${
                  activePartnerId === conv.partner.id
                    ? 'bg-primary-50 border-l-4 border-l-primary-600'
                    : 'hover:bg-neutral-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold shrink-0">
                  {conv.partner.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h3 className={`font-bold text-sm truncate ${activePartnerId === conv.partner.id ? 'text-primary-900' : 'text-neutral-900'}`}>
                      {conv.partner.name}
                    </h3>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(conv.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-primary-600 mb-1">{conv.partner.specialty || conv.partner.role}</p>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-medium text-neutral-900' : 'text-neutral-500'}`}>
                    {conv.lastMessage}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-1">
                    {conv.unreadCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-1/2 md:h-full bg-neutral-50/50">
          {activePartner ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                    {activePartner.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div>
                    <h2 className="font-bold text-neutral-900">{activePartner.name}</h2>
                    <p className="text-xs text-primary-600 font-medium">{activePartner.specialty || activePartner.role}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages && (
                  <div className="text-center text-neutral-400 text-sm py-8">Loading messages...</div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.senderId?._id === activePartnerId ? false : true;
                  return (
                    <div key={msg._id} className={`flex gap-3 max-w-[80%] ${isMine ? 'ml-auto justify-end' : ''}`}>
                      {!isMine && (
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold shrink-0 mt-auto">
                          {activePartner.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                        </div>
                      )}
                      <div className={`${isMine ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-700'} p-3 rounded-2xl ${isMine ? 'rounded-br-sm' : 'rounded-bl-sm'} shadow-sm text-sm`}>
                        {msg.content}
                        <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-200' : 'text-neutral-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white border-t border-neutral-100 shrink-0">
                <div className="flex items-end gap-2 bg-neutral-50 border border-neutral-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-300 transition-all">
                  <textarea
                    placeholder="Type your message securely..."
                    value={messageInput}
                    onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none resize-none max-h-32 text-sm focus:outline-none p-2"
                    rows={1}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !messageInput.trim()}
                    className="p-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-neutral-400 text-center mt-2 flex justify-center items-center gap-1">
                  <Shield size={10} /> End-to-end encrypted messaging
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-400">
              <div className="text-center">
                <Send size={40} className="mx-auto mb-3 text-neutral-300" />
                <p className="font-medium">Select a conversation to start messaging</p>
                <p className="text-sm mt-1">Your messages are secure and private</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

