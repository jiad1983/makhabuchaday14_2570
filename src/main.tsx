import React, {Component, type ErrorInfo, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface RootErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class RootErrorBoundary extends Component<{children: ReactNode}, RootErrorBoundaryState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = {hasError: false, errorMessage: ''};
  }

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'เกิดข้อผิดพลาดระหว่างแสดงผลหน้าเว็บ',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('App render error:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-rose-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-rose-800">ไม่สามารถแสดงผลหน้าเว็บได้</h2>
            <p className="text-sm text-stone-700 break-words">{this.state.errorMessage}</p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 cursor-pointer"
              >
                โหลดหน้าใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.clear();
                  } catch {
                    // ignore storage errors
                  }
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg border border-stone-300 bg-white text-stone-700 text-sm font-semibold hover:bg-stone-50 cursor-pointer"
              >
                ล้างข้อมูลแคชแล้วโหลดใหม่
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  const showBootErrorIfEmpty = (msg: string) => {
    if (rootElement.children.length > 0) return;
    const box = document.createElement('div');
    box.style.cssText =
      'max-width:600px;margin:48px auto;padding:24px;border:1px solid #fecdd3;border-radius:16px;background:#fff;font-family:Sarabun,sans-serif;color:#1c1917;';
    const title = document.createElement('h2');
    title.style.cssText = 'margin:0 0 8px;color:#9f1239;font-size:18px;';
    title.textContent = 'เกิดข้อผิดพลาดในการเริ่มต้นระบบ';
    const detail = document.createElement('p');
    detail.style.cssText = 'margin:0;font-size:14px;color:#44403c;word-break:break-word;';
    detail.textContent = msg;
    box.appendChild(title);
    box.appendChild(detail);
    rootElement.appendChild(box);
  };

  window.addEventListener('error', (event) => {
    showBootErrorIfEmpty(event.message || 'Unknown script error');
  });

  try {
    createRoot(rootElement).render(
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>,
    );
  } catch (err) {
    showBootErrorIfEmpty(err instanceof Error ? err.message : String(err));
  }
}
