import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, X, Trash2, CheckCircle, LogIn, AlertTriangle } from 'lucide-react';

export default function CartModal({ isOpen, onClose, cart, removeFromCart, user, updateUser, clearCart, openAuth }) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!user) {
      onClose();
      openAuth();
      return;
    }

    // PRE-FLIGHT CHECK: filter out courses the user already owns
    const alreadyOwned = cart.filter(c => user.purchasedCourses?.some(pc => ((typeof pc.courseId === "object" ? pc.courseId._id : pc.courseId) === c._id)));
    const newItems     = cart.filter(c => !user.purchasedCourses?.some(pc => ((typeof pc.courseId === "object" ? pc.courseId._id : pc.courseId) === c._id)));

    if (alreadyOwned.length > 0 && newItems.length === 0) {
      alert(`⚠️ You already own all the courses in your cart:\n\n${alreadyOwned.map(c => `• ${c.title}`).join('\n')}\n\nYour cart has been cleared.`);
      clearCart();
      onClose();
      return;
    }

    if (alreadyOwned.length > 0) {
      const names = alreadyOwned.map(c => `• ${c.title}`).join('\n');
      alert(`ℹ️ The following courses were removed from your cart because you already own them:\n\n${names}\n\nProceeding with the remaining ${newItems.length} course(s).`);
      // Remove already-owned items from cart state
      alreadyOwned.forEach(c => removeFromCart(c._id));
    }

    if (newItems.length === 0) return;

    setIsProcessing(true);

    // Simulate payment gateway delay FIRST, then confirm with backend
    await new Promise(r => setTimeout(r, 1500));

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, courseIds: newItems.map(c => c._id) })
      });
      const data = await res.json();

      if (data.success) {
        // Only show success AFTER backend confirms
        alert(`✅ Payment Authorized!\n\n${newItems.length} course(s) successfully added to your account.`);
        updateUser(data.user);
        clearCart();
        onClose();
      } else {
        alert(`❌ Checkout failed: ${data.message}`);
      }
    } catch (err) {
      alert('❌ Network error during checkout. Please try again.');
      console.error('Checkout error:', err);
    }

    setIsProcessing(false);
  };

  // Only count items that the user doesn't already own for total
  const newItems = user
    ? cart.filter(c => !user.purchasedCourses?.some(pc => ((typeof pc.courseId === "object" ? pc.courseId._id : pc.courseId) === c._id)))
    : cart;

  const total = newItems.reduce((sum, item) => {
    const match = item.price.match(/-?\d+/);
    const num = match ? parseInt(match[0], 10) : 0;
    return sum + (isNaN(num) || num < 0 ? 0 : num); // Prevent negative totals
  }, 0);

  const hasAlreadyOwnedItems = user && cart.some(c => user.purchasedCourses?.some(pc => ((typeof pc.courseId === "object" ? pc.courseId._id : pc.courseId) === c._id)));

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] sm:p-4">
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} className="bg-[#0a0a0a] border-t-2 sm:border-2 border-accent w-full max-w-lg p-8 relative shadow-[0_0_50px_rgba(0,255,136,0.2)] max-h-[90vh] overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-accent transition-colors"><X size={24} /></button>

          <div className="flex items-center gap-2 text-accent mb-8 border-b border-gray-800 pb-4">
            <ShoppingCart size={24} />
            <h2 className="text-xl font-black uppercase tracking-widest">Your Cart</h2>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-mono uppercase tracking-widest mb-8">Cart is empty.</p>
              {!user && (
                <div className="bg-[#111] border border-gray-800 p-6 flex flex-col items-center">
                  <p className="text-gray-400 font-mono mb-6 text-sm italic">
                    "Your cart is as empty as a developer's coffee cup at 3 AM."
                  </p>
                  <button
                    onClick={() => { onClose(); openAuth(); }}
                    className="bg-accent text-black font-black uppercase tracking-widest px-6 py-3 hover:bg-white transition-all flex items-center gap-2"
                  >
                    <LogIn size={18} /> Sign In To Shop
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Warn about already-owned items */}
              {hasAlreadyOwnedItems && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 p-3 mb-4 flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-yellow-400 font-mono text-xs">Some items in your cart are already owned. They will be removed automatically at checkout.</p>
                </div>
              )}

              <div className="space-y-4 mb-8">
                {cart.map((item, idx) => {
                  const alreadyOwned = user?.purchasedCourses?.some(pc => pc.courseId === item._id);
                  return (
                    <div key={idx} className={`flex justify-between items-center border p-4 ${alreadyOwned ? 'bg-yellow-500/5 border-yellow-500/30 opacity-60' : 'bg-[#111] border-gray-800'}`}>
                      <div>
                        <h4 className="font-bold text-white uppercase">{item.title}</h4>
                        <p className="font-mono text-sm">
                          {alreadyOwned
                            ? <span className="text-yellow-500">Already owned — will be removed</span>
                            : <span className="text-accent">{item.price}</span>
                          }
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(item._id)} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center border-t border-gray-800 pt-6 mb-6">
                <div>
                  <span className="font-mono text-gray-400 uppercase tracking-widest text-sm">Amount Due</span>
                  {hasAlreadyOwnedItems && <p className="text-yellow-500 font-mono text-xs">(owned items excluded)</p>}
                </div>
                <span className="text-3xl font-black text-white">₹{total.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 hover:bg-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing Payment...' : (user ? 'Proceed to Payment' : 'Login to Checkout')}
                <CheckCircle size={20} />
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
