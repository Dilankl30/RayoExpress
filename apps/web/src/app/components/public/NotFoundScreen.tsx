import { useNavigate } from 'react-router';
import { useAuth } from '../../../modules/auth/context/AuthContext';
import { Zap, Home, ArrowLeft } from 'lucide-react';
import { getFallbackPathForRole } from '../../../shared/security/access-policy';

export function NotFoundScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (!user) {
      navigate('/login');
      return;
    }

    navigate(getFallbackPathForRole(user.role));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12 relative overflow-hidden select-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md text-center z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="w-20 h-20 rounded-3xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shadow-lg shadow-purple-500/5 mb-8 relative group">
          <div className="absolute inset-0 rounded-3xl bg-purple-500/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <Zap className="w-10 h-10 text-purple-600 dark:text-purple-400 animate-pulse" />
        </div>

        <h1 className="text-8xl font-black tracking-tight text-purple-600 dark:text-purple-400 select-all mb-2">
          404
        </h1>
        <h2 className="text-2xl font-bold text-text-primary mb-4">
          Página no encontrada
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed max-w-xs mb-10">
          Lo sentimos, la ruta que buscas no existe o ha sido movida a otro lugar.
        </p>

        <div className="w-full flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-secondary hover:bg-secondary/80 border border-border text-text-primary text-sm font-semibold transition-all duration-300 active:scale-98"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold shadow-lg shadow-purple-600/15 hover:shadow-purple-700/20 transition-all duration-300 active:scale-98"
          >
            <Home className="w-4 h-4" />
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
}
