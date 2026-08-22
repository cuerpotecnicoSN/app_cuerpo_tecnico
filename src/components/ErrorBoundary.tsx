import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Cambia este valor para reiniciar el error al navegar a otra sección. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/** Evita que un fallo de render deje la aplicación en blanco: muestra el error y permite continuar. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de render:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-2xl mx-auto my-10 bg-white border border-red-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex items-start gap-4 p-6">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0"><AlertTriangle size={24} /></div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-gray-900">Algo ha fallado en esta pantalla</h2>
            <p className="text-sm font-bold text-gray-500 mt-1">
              Los datos guardados no se han perdido. Puedes reintentar o recargar la página.
            </p>
            <pre className="mt-4 text-xs font-mono text-red-700 bg-red-50 border border-red-100 rounded-xl p-3 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
              {error.message}
            </pre>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          <button onClick={() => this.setState({ error: null })} className="px-5 py-2.5 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-xl transition-colors">
            Reintentar
          </button>
          <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-md">
            <RefreshCw size={16} /> Recargar
          </button>
        </div>
      </div>
    );
  }
}
