import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, MessageSquare, PhoneOff, Clock, AlertTriangle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Video from 'twilio-video';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function TelehealthPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [callStatus, setCallStatus] = useState('waiting'); // 'waiting', 'connected', 'ended'
  
  const [room, setRoom] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localTracksRef = useRef([]);
  const screenTrackRef = useRef(null);

  // Fetch consultation details and join room
  useEffect(() => {
    let activeRoom = null;

    async function initTelehealth() {
      try {
        setLoading(true);
        // 1. Fetch consultation status & Twilio token
        const response = await api.get(`/consultations/${consultationId}`);
        const { consultation: consultData, token } = response.data.data;
        setConsultation(consultData);

        if (consultData.status === 'COMPLETED') {
          setCallStatus('ended');
          setLoading(false);
          return;
        }

        // 2. Request user media tracks
        const tracks = await Video.createLocalTracks({
          audio: true,
          video: { width: 640 }
        });
        localTracksRef.current = tracks;

        // Display local video track immediately
        const videoTrack = tracks.find(track => track.kind === 'video');
        if (videoTrack && localVideoRef.current) {
          videoTrack.attach(localVideoRef.current);
        }

        // 3. Connect to Twilio Room
        const joinedRoom = await Video.connect(token, {
          name: consultData.roomUrl,
          tracks
        });
        
        setRoom(joinedRoom);
        activeRoom = joinedRoom;
        setCallStatus('connected');

        // Handle existing participants
        joinedRoom.participants.forEach(handleParticipantConnected);
        
        // Handle new participants joining
        joinedRoom.on('participantConnected', handleParticipantConnected);
        joinedRoom.on('participantDisconnected', handleParticipantDisconnected);

      } catch (err) {
        console.error('Failed to join video room:', err);
        toast.error('Could not connect to video room. Please check media permissions.');
        navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');
      } finally {
        setLoading(false);
      }
    }

    initTelehealth();

    return () => {
      if (activeRoom) {
        activeRoom.disconnect();
      }
      localTracksRef.current.forEach(track => track.stop());
    };
  }, [consultationId, navigate, user]);

  const handleParticipantConnected = (participant) => {
    setParticipants(prev => [...prev, participant]);

    participant.tracks.forEach(publication => {
      if (publication.isSubscribed) {
        handleTrackSubscribed(publication.track);
      }
    });

    participant.on('trackSubscribed', handleTrackSubscribed);
    participant.on('trackUnsubscribed', handleTrackUnsubscribed);
  };

  const handleParticipantDisconnected = (participant) => {
    setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
  };

  const handleTrackSubscribed = (track) => {
    if (track.kind === 'video' && remoteVideoRef.current) {
      track.attach(remoteVideoRef.current);
    } else if (track.kind === 'audio') {
      const audioElement = track.attach();
      document.body.appendChild(audioElement);
    }
  };

  const handleTrackUnsubscribed = (track) => {
    track.detach().forEach(element => element.remove());
  };

  // Toggle Mute Audio
  const toggleMute = () => {
    const audioTrack = localTracksRef.current.find(t => t.kind === 'audio');
    if (audioTrack) {
      if (isMuted) {
        audioTrack.enable();
      } else {
        audioTrack.disable();
      }
      setIsMuted(!isMuted);
    }
  };

  // Toggle Video Camera
  const toggleCamera = () => {
    const videoTrack = localTracksRef.current.find(t => t.kind === 'video');
    if (videoTrack) {
      if (isCameraOff) {
        videoTrack.enable();
      } else {
        videoTrack.disable();
      }
      setIsCameraOff(!isCameraOff);
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop sharing
      if (screenTrackRef.current && room) {
        const localParticipant = room.localParticipant;
        localParticipant.tracks.forEach(publication => {
          if (publication.track.mediaStreamTrack && publication.track.mediaStreamTrack.getSettings().mediaSource === 'screen') {
            localParticipant.unpublishTrack(publication.track);
          }
        });
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      setIsScreenSharing(false);
      toast.success('Screen sharing stopped');
    } else {
      // Start sharing
      try {
        const screenTrack = await Video.createLocalScreenTrack();
        screenTrackRef.current = screenTrack;
        if (room) {
          room.localParticipant.publishTrack(screenTrack);
        }
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      } catch (err) {
        console.error('Screen share failed:', err);
        toast.error('Could not start screen sharing. Please grant permission.');
      }
    }
  }, [isScreenSharing, room]);

  const handleEndCall = async () => {
    try {
      // Stop screen sharing if active
      if (screenTrackRef.current) {
        screenTrackRef.current.stop();
        screenTrackRef.current = null;
      }
      if (user?.role === 'DOCTOR') {
        await api.put(`/consultations/${consultationId}/complete`, {
          notes: 'Consultation completed successfully via video session.'
        });
      }
      if (room) {
        room.disconnect();
      }
      localTracksRef.current.forEach(t => t.stop());
      setCallStatus('ended');
    } catch (err) {
      toast.error('Error ending consultation cleanly.');
      setCallStatus('ended');
    }
  };

  const handleLeave = () => {
    navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mb-4" />
        <p className="text-neutral-400">Initializing secure telehealth room...</p>
      </div>
    );
  }

  if (callStatus === 'ended') {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
        <div className="bg-neutral-800 rounded-3xl p-8 max-w-md w-full border border-neutral-700 text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Consultation Completed</h2>
          <p className="text-neutral-400 mb-8">Your virtual visit session has closed.</p>
          
          <button onClick={handleLeave} className="btn-primary w-full justify-center">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-neutral-900 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
            <span className="font-semibold text-white">Live Call</span>
          </div>
          <div className="w-px h-6 bg-neutral-700" />
          <h2 className="text-white font-medium">
            Room: {consultation?.roomUrl || 'VerdantCare Virtual Room'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded-md">
            🛡️ Encrypted WebRTC Connection
          </span>
        </div>
      </header>

      {/* Main Video Area */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-4">
        {/* Remote Participant Video Container */}
        <div className="flex-1 relative bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden flex items-center justify-center shadow-lg">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {participants.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 text-center p-6">
              <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center animate-pulse mb-4">
                <Clock className="text-neutral-400" size={28} />
              </div>
              <p className="text-white font-medium">Waiting for the other participant to join...</p>
              <p className="text-xs text-neutral-500 mt-1">They will connect automatically as soon as they open the link.</p>
            </div>
          )}
        </div>

        {/* Local Preview Video Panel */}
        <div className="w-72 h-48 absolute bottom-24 right-8 bg-neutral-950 rounded-xl border border-neutral-700 overflow-hidden shadow-2xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isCameraOff && (
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
              <VideoOff size={32} className="text-neutral-500" />
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">
            You {isMuted && <MicOff size={10} className="text-danger" />}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <footer className="h-20 bg-neutral-900 flex items-center justify-center px-6 shrink-0 border-t border-neutral-800">
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-6 py-2 flex items-center gap-4 shadow-xl">
          <button 
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isMuted ? 'bg-danger/10 text-danger' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          
          <button 
            onClick={toggleCamera}
            className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isCameraOff ? 'bg-danger/10 text-danger' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
          >
            {isCameraOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
            <span className="text-[10px] font-medium">{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
          </button>

          <button 
            onClick={toggleScreenShare}
            className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
          >
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="text-[10px] font-medium">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>
          
          <div className="w-px h-8 bg-neutral-700" />

          <button 
            onClick={handleEndCall}
            className="flex items-center gap-2 bg-danger hover:bg-danger/90 text-white px-6 py-2.5 rounded-xl transition-colors font-bold shadow-lg shadow-danger/20"
          >
            <PhoneOff size={18} />
            Leave Room
          </button>
        </div>
      </footer>
    </div>
  );
}
