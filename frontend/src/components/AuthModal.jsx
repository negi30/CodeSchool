import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, X, ShieldAlert, KeyRound } from 'lucide-react';

const MODES = { LOGIN: 'login', SIGNUP: 'signup', FORGOT: 'forgot' };

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [mode, setMode] = useState(MODES.LOGIN);
  const [step, setStep] = useState(1); // 1=form, 2=otp, 3=done
  const [isAdmin2FA, setIsAdmin2FA] = useState(false);

  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [error, setError]       = useState('');
  const [info, setInfo]         = useState('');

  if (!isOpen) return null;

  const resetAll = () => {
    setMode(MODES.LOGIN); setStep(1); setIsAdmin2FA(false);
    setName(''); setEmail(''); setPassword(''); setNewPassword('');
    setOtp(''); setError(''); setInfo('');
  };
  const handleClose = () => { resetAll(); onClose(); };
  const err = (msg) => setError(msg);
  const clearErr = () => { setError(''); setInfo(''); };

  // ── LOGIN ──────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault(); clearErr();
    const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (data.step === '2fa') return setIsAdmin2FA(true);
    if (data.success) { onLoginSuccess(data.user); handleClose(); }
    else err(data.message);
  };

  // ── ADMIN 2FA ──────────────────────────────────────────────
  const handleVerify2FA = async (e) => {
    e.preventDefault(); clearErr();
    const res  = await fetch('/api/auth/verify-2fa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) });
    const data = await res.json();
    if (data.success) { onLoginSuccess(data.user); handleClose(); }
    else err(data.message);
  };

  // ── SIGNUP STEP 1: send OTP ─────────────────────────────────
  const handleSendSignupOtp = async (e) => {
    e.preventDefault(); clearErr();
    const res  = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (data.success) setStep(2);
    else err(data.message);
  };

  // ── SIGNUP STEP 2: verify OTP ───────────────────────────────
  const handleVerifySignupOtp = async (e) => {
    e.preventDefault(); clearErr();
    const res  = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, otp }) });
    const data = await res.json();
    if (data.success) { onLoginSuccess(data.user); handleClose(); }
    else err(data.message);
  };

  // ── FORGOT STEP 1: send reset OTP ──────────────────────────
  const handleSendResetOtp = async (e) => {
    e.preventDefault(); clearErr();
    const res  = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (data.success) { setStep(2); setInfo('Reset code sent! Check your inbox.'); }
    else err(data.message);
  };

  // ── FORGOT STEP 2: verify OTP + new password ───────────────
  const handleResetPassword = async (e) => {
    e.preventDefault(); clearErr();
    if (newPassword.length < 6) return err('Password must be at least 6 characters.');
    const res  = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp, newPassword }) });
    const data = await res.json();
    if (data.success) { setStep(3); setInfo('Password reset! You can now log in.'); }
    else err(data.message);
  };

  const inputCls = (accent = 'accent') =>
    `w-full bg-[#111] border border-gray-800 focus:border-${accent} p-3 text-white font-mono outline-none transition-colors`;
  const labelCls = 'block text-xs font-mono uppercase text-gray-500 mb-1';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0a0a0a] border-2 border-accent w-full max-w-md p-8 relative shadow-[0_0_50px_rgba(0,255,136,0.15)]">
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-accent transition-colors"><X size={24} /></button>

          {/* Header */}
          <div className="flex items-center gap-2 text-accent mb-6">
            {mode === MODES.FORGOT ? <KeyRound size={24}/> : isAdmin2FA ? <ShieldAlert size={24} className="text-red-500"/> : <Terminal size={24}/>}
            <h2 className="text-xl font-black uppercase tracking-widest">
              {isAdmin2FA ? 'Admin 2FA Verification' : mode === MODES.FORGOT ? 'Reset Password' : mode === MODES.LOGIN ? 'Log In' : 'Create Account'}
            </h2>
          </div>

          {/* Mode tabs (only when not in special states) */}
          {!isAdmin2FA && mode !== MODES.FORGOT && (
            <div className="flex mb-6 border-b border-gray-800">
              {[MODES.LOGIN, MODES.SIGNUP].map(m => (
                <button key={m} onClick={() => { setMode(m); clearErr(); setStep(1); }}
                  className={`pb-2 flex-1 font-mono uppercase text-sm font-bold tracking-widest transition-colors ${mode === m ? 'text-accent border-b-2 border-accent' : 'text-gray-600 hover:text-gray-400'}`}>
                  {m === MODES.LOGIN ? 'Log In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {error && <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 mb-4 font-mono text-sm">{error}</div>}
          {info  && <div className="bg-accent/10 border border-accent text-accent p-3 mb-4 font-mono text-sm">{info}</div>}

          {/* ── ADMIN 2FA ── */}
          {isAdmin2FA && (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="bg-red-500/10 border border-red-500 p-4 flex items-start gap-3">
                <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={18}/>
                <p className="text-red-400 font-mono text-sm">A 6-digit security code was sent to <strong>{email}</strong>. This code expires in 10 minutes.</p>
              </div>
              <div><label className={labelCls}>Admin 2FA Code</label>
                <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} className={`${inputCls('red-500')} text-center text-2xl tracking-[0.5em] border-red-500/50`} placeholder="000000" maxLength={6} />
              </div>
              <button type="submit" className="w-full bg-red-500 text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all mt-2">Verify Access</button>
            </form>
          )}

          {/* ── LOGIN ── */}
          {!isAdmin2FA && mode === MODES.LOGIN && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className={labelCls}>Email Address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls()} placeholder="you@example.com" /></div>
              <div><label className={labelCls}>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputCls()} placeholder="••••••••" /></div>
              <button type="submit" className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all">Log In</button>
              <button type="button" onClick={() => { setMode(MODES.FORGOT); setStep(1); clearErr(); }} className="w-full text-center text-gray-500 hover:text-accent font-mono text-sm transition-colors pt-1">Forgot Password?</button>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {!isAdmin2FA && mode === MODES.SIGNUP && step === 1 && (
            <form onSubmit={handleSendSignupOtp} className="space-y-4">
              <div><label className={labelCls}>Full Name</label><input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls()} placeholder="John Doe" /></div>
              <div><label className={labelCls}>Email Address</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls()} placeholder="you@example.com" /></div>
              <div><label className={labelCls}>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} className={inputCls()} placeholder="At least 6 characters" /></div>
              <button type="submit" className="w-full border-2 border-accent text-accent font-black uppercase tracking-widest py-4 hover:bg-accent hover:text-black transition-all">Send Verification Code</button>
            </form>
          )}

          {!isAdmin2FA && mode === MODES.SIGNUP && step === 2 && (
            <form onSubmit={handleVerifySignupOtp} className="space-y-4">
              <div className="bg-accent/10 border border-accent p-4 font-mono text-sm text-accent">Verification code sent to <strong>{email}</strong>.</div>
              <div><label className={labelCls}>Verification Code</label>
                <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} className={`${inputCls()} text-center text-2xl tracking-[0.5em]`} placeholder="0000" maxLength={4} />
              </div>
              <button type="submit" className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all">Verify & Create Account</button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {!isAdmin2FA && mode === MODES.FORGOT && step === 1 && (
            <form onSubmit={handleSendResetOtp} className="space-y-4">
              <div><label className={labelCls}>Registered Email</label><input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls()} placeholder="you@example.com" /></div>
              <button type="submit" className="w-full border-2 border-accent text-accent font-black uppercase tracking-widest py-4 hover:bg-accent hover:text-black transition-all">Send Reset Code</button>
              <button type="button" onClick={() => { setMode(MODES.LOGIN); setStep(1); clearErr(); }} className="w-full text-center text-gray-500 hover:text-accent font-mono text-sm transition-colors">← Back to Log In</button>
            </form>
          )}

          {!isAdmin2FA && mode === MODES.FORGOT && step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div><label className={labelCls}>Reset Code (6-digit)</label>
                <input type="text" required value={otp} onChange={e => setOtp(e.target.value)} className={`${inputCls()} text-center text-2xl tracking-[0.5em]`} placeholder="000000" maxLength={6} />
              </div>
              <div><label className={labelCls}>New Password</label><input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls()} placeholder="At least 6 characters" /></div>
              <button type="submit" className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all">Reset Password</button>
            </form>
          )}

          {!isAdmin2FA && mode === MODES.FORGOT && step === 3 && (
            <div className="text-center py-6">
              <p className="text-accent font-mono mb-6">Password updated successfully!</p>
              <button onClick={() => { setMode(MODES.LOGIN); setStep(1); clearErr(); }} className="bg-accent text-black font-black uppercase tracking-widest px-8 py-3 hover:bg-white transition-all">Log In Now</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
