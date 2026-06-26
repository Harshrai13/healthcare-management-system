import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff,
  PhoneOff, Clock, ArrowLeft, Wifi, WifiOff, Settings, Shield,
  User, CheckCircle, AlertTriangle, Loader2,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function TelehealthPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { user, accessToken } = useSelector(s => s.auth);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('loading'); // loading | waiting-room | incall | ended
  const [callStatus, setCallStatus] = useState('waiting'); // waiting | connecting | connected | reconnecting | ended
  const [consultation, setConsultation] = useState(null);
  const [clientConfig, setClientConfig] = useState(null);
  const [otherUserJoined, setOtherUserJoined] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Media state ───────────────────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState({ camera: false, mic: false, internet: 'checking' });
  const [callTimer, setCallTimer] = useState(0); // seconds
  const [connectionQuality, setConnectionQuality] = useState('good'); // good | fair | poor

  // ── Refs ──────────────────────────────────────────────────────────────────
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const targetUserIdRef = useRef(null);
  const isInitiatorRef = useRef(false);
  const timerRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // ── Initialize: fetch consultation data + get media ───────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        setLoading(true);
        const response = await api.get(`/consultations/${consultationId}`);
        const { consultation: consultData, currentUserRole, clientConfig: cfg } = response.data.data;
        if (!mounted) return;

        setConsultation(consultData);
        setClientConfig(cfg);

        // Apply default media state from config
        if (cfg?.defaults?.startWithMutedMic) setIsMuted(true);
        if (cfg?.defaults?.startWithMutedCamera) setIsCameraOff(true);

        // If consultation is already completed
        if (consultData.status === 'COMPLETED') {
          setPhase('ended');
          setLoading(false);
          return;
        }

        // Determine roles
        const doctorId = consultData.doctorId?._id || consultData.doctorId;
        const patientId = consultData.patientId?._id || consultData.patientId;
        if (currentUserRole === 'DOCTOR') {
          isInitiatorRef.current = true;
          targetUserIdRef.current = typeof patientId === 'object' ? patientId.toString() : patientId;
        } else {
          isInitiatorRef.current = false;
          targetUserIdRef.current = typeof doctorId === 'object' ? doctorId.toString() : doctorId;
        }

        // Get media stream for preview
        const qualityMap = { low: { width: 320, height: 240 }, medium: { width: 640, height: 480 }, high: { width: 1280, height: 720 } };
        const quality = cfg?.defaults?.videoQuality || 'medium';
        const videoConstraint = qualityMap[quality] || qualityMap.medium;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: videoConstraint.width, height: videoConstraint.height },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Apply initial mute state
        if (cfg?.defaults?.startWithMutedMic) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        if (cfg?.defaults?.startWithMutedCamera) {
          stream.getVideoTracks().forEach(t => { t.enabled = false; });
        }

        setDeviceStatus(prev => ({
          ...prev,
          camera: stream.getVideoTracks().length > 0,
          mic: stream.getAudioTracks().length > 0,
          internet: 'online',
        }));

        // Enter waiting room
        setPhase('waiting-room');
        setLoading(false);
      } catch (err) {
        console.error('Telehealth init error:', err);
        let msg = 'Could not connect to video room.';
        if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
          msg = 'Camera/microphone access denied. Please allow permissions in your browser settings.';
        } else if (err?.name === 'NotFoundError') {
          msg = 'No camera or microphone found on this device.';
        } else if (err?.response) {
          msg = err.response.data?.message || 'Failed to load consultation.';
        }
        setError(msg);
        setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, [consultationId, accessToken, navigate, user]);

  // ── Internet connectivity monitoring ──────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setDeviceStatus(prev => ({ ...prev, internet: 'online' }));
    const handleOffline = () => setDeviceStatus(prev => ({ ...prev, internet: 'offline' }));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Call timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callStatus]);

  // ── Auto-end check based on max duration ──────────────────────────────────
  useEffect(() => {
    if (clientConfig?.timing?.autoEnd && clientConfig?.timing?.maxDuration) {
      const maxSeconds = clientConfig.timing.maxDuration * 60;
      if (callTimer >= maxSeconds) {
        handleEndCall();
        toast.error(`Consultation auto-ended after ${clientConfig.timing.maxDuration} minutes.`);
      }
    }
  }, [callTimer, clientConfig]);

  // ── Socket connection + WebRTC signaling ──────────────────────────────────
  const connectToRoom = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: maxReconnectAttempts,
    });
    socketRef.current = socket;

    // On connect: join consultation room
    socket.on('connect', () => {
      socket.emit('consultation:join', { consultationId });
      reconnectAttemptsRef.current = 0;
      if (callStatus === 'reconnecting') setCallStatus('connected');
    });

    // Room info
    socket.on('consultation:room-info', ({ participantCount }) => {
      if (participantCount > 1) {
        setOtherUserJoined(true);
      }
    });

    // Join denied
    socket.on('consultation:join-denied', ({ reason }) => {
      toast.error(reason || 'Access denied.');
      cleanup();
      navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');
    });

    // Other user joined — start WebRTC negotiation
    socket.on('consultation:user-joined', async (data) => {
      setOtherUserJoined(true);
      setOtherUser({ name: data.userName, role: data.role });
      if (isInitiatorRef.current) {
        setCallStatus('connecting');
        await createPeerConnectionAndOffer(localStreamRef.current);
      }
    });

    // Other user disconnected — show reconnecting UI
    socket.on('consultation:user-disconnected', ({ mayReconnect }) => {
      setOtherUserJoined(false);
      if (mayReconnect) {
        setCallStatus('reconnecting');
        toast.error('Other participant disconnected. Waiting for reconnection...');
      }
    });

    // WebRTC offer received
    socket.on('webrtc:offer', async ({ offer, fromUserId }) => {
      targetUserIdRef.current = fromUserId;
      setCallStatus('connecting');
      await createPeerConnectionAndAnswer(localStreamRef.current, offer);
    });

    // WebRTC answer received
    socket.on('webrtc:answer', async ({ answer }) => {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        // Flush queued ICE candidates
        while (iceCandidateQueueRef.current.length > 0) {
          const candidate = iceCandidateQueueRef.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    });

    // ICE candidate received
    socket.on('webrtc:ice-candidate', async ({ candidate }) => {
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        // Queue ICE candidates until remote description is set
        iceCandidateQueueRef.current.push(candidate);
      }
    });

    // ICE restart request from peer
    socket.on('webrtc:ice-restart', async () => {
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { consultationId, offer, targetUserId: targetUserIdRef.current });
          toast.success('Restarting connection...');
        } catch (err) {
          console.error('ICE restart failed:', err);
        }
      }
    });

    // Connection quality report from peer
    socket.on('webrtc:quality-report', ({ quality }) => {
      if (quality.fractionLost > 0.1 || quality.rtt > 400) {
        setConnectionQuality('poor');
      } else if (quality.fractionLost > 0.05 || quality.rtt > 200) {
        setConnectionQuality('fair');
      } else {
        setConnectionQuality('good');
      }
    });

    // Other user left intentionally
    socket.on('consultation:user-left', () => {
      setOtherUserJoined(false);
      toast.error('The other participant left.');
    });

    // Consultation ended by doctor
    socket.on('consultation:ended', () => {
      setPhase('ended');
      setCallStatus('ended');
      cleanup();
    });

    // Socket reconnection events
    socket.on('reconnecting', () => {
      setCallStatus('reconnecting');
    });

    socket.on('reconnect_failed', () => {
      toast.error('Could not reconnect to the consultation server.');
      setCallStatus('connected'); // Stay in call but show degraded state
    });
  }, [consultationId, accessToken, navigate, user, callStatus]);

  // ── Join the room (called from waiting room) ──────────────────────────────
  const joinCall = useCallback(() => {
    setPhase('incall');
    connectToRoom();
  }, [connectToRoom]);

  // ── Create RTCPeerConnection with ICE servers from config ─────────────────
  const createPeerConnection = (localStream) => {
    const iceServers = clientConfig?.iceServers || [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          consultationId,
          candidate: event.candidate,
          targetUserId: targetUserIdRef.current,
        });
      }
    };

    // Remote track received
    pc.ontrack = (event) => {
      const [rs] = event.streams;
      if (rs && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = rs;
        setCallStatus('connected');
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case 'connected':
          setCallStatus('connected');
          reconnectAttemptsRef.current = 0;
          break;
        case 'connecting':
          setCallStatus('connecting');
          break;
        case 'disconnected':
          setCallStatus('reconnecting');
          // Attempt ICE restart after a short delay
          setTimeout(() => {
            if (pc.connectionState === 'disconnected' && socketRef.current) {
              socketRef.current.emit('webrtc:ice-restart', {
                consultationId,
                targetUserId: targetUserIdRef.current,
              });
            }
          }, 3000);
          break;
        case 'failed':
          // Try one more ICE restart
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            pc.restartIce?.();
            setCallStatus('reconnecting');
            toast.error('Connection lost. Attempting to reconnect...');
          } else {
            toast.error('Connection failed. Please try rejoining.');
            setCallStatus('reconnecting');
          }
          break;
        case 'closed':
          setCallStatus('ended');
          break;
      }
    };

    // ICE connection state for additional monitoring
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setConnectionQuality('good');
      }
    };

    return pc;
  };

  const createPeerConnectionAndOffer = async (localStream) => {
    const pc = createPeerConnection(localStream);
    peerConnectionRef.current = pc;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit('webrtc:offer', {
      consultationId,
      offer,
      targetUserId: targetUserIdRef.current,
    });
  };

  const createPeerConnectionAndAnswer = async (localStream, offer) => {
    const pc = createPeerConnection(localStream);
    peerConnectionRef.current = pc;
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    // Flush queued ICE candidates
    while (iceCandidateQueueRef.current.length > 0) {
      const candidate = iceCandidateQueueRef.current.shift();
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socketRef.current?.emit('webrtc:answer', {
      consultationId,
      answer,
      targetUserId: targetUserIdRef.current,
    });
  };

  // ── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (socketRef.current) { socketRef.current.emit('consultation:leave', { consultationId }); socketRef.current.disconnect(); socketRef.current = null; }
  }, [consultationId]);

  // ── Media controls ────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = isCameraOff; });
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleScreenShare = useCallback(async () => {
    if (!clientConfig?.features?.screenSharing) {
      toast.error('Screen sharing is disabled by admin.');
      return;
    }
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
        if (pc) {
          const vs = pc.getSenders().find(s => s.track?.kind === 'video');
          if (vs) await vs.replaceTrack(st);
        }
        st.onended = () => {
          if (screenStreamRef.current) { screenStreamRef.current.getTracks().forEach(t => t.stop()); screenStreamRef.current = null; }
          const pc2 = peerConnectionRef.current;
          if (pc2 && localStreamRef.current) {
            const vs = pc2.getSenders().find(s => s.track?.kind === 'video');
            const cv = localStreamRef.current.getVideoTracks()[0];
            if (vs && cv) vs.replaceTrack(cv);
          }
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (err) { toast.error('Screen share permission denied.'); }
    }
  }, [isScreenSharing, clientConfig]);

  // ── End call ──────────────────────────────────────────────────────────────
  const handleEndCall = async () => {
    try {
      if (user?.role === 'DOCTOR') {
        await api.put(`/consultations/${consultationId}/complete`, { notes: 'Completed via video.' });
      }
      cleanup();
      setPhase('ended');
      setCallStatus('ended');
    } catch (err) {
      toast.error('Error ending consultation.');
      cleanup();
      setPhase('ended');
    }
  };

  const handleLeave = () => navigate(user?.role === 'DOCTOR' ? '/doctor/consultations' : '/dashboard/appointments');

  // ── Format call timer ─────────────────────────────────────────────────────
  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Quality indicator color ───────────────────────────────────────────────
  const qualityColor = { good: 'bg-emerald-500', fair: 'bg-yellow-500', poor: 'bg-red-500' };

  // ── RENDER: Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-500 mb-4" />
      <p className="text-neutral-400">Initializing secure telehealth room...</p>
    </div>
  );

  // ── RENDER: Error ─────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
      <div className="bg-neutral-800 rounded-3xl p-8 max-w-md w-full border border-neutral-700 text-center">
        <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-neutral-400 mb-6">{error}</p>
        <button onClick={handleLeave} className="btn-primary w-full justify-center">Return to Dashboard</button>
      </div>
    </div>
  );

  // ── RENDER: Ended ─────────────────────────────────────────────────────────
  if (phase === 'ended') return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
      <div className="bg-neutral-800 rounded-3xl p-8 max-w-md w-full border border-neutral-700 text-center shadow-2xl">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Consultation Completed</h2>
        <p className="text-neutral-400 mb-2">Your virtual visit session has closed.</p>
        {callTimer > 0 && (
          <p className="text-sm text-neutral-500 mb-6">Duration: {formatDuration(callTimer)}</p>
        )}
        <button onClick={handleLeave} className="btn-primary w-full justify-center">Return to Dashboard</button>
      </div>
    </div>
  );

  // ── RENDER: Waiting Room ──────────────────────────────────────────────────
  if (phase === 'waiting-room') {
    const isDoctor = user?.role === 'DOCTOR';
    const otherRole = isDoctor ? 'Patient' : 'Doctor';
    const otherName = isDoctor
      ? consultation?.patientId?.firstName ? `${consultation.patientId.firstName} ${consultation.patientId.lastName}` : 'Patient'
      : consultation?.doctorId?.firstName ? `Dr. ${consultation.doctorId.firstName} ${consultation.doctorId.lastName}` : 'Doctor';

    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <Shield size={14} /> Encrypted Video Consultation
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Waiting Room</h1>
            <p className="text-neutral-400">Please check your devices before joining.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Camera Preview */}
            <div className="bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden">
              <div className="relative aspect-video bg-neutral-900">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isCameraOff && (
                  <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                    <VideoOff size={40} className="text-neutral-600" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-white text-xs">Camera Preview</div>
              </div>
              <div className="p-4 flex items-center justify-center gap-3">
                <button
                  onClick={toggleMute}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}`}
                >
                  {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  onClick={toggleCamera}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isCameraOff ? 'bg-red-500/20 text-red-400' : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'}`}
                >
                  {isCameraOff ? <VideoOff size={16} /> : <VideoIcon size={16} />}
                  {isCameraOff ? 'Camera Off' : 'Camera On'}
                </button>
              </div>
            </div>

            {/* Consultation Info + Device Status */}
            <div className="space-y-4">
              {/* Consultation Info */}
              <div className="bg-neutral-800 rounded-2xl border border-neutral-700 p-5">
                <h3 className="text-white font-semibold mb-3">Consultation Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                      <User size={14} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">{otherRole}</p>
                      <p className="text-sm text-white font-medium">{otherName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <Clock size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Room</p>
                      <p className="text-sm text-white font-medium truncate max-w-[200px]">{consultation?.roomUrl || 'Virtual Room'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Device Status */}
              <div className="bg-neutral-800 rounded-2xl border border-neutral-700 p-5">
                <h3 className="text-white font-semibold mb-3">Device Status</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Camera</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${deviceStatus.camera ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {deviceStatus.camera ? 'Ready' : 'Not detected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Microphone</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${deviceStatus.mic ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {deviceStatus.mic ? 'Ready' : 'Not detected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-400">Internet</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      deviceStatus.internet === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {deviceStatus.internet === 'online' ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {deviceStatus.internet === 'online' ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Join Button */}
              <button
                onClick={joinCall}
                disabled={deviceStatus.internet === 'offline'}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <VideoIcon size={18} />
                {isDoctor ? 'Start Consultation' : 'Join Consultation'}
              </button>
            </div>
          </div>

          <button onClick={handleLeave} className="mt-6 text-neutral-500 hover:text-neutral-300 text-sm flex items-center gap-2 mx-auto">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER: In Call ───────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-neutral-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-neutral-800/95 backdrop-blur border-b border-neutral-700 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              callStatus === 'connected' ? 'bg-red-500 animate-pulse' :
              callStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
              callStatus === 'connecting' ? 'bg-yellow-500' : 'bg-neutral-500'
            }`} />
            <span className="font-semibold text-white text-sm">
              {callStatus === 'connected' ? 'Live' :
               callStatus === 'reconnecting' ? 'Reconnecting...' :
               callStatus === 'connecting' ? 'Connecting...' : 'Waiting'}
            </span>
          </div>
          <div className="w-px h-5 bg-neutral-700" />
          <span className="text-white/70 text-sm font-medium">
            {otherUser?.name || (user?.role === 'DOCTOR' ? 'Patient' : 'Doctor')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Call timer */}
          {callStatus === 'connected' && (
            <span className="text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
              {formatDuration(callTimer)}
            </span>
          )}
          {/* Connection quality */}
          <div className="flex items-center gap-1.5" title={`Connection: ${connectionQuality}`}>
            <div className={`w-2 h-2 rounded-full ${qualityColor[connectionQuality]}`} />
            <span className="text-xs text-neutral-500 hidden sm:block">{connectionQuality}</span>
          </div>
          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-400/10 px-2 py-1 rounded-md">
            <Shield size={10} /> Encrypted
          </span>
        </div>
      </header>

      {/* Video area */}
      <div className="flex-1 flex overflow-hidden relative p-3 gap-3">
        {/* Remote video (full area) */}
        <div className="flex-1 relative bg-neutral-800 rounded-2xl border border-neutral-700 overflow-hidden flex items-center justify-center shadow-lg">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />

          {/* Waiting for other participant overlay */}
          {!otherUserJoined && callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-800 text-center p-6">
              <div className="w-20 h-20 bg-neutral-700 rounded-full flex items-center justify-center animate-pulse mb-4">
                <User className="text-neutral-400" size={36} />
              </div>
              <p className="text-white font-medium text-lg">Waiting for the other participant...</p>
              <p className="text-xs text-neutral-500 mt-2">They will connect automatically when they join.</p>
              {callStatus === 'reconnecting' && (
                <div className="mt-4 flex items-center gap-2 text-yellow-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Reconnecting...
                </div>
              )}
            </div>
          )}

          {/* Reconnecting overlay (when was connected, now lost) */}
          {callStatus === 'reconnecting' && otherUserJoined && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-yellow-400 animate-spin mb-3" />
              <p className="text-white font-medium">Connection lost</p>
              <p className="text-sm text-neutral-400">Attempting to reconnect...</p>
            </div>
          )}
        </div>

        {/* Local video (PiP) */}
        <div className="w-64 h-44 absolute bottom-20 right-6 bg-neutral-950 rounded-xl border border-neutral-700 overflow-hidden shadow-2xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {isCameraOff && (
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
              <VideoOff size={28} className="text-neutral-500" />
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-2 py-0.5 rounded text-white text-xs font-medium flex items-center gap-1">
            You {isMuted && <MicOff size={10} className="text-red-400" />}
          </div>
        </div>
      </div>

      {/* Controls footer */}
      <footer className="h-18 bg-neutral-900 flex items-center justify-center px-4 shrink-0 border-t border-neutral-800">
        <div className="bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-xl">
          <button onClick={toggleMute} className={`flex flex-col items-center gap-0.5 w-14 p-2 rounded-xl transition-colors ${isMuted ? 'bg-red-500/10 text-red-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            <span className="text-[9px] font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button onClick={toggleCamera} className={`flex flex-col items-center gap-0.5 w-14 p-2 rounded-xl transition-colors ${isCameraOff ? 'bg-red-500/10 text-red-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
            {isCameraOff ? <VideoOff size={18} /> : <VideoIcon size={18} />}
            <span className="text-[9px] font-medium">{isCameraOff ? 'Cam On' : 'Cam Off'}</span>
          </button>
          {clientConfig?.features?.screenSharing && (
            <button onClick={toggleScreenShare} className={`flex flex-col items-center gap-0.5 w-14 p-2 rounded-xl transition-colors ${isScreenSharing ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}>
              {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              <span className="text-[9px] font-medium">{isScreenSharing ? 'Stop' : 'Share'}</span>
            </button>
          )}
          <div className="w-px h-8 bg-neutral-700" />
          <button onClick={handleEndCall} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl transition-colors font-bold shadow-lg shadow-red-600/20">
            <PhoneOff size={16} /> End
          </button>
        </div>
      </footer>
    </div>
  );
}
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
