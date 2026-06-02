import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase.js';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center px-6 bg-[#0c0b0a]">
      <div class="w-full max-w-sm animate-fade-in">
        <div class="mb-12 text-center">
          <div class="inline-flex items-center gap-2 mb-6">
            <svg class="w-5 h-5 text-[#f06543]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M8 8h8M8 12h5M8 16h8" stroke-linecap="round"/>
            </svg>
            <span class="mono text-xs text-[#8f887e] tracking-wider uppercase">SpecMind</span>
          </div>
          <h1 class="text-2xl font-bold text-[#efe9e1] mb-2">AI-powered spec review</h1>
          <p class="text-sm text-[#8f887e]">Upload, analyze, and chat with your team's specification documents</p>
        </div>

        <div class="card mb-8">
          <div class="space-y-4">
            {[
              { step: '01', title: 'Upload a spec document', desc: 'PDF or DOCX. AI extracts and analyzes the contents.' },
              { step: '02', title: 'Review AI findings', desc: 'Mismatches, unclear items, missing configs surfaced instantly.' },
              { step: '03', title: 'Chat with your knowledge base', desc: 'Your whole team can ask the AI about any spec at any time.' },
            ].map(({ step, title, desc }) => (
              <div key={step} class="flex items-start gap-3">
                <span class="mono text-[10px] text-[#f06543] bg-[rgba(240,101,67,0.08)] border border-[rgba(240,101,67,0.15)] px-1.5 py-0.5 shrink-0 mt-px">{step}</span>
                <div>
                  <h3 class="text-sm font-medium text-[#efe9e1]">{title}</h3>
                  <p class="text-xs text-[#8f887e] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleLogin}
          class="w-full flex items-center justify-center gap-3 bg-[#efe9e1] hover:bg-white text-[#0c0b0a] font-semibold text-sm py-3 px-6 transition-colors active:translate-y-px"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p class="text-center text-[10px] text-[#635d56] mt-8 mono">
          built for product & engineering teams
        </p>
      </div>
    </div>
  );
}
