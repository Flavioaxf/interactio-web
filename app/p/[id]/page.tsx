'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import '../../../src/firebase'; 

export default function ParticipantSession() {
  const params = useParams();
  const sessionId = typeof params.id === 'string' ? params.id.toUpperCase() : '';

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [participantId] = useState(() => 'aluno_' + Math.random().toString(36).substring(2, 10));
  const [hasVoted, setHasVoted] = useState(false);
  const [votedOption, setVotedOption] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const db = getDatabase();
    const sessionRef = ref(db, `sessions/${sessionId}`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      setSessionData(data);
      
      if (data && data.currentInteraction) {
        const currentId = data.currentInteraction;
        const myVote = data.responses?.[currentId]?.[participantId];
        
        if (myVote !== undefined) {
          setHasVoted(true);
          setVotedOption(myVote);
        } else {
          setHasVoted(false);
          setVotedOption(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId, participantId]);

  const handleVote = async (optionIndex: number) => {
    setHasVoted(true);
    setVotedOption(optionIndex);
    const db = getDatabase();
    const currentId = sessionData.currentInteraction;
    const voteRef = ref(db, `sessions/${sessionId}/responses/${currentId}/${participantId}`);
    await set(voteRef, optionIndex);
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  // ── COMPONENTE DA LOGO PADRONIZADA ──
  const Logo = () => (
    <h1 
      className="text-3xl sm:text-4xl font-black tracking-tighter text-[#e8e6f0]" 
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
    >
      inter<span className="text-[#a78bfa]">actio</span>
    </h1>
  );

  // ── TELAS DE ESTADO (CARREGANDO / ERRO) ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0e17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(167,139,250,0.5)]"></div>
        <p className="text-[#e8e6f0] text-lg font-semibold tracking-wide">A conectar ao telão...</p>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-[#0f0e17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
          <span className="text-[#ef4444] text-5xl">✖</span>
        </div>
        <p className="text-[#e8e6f0] text-3xl font-bold mb-2">Sessão Encerrada</p>
        <p className="text-[#8b89a0] text-lg">Verifique o código ou peça ajuda ao professor.</p>
      </div>
    );
  }

  const currentInteraction = sessionData?.interactions?.[sessionData?.currentInteraction];

  // ── RENDERIZAÇÃO PRINCIPAL ──
  return (
    <div className="min-h-screen bg-[#0f0e17] relative overflow-hidden flex flex-col font-sans">
      
      {/* ── EFEITOS DE LUZ NO FUNDO (NEON BLUR) ── */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#a78bfa] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#38bdf8] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.07] pointer-events-none"></div>

      {/* ── HEADER ── */}
      <header className="flex justify-between items-center p-6 sm:px-10 border-b border-white/5 bg-[#0f0e17]/60 backdrop-blur-xl relative z-20">
        <Logo />
        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-4 py-2 rounded-xl shadow-[0_0_10px_rgba(167,139,250,0.1)]">
          <span className="text-[#a78bfa] text-xs sm:text-sm font-black tracking-widest uppercase">
            Sala: {sessionId}
          </span>
        </div>
      </header>

      {/* ── ÁREA CENTRAL (CARTÃO DE INTERAÇÃO FLUTUANTE) ── */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative z-10 w-full max-w-2xl mx-auto">
        
        <div className="w-full bg-[#1a1924]/80 backdrop-blur-2xl border border-white/5 rounded-[32px] p-6 sm:p-12 shadow-2xl">
          
          {/* ESTADO: AGUARDANDO PERGUNTA */}
          {!currentInteraction && (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-24 h-24 rounded-full bg-[#a78bfa]/10 flex items-center justify-center mb-8 border border-[#a78bfa]/20 animate-pulse">
                <span className="text-[#a78bfa] text-4xl">⏳</span>
              </div>
              <h2 className="text-[#e8e6f0] text-3xl font-bold mb-3 tracking-tight">Olhe para o telão!</h2>
              <p className="text-[#8b89a0] text-lg">Aguarde o professor iniciar a votação.</p>
            </div>
          )}

          {/* ESTADO: VOTO COMPUTADO */}
          {currentInteraction && hasVoted && (
            <div className="flex flex-col items-center text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-28 h-28 rounded-full bg-emerald-500/10 flex items-center justify-center mb-8 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <span className="text-emerald-400 text-6xl">✓</span>
              </div>
              <h2 className="text-[#e8e6f0] text-3xl font-bold mb-4 tracking-tight">Voto Confirmado!</h2>
              <p className="text-[#8b89a0] text-lg leading-relaxed">
                Você escolheu a <span className="text-[#a78bfa] font-bold">Opção {getOptionLetter(votedOption!)}</span>. Acompanhe os resultados ao vivo no telão.
              </p>
            </div>
          )}

          {/* ESTADO: PERGUNTA ATIVA PARA VOTAR */}
          {currentInteraction && !hasVoted && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 w-full">
              <h2 className="text-[#e8e6f0] text-2xl sm:text-4xl font-black leading-snug mb-10 tracking-tight text-center">
                {currentInteraction.question}
              </h2>
              
              <div className="flex flex-col gap-5">
                {currentInteraction.options.map((option: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => handleVote(index)}
                    className="group relative w-full flex items-center text-left bg-[#0f0e17]/50 rounded-2xl p-4 sm:p-5 border border-white/5 hover:border-[#a78bfa]/60 hover:bg-[#a78bfa]/5 transition-all duration-300 ease-out active:scale-[0.98] overflow-hidden"
                  >
                    {/* Efeito Hover Glow dentro do botão */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#a78bfa]/0 via-[#a78bfa]/5 to-[#a78bfa]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-xl bg-[#1a1924] border border-white/10 flex items-center justify-center mr-5 group-hover:border-[#a78bfa]/40 transition-colors shadow-inner">
                      <span className="text-[#a78bfa] text-xl sm:text-2xl font-black">
                        {getOptionLetter(index)}
                      </span>
                    </div>
                    <span className="text-[#e8e6f0] text-[17px] sm:text-xl font-semibold pr-3 relative z-10">
                      {option}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}