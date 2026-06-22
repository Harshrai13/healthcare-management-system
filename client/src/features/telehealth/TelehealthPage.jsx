import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff, Clock, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

export default function TelehealthPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useSelector(s => s.auth);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState('waiting');
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otherUserJoined, setOtherUserJoined] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const targetUserIdRef = useRef(null);
  const isInitiatorRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const response = await api.get(`/consultations/${consultationId}`);
        const { consultation: consultData, currentUserRole } = response.data.data;
        setConsultation(consultData);
        if (consultData.status === 'COMPLETED') { setCallStatus('ended'); setLoading(false); return; }

        const doctorId = consultData.doctorId?._id || consultData.doctorId;
        const patientId = consultData.patientId?._id || consultData.patientId;
        if (currentUserRole === 'DOCTOR') {
          isInitiatorRef.current = true;
          targetUserIdRef.current = typeof patientId === 'object' ? patientId.toString() : patientId;
        } else {
          isInitiatorRef.current = false;
          targetUserIdRef.current = typeof doctorId === 'object' ? doctorId.toString() : doctorId;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
        const socket = io(socketUrl, { auth: { token: accessToken }, transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
        socketRef.current = socket;

        socket.on('connect', () => { socket.emit('consultation:join', { consultationId }); });
        socket.on('consultation:user-joined', async () => {
          setOtherUserJoined(true);
          if (isInitiatorRef.current) await createPeerConnectionAndOffer(stream);
        });
        socket.on('webrtc:offer', async ({ offer, fromUserId }) => {
          targetUserIdRef.current = fromUserId;
          await createPeerConnectionAndAnswer(stream, offer);
        });
        socket.on('webrtc:answer', async ({ answer }) => {
          const pc = peerConnectionRef.current;
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });
        socket.on('webrtc:ice-candidate', async ({ candidate }) => {
          const pc = peerConnectionRef.current;
          if (pc && pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
        });
        socket.on('consultation:user-left', () => { toast.error('The other participant left.'); setOtherUserJoined(false); });
        socket.on('consultation:ended', () => { setCallStatus('ended'); cleanup(); });
        setLoading(false);
      } catch (err) {
        console.error('Telehealth init error:', err);
        let msg = 'Could not connect to video room.';
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          msg = 'Camera/microphone access denied. Please allow permissions in your browser settings.';
        } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
          msg = 'No camera or microphone found on this device.';
        } else if (err?.response) {
          msg = err.response.data?.message || 'Failed to load consultation. Please try again.';
        } else if (err?.message?.includes('getUserMedia')) {
          msg = 'Could not access camera/microphone. Please check browser permissions.';
        }
        toast.error(msg);
        navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');
        setLoading(false);
      }
    }
    init();
    return () => { mounted = false; cleanup(); };
  }, [consultationId, accessToken, navigate, user]);

  const createPeerConnection = (localStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', { consultationId, candidate: event.candidate, targetUserId: targetUserIdRef.current });
      }
    };
    pc.ontrack = (event) => {
      const [rs] = event.streams;
      if (rs && remoteVideoRef.current) { remoteVideoRef.current.srcObject = rs; setCallStatus('connected'); }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallStatus('connected');
      else if (pc.connectionState === 'failed') toast.error('Connection lost.');
      else if (pc.connectionState === 'closed') setCallStatus('ended');
    };
    return pc;
  };

  const createPeerConnectionAndOffer = async (localStream) => {
    const pc = createPeerConnection(localStream);
    peerConnectionRef.current = pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('webrtc:offer', { consultationId, offer, targetUserId: targetUserIdRef.current });
  };

  const createPeerConnectionAndAnswer = async (localStream, offer) => {
    const pc = createPeerConnection(localStream);
    peerConnectionRef.current = pc;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('webrtc:answer', { consultationId, answer, targetUserId: targetUserIdRef.current });
    setCallStatus('connected');
  };

  const cleanup = useCallback(() => {
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (socketRef.current) { socketRef.current.emit('consultation:leave', { consultationId }); socketRef.current.disconnect(); socketRef.current = null; }
  }, [consultationId]);

  const toggleMute = () => {
    if (localStreamRef.current) { localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; }); setIsMuted(!isMuted); }
  };
  const toggleCamera = () => {
    if (localStreamRef.current) { localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isCameraOff; }); setIsCameraOff(!isCameraOff); }
  };

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
      const pc = peerConnectionRef.current;
      if (pc && localStreamRef.current) {
        const vs = pc.getSenders().find(s => s.track?.kind === 'video');
        const cam = localStreamRef.current.getVideoTracks()[0];
        if (vs && cam) await vs.replaceTrack(cam);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const ss = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = ss;
        const st = ss.getVideoTracks()[0];
        const pc = peerConnectionRef.current;
        if (pc) { const vs = pc.getSenders().find(s => s.track?.kind === 'video'); if (vs) await vs.replaceTrack(st); }
        st.onended = () => {
          if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
          if (pc && localStreamRef.current) {
            const vs = pc.getSenders().find(s => s.track?.kind === 'video');
            const cv = localStreamRef.current.getVideoTracks()[0];
            if (vs && cv) vs.replaceTrack(cv);
          }
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (err) { toast.error('Screen share permission denied.'); }
    }
  }, [isScreenSharing]);

  const handleEndCall = async () => {
    try {
      if (user?.role === 'DOCTOR') await api.put(`/consultations/${consultationId}/complete`, { notes: 'Completed via video.' });
      cleanup();
      setCallStatus('ended');
    } catch (err) { toast.error('Error ending consultation.'); setCallStatus('ended'); }
  };

  const handleLeave = () => navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');

  if (loading) return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mb-4" />
      <p className="text-neutral-400">Initializing secure telehealth room...</p>
    </div>
  );

  if (callStatus === 'ended') return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
      <div className="bg-neutral-800 rounded-3xl p-8 max-w-md w-full border border-neutral-700 text-center shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Consultation Completed</h2>
        <p className="text-neutral-400 mb-8">Your virtual visit session has closed.</p>
        <button onClick={handleLeave} className="btn-primary w-full justify-center">Return to Dashboard</button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-neutral-900 flex flex-col overflow-hidden">
      <header className="h-16 bg-neutral-800 border-b border-neutral-700 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"><ArrowLeft size={18} /></button>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${callStatus === 'connected' ? 'bg-danger animate-pulse' : 'bg-yellow-500'}`} />
            <span className="font-semibold text-white">{callStatus === 'connected' ? 'Live Call' : 'Waiting...'}</span>
          </div>
          <div className="w-px h-6 bg-neutral-700" />
          <h2 className="text-white font-medium">Room: {consultation?.roomUrl || 'VerdantCare Virtual Room'}</h2>
        </div>
        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded-md">Encrypted WebRTC</span>
      </header>

      <div className="flex-1 flex overflow-hidden relative p-4 gap-4">
        <div className="flex-1 relative bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden flex items-center justify-center shadow-lg">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {!otherUserJoined && callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 text-center p-6">
              <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center animate-pulse mb-4"><Clock className="text-neutral-400" size={28} /></div>
              <p className="text-white font-medium">Waiting for the other participant to join...</p>
              <p className="text-xs text-neutral-500 mt-1">They will connect automatically.</p>
            </div>
          )}
        </div>
        <div className="w-72 h-48 absolute bottom-24 right-8 bg-neutral-950 rounded-xl border border-neutral-700 overflow-hidden shadow-2xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isCameraOff && <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center"><VideoOff size={32} className="text-neutral-500" /></div>}
          <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs font-medium flex items-center gap-1">You {isMuted && <MicOff size={10} className="text-danger" />}</div>
        </div>
      </div>

      <footer className="h-20 bg-neutral-900 flex items-center justify-center px-6 shrink-0 border-t border-neutral-800">
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-6 py-2 flex items-center gap-4 shadow-xl">
          <button onClick={toggleMute} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isMuted ? 'bg-danger/10 text-danger' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="text-[10px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button onClick={toggleCamera} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isCameraOff ? 'bg-danger/10 text-danger' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
            {isCameraOff ? <VideoOff size={20} /> : <VideoIcon size={20} />}
            <span className="text-[10px] font-medium">{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
          </button>
          <button onClick={toggleScreenShare} className={`flex flex-col items-center gap-1 w-16 p-2 rounded-xl transition-colors ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="text-[10px] font-medium">{isScreenSharing ? 'Stop Share' : 'Share'}</span>
          </button>
          <div className="w-px h-8 bg-neutral-700" />
          <button onClick={handleEndCall} className="flex items-center gap-2 bg-danger hover:bg-danger/90 text-white px-6 py-2.5 rounded-xl transition-colors font-bold shadow-lg shadow-danger/20">
            <PhoneOff size={18} /> Leave Room
          </button>
        </div>
      </footer>
    </div>
  );
}
