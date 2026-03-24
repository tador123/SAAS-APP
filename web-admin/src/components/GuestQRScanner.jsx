import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, Search, X, UserCheck, Camera, Keyboard, Video, VideoOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../api/axios';
import Modal from './Modal';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'scanner', label: 'Scanner / Paste', icon: Keyboard },
];

/**
 * GuestQRScanner — Staff scan a guest QR code to:
 *   - mode="checkin" (Reservations page): Auto-check-in guest's today reservation
 *   - mode="lookup"  (Guests page): Look up and import guest profile
 *
 * @param {Function} onGuestFound - Callback: (guest) for lookup mode, ({ guest, reservation }) for checkin mode
 * @param {'checkin'|'lookup'} mode - Operating mode (default: 'checkin')
 */
export default function GuestQRScanner({ onGuestFound, mode = 'checkin' }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('camera');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { guest, reservation?, message? }
  const [error, setError] = useState('');

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const html5QrRef = useRef(null);
  const scannerContainerId = 'qr-camera-reader';
  const inputRef = useRef(null);
  const scanningRef = useRef(false);

  const scanQR = useCallback(async (qrToken) => {
    const cleanToken = qrToken.trim();
    if (!cleanToken) return;
    // Prevent duplicate concurrent scans (camera fires multiple callbacks)
    if (scanningRef.current) return;
    scanningRef.current = true;

    setLoading(true);
    setError('');
    setResult(null);
    try {
      if (mode === 'checkin') {
        const res = await api.post('/reservations/checkin-by-qr', { qrToken: cleanToken });
        const guest = res.data.guest;
        setResult({ guest, reservation: res.data.reservation, checkedIn: true });
        toast.success(`${guest?.firstName || 'Guest'} ${guest?.lastName || ''} checked in!`);
        // Immediately notify parent to refresh reservations list
        if (onGuestFound) onGuestFound({ guest, reservation: res.data.reservation, checkedIn: true });
      } else if (mode === 'table-checkin') {
        const res = await api.post('/table-reservations/checkin-by-qr', { qrToken: cleanToken });
        const r = res.data.reservation;
        setResult({ tableReservation: r, seated: true });
        toast.success(res.data.message);
        if (onGuestFound) onGuestFound({ reservation: r, seated: true });
      } else {
        const res = await api.get(`/guest-register/scan/${encodeURIComponent(cleanToken)}`);
        setResult({ guest: res.data.guest });
      }
    } catch (err) {
      console.error('[QR Scan] Error:', err.response?.status, err.response?.data || err.message);
      if (mode === 'checkin' && err.response?.status === 404 && err.response?.data?.guest) {
        // Guest found but no reservation for today
        setResult({ guest: err.response.data.guest, noReservation: true });
        setError(err.response.data.message || 'No reservation found for today');
      } else if (err.response?.status === 404) {
        setError('No guest found with this QR code');
      } else if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Invalid QR code format');
      } else {
        setError(err.response?.data?.error || err.message || 'Scan failed — please try again');
      }
    } finally {
      setLoading(false);
      scanningRef.current = false;
    }
  }, [mode, onGuestFound]);

  // Stop camera helper
  const stopCamera = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        const state = html5QrRef.current.getState();
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

  // Clean up on modal close
  useEffect(() => {
    if (!open) {
      stopCamera();
      setToken('');
      setResult(null);
      setError('');
      setCameraError('');
      setTab('camera');
    }
  }, [open, stopCamera]);

  useEffect(() => {
    if (tab !== 'camera') stopCamera();
  }, [tab, stopCamera]);

  useEffect(() => {
    if (open && tab === 'scanner') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, tab]);

  const startCamera = async () => {
    setCameraError('');
    setError('');
    setResult(null);

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
          if (scanningRef.current) return;
          stopCamera();
          setToken(decodedText);
          scanQR(decodedText);
        },
        () => {}
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
      scanQR(token);
    }
  };

  const handleUseGuest = () => {
    if (result?.guest && onGuestFound) {
      if (mode === 'checkin') {
        onGuestFound({ guest: result.guest, reservation: result.reservation, checkedIn: result.checkedIn });
      } else {
        onGuestFound(result.guest);
      }
      setOpen(false);
    }
  };

  const isCheckin = mode === 'checkin';
  const isTableCheckin = mode === 'table-checkin';
  const buttonLabel = isTableCheckin ? 'Scan Table QR' : isCheckin ? 'QR Check-In' : 'Scan Guest QR';
  const modalTitle = isTableCheckin ? 'Seat Guest — Scan Table Reservation QR' : isCheckin ? 'Quick Check-In — Scan QR Code' : 'Scan Guest QR Code';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 text-sm ${isCheckin || isTableCheckin ? 'btn-primary' : 'btn-secondary'}`}
        title={isTableCheckin ? 'Scan table reservation QR to seat guest' : isCheckin ? 'Scan guest QR to check in instantly' : 'Scan guest QR code for quick lookup'}
      >
        <QrCode size={16} /> {buttonLabel}
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={modalTitle} size="lg">
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
                {isTableCheckin
                  ? 'Point camera at the guest\u2019s table reservation QR to seat them.'
                  : isCheckin
                    ? 'Point camera at the guest\u2019s QR code to check them in instantly.'
                    : 'Use your computer\u2019s camera to scan the guest\u2019s QR code.'}
              </p>

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
                  onClick={() => scanQR(token)}
                  disabled={!token.trim() || loading}
                  className="btn-primary flex items-center gap-1"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search size={16} />
                  )}
                  {isTableCheckin ? 'Seat' : isCheckin ? 'Check In' : 'Lookup'}
                </button>
              </div>
            </div>
          )}

          {/* Error (only for errors without a guest result) */}
          {error && !result?.noReservation && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <X size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Check-in success */}
          {result?.checkedIn && result.reservation && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                <CheckCircle size={22} />
                Checked In Successfully!
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Guest:</span>
                  <p className="font-medium text-gray-900">{result.guest.firstName} {result.guest.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Room:</span>
                  <p className="font-medium text-gray-900">{result.reservation.room?.roomNumber} ({result.reservation.room?.type})</p>
                </div>
                <div>
                  <span className="text-gray-500">Check In:</span>
                  <p className="font-medium text-gray-900">{result.reservation.checkIn}</p>
                </div>
                <div>
                  <span className="text-gray-500">Check Out:</span>
                  <p className="font-medium text-gray-900">{result.reservation.checkOut}</p>
                </div>
                {result.guest.phone && (
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <p className="font-medium text-gray-900">{result.guest.phone}</p>
                  </div>
                )}
                {result.guest.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{result.guest.email}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUseGuest}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle size={16} />
                Done
              </button>
            </div>
          )}

          {/* Table reservation seated success */}
          {result?.seated && result.tableReservation && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-semibold text-lg">
                <CheckCircle size={22} />
                Guest Seated!
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Guest:</span>
                  <p className="font-medium text-gray-900">{result.tableReservation.guest?.firstName} {result.tableReservation.guest?.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Table:</span>
                  <p className="font-medium text-gray-900">#{result.tableReservation.table?.tableNumber}</p>
                </div>
                <div>
                  <span className="text-gray-500">Party Size:</span>
                  <p className="font-medium text-gray-900">{result.tableReservation.partySize}</p>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <p className="font-medium text-gray-900">{result.tableReservation.reservationTime?.slice(0, 5)}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
                <CheckCircle size={16} /> Done
              </button>
            </div>
          )}

          {/* Guest found but no reservation for today (checkin mode) */}
          {result?.noReservation && result.guest && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 font-medium">
                <AlertTriangle size={18} />
                Guest Found — No Reservation for Today
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium text-gray-900">{result.guest.firstName} {result.guest.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">{result.guest.phone}</p>
                </div>
              </div>
              <p className="text-sm text-amber-600">
                This guest does not have a reservation for today. You can create a walk-in reservation manually.
              </p>
              <button
                onClick={handleUseGuest}
                className="w-full btn-secondary flex items-center justify-center gap-2 mt-2"
              >
                <UserCheck size={16} />
                Create Reservation for This Guest
              </button>
            </div>
          )}

          {/* Lookup mode: guest result card */}
          {!isCheckin && result?.guest && !result.checkedIn && !result.noReservation && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 font-medium">
                <UserCheck size={18} />
                Guest Found
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium text-gray-900">{result.guest.firstName} {result.guest.lastName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">{result.guest.phone}</p>
                </div>
                {result.guest.email && (
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{result.guest.email}</p>
                  </div>
                )}
                {result.guest.idType && (
                  <div>
                    <span className="text-gray-500">ID:</span>
                    <p className="font-medium text-gray-900">
                      {result.guest.idType.replace(/_/g, ' ')} — {result.guest.idNumber}
                    </p>
                  </div>
                )}
                {result.guest.nationality && (
                  <div>
                    <span className="text-gray-500">Nationality:</span>
                    <p className="font-medium text-gray-900">{result.guest.nationality}</p>
                  </div>
                )}
                {result.guest.dateOfBirth && (
                  <div>
                    <span className="text-gray-500">Date of Birth:</span>
                    <p className="font-medium text-gray-900">{result.guest.dateOfBirth}</p>
                  </div>
                )}
                {result.guest.address && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Address:</span>
                    <p className="font-medium text-gray-900">{result.guest.address}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleUseGuest}
                className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
              >
                <UserCheck size={16} />
                Use This Guest
              </button>
            </div>
          )}

          {/* Help text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
              <li>Guest books via the mobile app and receives a personal QR code</li>
              <li>At check-in, scan the QR code &mdash; {isCheckin ? 'guest is checked in instantly' : 'guest details are imported'}</li>
              <li>{isCheckin ? 'No manual entry needed — room is marked occupied automatically' : 'No manual data entry needed'}</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  );
}
