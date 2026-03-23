import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, Search, X, UserCheck, Camera, Keyboard, Video, VideoOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';
import Modal from './Modal';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'scanner', label: 'Scanner / Paste', icon: Keyboard },
];

/**
 * GuestQRScanner — A button + modal component that lets staff look up a guest
 * by scanning a QR code via:
 *   1. Computer webcam / camera
 *   2. USB/Bluetooth barcode scanner device (keyboard input)
 *   3. Manual token paste
 *
 * Works in both web-admin (browser) and desktop (Tauri) apps.
 *
 * @param {Function} onGuestFound - Callback with the full guest object when found
 */
export default function GuestQRScanner({ onGuestFound }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('camera');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState('');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrRef = useRef(null);
  const scannerContainerId = 'qr-camera-reader';

  const inputRef = useRef(null);

  const lookupGuest = useCallback(async (qrToken) => {
    const cleanToken = qrToken.trim();
    if (!cleanToken) return;

    setLoading(true);
    setError('');
    setGuest(null);
    try {
      const res = await api.get(`/guest-register/scan/${encodeURIComponent(cleanToken)}`);
      setGuest(res.data.guest);
    } catch (err) {
      const msg = err.response?.status === 404
        ? 'No guest found with this QR code'
        : err.response?.data?.error || 'Lookup failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        const state = html5QrRef.current.getState();
        // 2 = SCANNING per html5-qrcode
        if (state === 2) {
          await html5QrRef.current.stop();
        }
      } catch {
        // ignore stop errors
      }
      html5QrRef.current.clear();
      html5QrRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Clean up camera when modal closes or tab changes away from camera
  useEffect(() => {
    if (!open) {
      stopCamera();
      setToken('');
      setGuest(null);
      setError('');
      setCameraError('');
      setTab('camera');
    }
  }, [open, stopCamera]);

  useEffect(() => {
    if (tab !== 'camera') {
      stopCamera();
    }
  }, [tab, stopCamera]);

  // Focus input when switching to scanner tab
  useEffect(() => {
    if (open && tab === 'scanner') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, tab]);

  const startCamera = async () => {
    setCameraError('');
    setError('');
    setGuest(null);

    // Wait a tick so the container div is in the DOM
    await new Promise((r) => setTimeout(r, 100));

    const container = document.getElementById(scannerContainerId);
    if (!container) {
      setCameraError('Scanner container not found. Please try again.');
      return;
    }

    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          // QR decoded — stop camera and lookup
          stopCamera();
          setToken(decodedText);
          lookupGuest(decodedText);
        },
        () => {
          // scan attempt — no match yet, ignore
        }
      );
      setCameraActive(true);
    } catch (err) {
      const msg =
        err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission')
          ? 'Camera permission denied. Please allow camera access and try again.'
          : err?.toString().includes('NotFoundError')
            ? 'No camera found on this device. Use the Scanner / Paste tab instead.'
            : `Camera error: ${err?.message || err}`;
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      lookupGuest(token);
    }
  };

  const handleUseGuest = () => {
    if (guest && onGuestFound) {
      onGuestFound(guest);
      toast.success(`Guest loaded: ${guest.firstName} ${guest.lastName}`);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary flex items-center gap-2 text-sm"
        title="Scan guest QR code for quick check-in"
      >
        <QrCode size={16} /> Scan Guest QR
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Scan Guest QR Code" size="lg">
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Camera Tab */}
          {tab === 'camera' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Use your computer&apos;s camera to scan the guest&apos;s QR code.
              </p>

              {/* Camera viewport */}
              <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: 320 }}>
                <div id={scannerContainerId} className="w-full" />

                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Video size={48} className="opacity-50" />
                    <button onClick={startCamera} className="btn-primary flex items-center gap-2">
                      <Camera size={16} />
                      Start Camera
                    </button>
                  </div>
                )}
              </div>

              {cameraActive && (
                <button
                  onClick={stopCamera}
                  className="btn-secondary flex items-center gap-2 text-sm w-full justify-center"
                >
                  <VideoOff size={16} />
                  Stop Camera
                </button>
              )}

              {cameraError && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                  <X size={16} className="shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {/* Scanner / Paste Tab */}
          {tab === 'scanner' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Scan with a USB/Bluetooth barcode scanner, or paste the QR token manually.
                Scanner devices send keystrokes ending with Enter &mdash; just click the input and scan.
              </p>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="input-field pl-9 font-mono text-sm"
                    placeholder="Scan or paste QR token here..."
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => lookupGuest(token)}
                  disabled={!token.trim() || loading}
                  className="btn-primary flex items-center gap-1"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search size={16} />
                  )}
                  Lookup
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <X size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Guest result card */}
          {guest && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <UserCheck size={18} />
                Guest Found
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium text-gray-900">{guest.firstName} {guest.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">{guest.phone}</p>
                </div>
                {guest.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{guest.email}</p>
                  </div>
                )}
                {guest.idType && (
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-medium text-gray-900">
                      {guest.idType.replace(/_/g, ' ')} — {guest.idNumber}
                    </p>
                  </div>
                )}
                {guest.nationality && (
                  <div>
                    <span className="text-gray-500">Nationality:</span>
                    <p className="font-medium text-gray-900">{guest.nationality}</p>
                  </div>
                )}
                {guest.dateOfBirth && (
                  <div>
                    <span className="text-gray-500">Date of Birth:</span>
                    <p className="font-medium text-gray-900">{guest.dateOfBirth}</p>
                  </div>
                )}
                {guest.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>
                    <p className="font-medium text-gray-900">{guest.address}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUseGuest}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
              >
                <UserCheck size={16} />
                Use This Guest for Reservation
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
              <li>Guest registers via the mobile app and receives a personal QR code</li>
              <li>At check-in, use the <strong>Camera</strong> tab or a barcode scanner device</li>
              <li>Guest details are imported automatically &mdash; no manual entry needed</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  );
}
