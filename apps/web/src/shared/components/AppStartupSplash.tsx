import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Zap } from 'lucide-react';

const SPLASH_KEY = 'rayoexpress-startup-splash-seen';

export function AppStartupSplash() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(SPLASH_KEY) !== '1';
  });

  useEffect(() => {
    if (!visible) return undefined;

    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem(SPLASH_KEY, '1');
      setVisible(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-white px-8 text-center text-text-primary"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-purple-100/90 to-transparent" />
          <div className="absolute left-8 top-16 h-20 w-20 rounded-full bg-yellow-300/30 blur-2xl" />
          <div className="absolute right-8 top-28 h-28 w-28 rounded-full bg-purple-500/15 blur-3xl" />

          <motion.img
            src="/icons/icon-512.svg"
            alt="RayoExpress"
            className="h-36 w-36 drop-shadow-2xl sm:h-44 sm:w-44"
            initial={{ scale: 0.86, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          />

          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h1 className="text-2xl font-black text-text-primary">Bienvenido</h1>
            <p className="mt-2 text-sm font-medium text-text-secondary">Tu delivery, mas rapido y mas cerca de ti.</p>
          </motion.div>

          <motion.div
            className="relative mt-12 h-36 w-full max-w-sm"
            initial={{ x: -28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 100, damping: 18 }}
          >
            <div className="absolute bottom-8 left-1/2 h-16 w-56 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-800 to-violet-500 shadow-2xl">
              <div className="absolute -top-8 left-8 h-12 w-24 rounded-t-[2rem] bg-purple-700 shadow-lg" />
              <div className="absolute right-8 top-5 h-8 w-20 rounded-full bg-slate-950" />
              <div className="absolute left-16 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-300 text-purple-900 shadow">
                <Zap size={24} fill="currentColor" />
              </div>
              <div className="absolute left-4 top-8 h-2 w-20 rounded-full bg-yellow-300" />
            </div>
            <div className="absolute bottom-1 left-[20%] h-16 w-16 rounded-full border-[11px] border-slate-950 bg-white shadow-xl" />
            <div className="absolute bottom-1 right-[20%] h-16 w-16 rounded-full border-[11px] border-slate-950 bg-white shadow-xl" />
            <div className="absolute bottom-0 left-1/2 h-2 w-64 -translate-x-1/2 rounded-full bg-slate-900/10 blur-sm" />
          </motion.div>

          <div className="mt-10 w-full max-w-xs">
            <div className="h-1.5 overflow-hidden rounded-full bg-purple-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-700 to-yellow-300"
                initial={{ width: '18%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.55, ease: 'easeInOut' }}
              />
            </div>
            <p className="mt-4 text-sm font-medium text-text-secondary">Cargando...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
