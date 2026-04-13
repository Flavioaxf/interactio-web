// apps/participant/app/join/[code]/page.tsx
// Interface do Participante — Next.js 14 App Router (Client Component).
//
// Fluxo:
//   1. Usuário digita o código → resolveSessionCode() → sessionId
//   2. signInAnon() → uid para identificar o voto
//   3. joinSession() → registra presença com onDisconnect
//   4. listenActiveCard() → escuta qual card está ativo
//   5. Quando activeCardId muda → carrega o card e suas respostas
//   6. submitResponse() → grava o voto com uid como chave (idempotente)

'use client';
<<<<<<< Updated upstream

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  resolveSessionCode,
  signInAnon,
  joinSession,
  submitResponse,
  listenActiveCard,
  Refs,
} from '../../../src/3_firebase';
import { get } from 'firebase/database';
import type { Card, CardOption, Response } from '../../../src/types';
// ─────────────────────────────────────────────
// Tipos locais da UI
// ─────────────────────────────────────────────

type Phase = 'enter_code' | 'loading' | 'waiting' | 'answering' | 'answered' | 'error';

interface ActiveCardState {
  cardId:    string;
  card:      Card;
  myVote:    string | null; // optionId ou null
}

// ─────────────────────────────────────────────
// Hook: gerencia toda a sessão do participante
// ─────────────────────────────────────────────

function useParticipantSession() {
  const [phase,      setPhase]      = useState<Phase>('enter_code');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [uid,        setUid]        = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ActiveCardState | null>(null);

  const unsubRef = useRef<(() => void) | null>(null);

  // ── Entra na sessão pelo código ──
  const enter = useCallback(async (code: string) => {
    setPhase('loading');
    try {
      const sid = await resolveSessionCode(code);
      if (!sid) {
        setErrorMsg('Código inválido. Verifique com o apresentador.');
        setPhase('error');
        return;
      }

      const userId = await signInAnon();
      await joinSession(sid, userId);

      setSessionId(sid);
      setUid(userId);
      setPhase('waiting');
=======
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ref, onValue, set } from 'firebase/database';
import { db } from '../../../src/firebase'; 
import { ChevronLeft } from 'lucide-react'; 

export default function ParticipantSession() {
  const params = useParams();
  const router = useRouter(); 
  const sessionId = typeof params.id === 'string' ? params.id.toUpperCase() : '';

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const [participantId, setParticipantId] = useState<string>('');
  const [myResponse, setMyResponse] = useState<any>(null);
  const [wordInput, setWordInput] = useState('');

  useEffect(() => {
    let id = sessionStorage.getItem('participantId');
    if (!id) {
      id = 'part_' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('participantId', id);
    }
    setParticipantId(id);
  }, []);

  useEffect(() => {
    if (!sessionId || !participantId) return; 
    
    const sessionRef = ref(db, `sessions/${sessionId}`);
>>>>>>> Stashed changes

      // Inicia listener do card ativo
      unsubRef.current = listenActiveCard(sid, async (cardId) => {
        if (!cardId) {
          setPhase('waiting');
          setActiveCard(null);
          return;
        }

        // Carrega os dados do card
        const cardSnap = await get(Refs.card(sid, cardId));
        if (!cardSnap.exists()) return;
        const card = cardSnap.val() as Card;

<<<<<<< Updated upstream
        // Verifica se já votou neste card
        const respSnap = await get(Refs.response(sid, cardId, userId));
        const myVote = respSnap.exists()
          ? (respSnap.val() as Response).value as string
          : null;

        setActiveCard({ cardId, card, myVote });
        setPhase(myVote ? 'answered' : 'answering');
      });
    } catch (err) {
      console.error('[Participant] Erro ao entrar:', err);
      setErrorMsg('Erro de conexão. Tente novamente.');
      setPhase('error');
    }
  }, []);

  // ── Envia voto ──
  const vote = useCallback(async (optionId: string) => {
    if (!sessionId || !uid || !activeCard || activeCard.myVote) return;

    // Optimistic update — UI responde imediatamente
    setActiveCard(prev => prev ? { ...prev, myVote: optionId } : prev);
    setPhase('answered');

    try {
      await submitResponse(sessionId, activeCard.cardId, uid, optionId);
    } catch (err) {
      // Rollback em caso de falha
      console.error('[Participant] Erro ao votar:', err);
      setActiveCard(prev => prev ? { ...prev, myVote: null } : prev);
      setPhase('answering');
    }
  }, [sessionId, uid, activeCard]);

  // Cleanup
  useEffect(() => () => { unsubRef.current?.(); }, []);

  return { phase, errorMsg, activeCard, uid, enter, vote };
}

// ─────────────────────────────────────────────
// Sub-componente: entrada do código
// ─────────────────────────────────────────────

function CodeEntry({ onEnter }: { onEnter: (code: string) => void }) {
  const [code, setCode] = useState('');

  const handleSubmit = () => {
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return;
    onEnter(clean);
  };

  return (
    <div style={ui.centerCard}>
      <h1 style={ui.logoText}>inter<span style={{ color: '#a78bfa' }}>actio</span></h1>
      <p style={ui.subtitle}>Digite o código da sessão</p>

      <input
        style={ui.codeInput}
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="ex: BX-4927"
        maxLength={10}
        autoFocus
        autoComplete="off"
        spellCheck={false}
      />

      <button
        style={{ ...ui.primaryBtn, opacity: code.trim().length < 4 ? 0.5 : 1 }}
        onClick={handleSubmit}
        disabled={code.trim().length < 4}
      >
        Entrar na sessão →
      </button>
=======
  const handleVoteMultipleChoice = async (optionIndex: number) => {
    if (!participantId) return;
    setMyResponse(optionIndex);
    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const voteRef = ref(db, `sessions/${sessionId}/responses/${currentIndex}/${participantId}`);
    await set(voteRef, optionIndex);
  };

  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = wordInput.trim().toUpperCase();
    if (!cleanWord || !participantId) return;

    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const currentInteraction = sessionData.interactions[currentIndex];
    const limit = currentInteraction.limit || 3;
    
    const currentWords: string[] = Array.isArray(myResponse) ? myResponse : [];
    
    if (limit !== 'unlimited' && currentWords.length >= limit) return;

    const newWords = [...currentWords, cleanWord];
    setMyResponse(newWords);
    setWordInput(''); 

    const voteRef = ref(db, `sessions/${sessionId}/responses/${currentIndex}/${participantId}`);
    await set(voteRef, newWords);
  };

  const handleExit = () => {
    router.replace('/'); 
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

 const Logo = () => (
    <div className="flex items-center gap-2">
      <img 
        src="/logo.png" 
        alt="Logo Interactio" 
        className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_12px_rgba(167,139,250,0.5)]" 
      />
      <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-[#e8e6f0]" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        inter<span className="text-[#a78bfa]">actio</span>
      </h1>
    </div>
  );

  if (loading || !participantId) {
    return (
      <div className="min-h-screen bg-[#0f0e17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(167,139,250,0.5)]"></div>
        <p className="text-[#e8e6f0] text-lg font-semibold tracking-wide">A conectar ao telão...</p>
      </div>
    );
  }

  if (!sessionData || !sessionData.interactions) {
    return (
      <div className="min-h-screen bg-[#0f0e17] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
          <span className="text-[#ef4444] text-4xl sm:text-5xl">✖</span>
        </div>
        <p className="text-[#e8e6f0] text-2xl sm:text-3xl font-bold mb-2">Sessão Inativa</p>
        <p className="text-[#8b89a0] text-base sm:text-lg mb-8">O apresentador ainda não iniciou a interação.</p>
        
        <button 
          onClick={handleExit}
          className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-[#e8e6f0] font-semibold hover:bg-white/10 transition-colors active:scale-95"
        >
          <ChevronLeft size={20} />
          Voltar ao Início
        </button>
      </div>
    );
  }

  const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
  const currentInteraction = sessionData.interactions[currentIndex];
  const type = currentInteraction?.type || 'multiple_choice';

  const isMultipleChoiceVoted = type === 'multiple_choice' && myResponse !== null;
  
  const wordLimit = currentInteraction?.limit || 3;
  const myWordsCount = Array.isArray(myResponse) ? myResponse.length : 0;
  const isWordCloudFull = type === 'word_cloud' && wordLimit !== 'unlimited' && myWordsCount >= wordLimit;

  return (
    <div className="min-h-screen bg-[#0f0e17] relative overflow-hidden flex flex-col font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[#a78bfa] rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-[#38bdf8] rounded-full mix-blend-screen filter blur-[100px] sm:blur-[150px] opacity-[0.07] pointer-events-none"></div>

      <header className="flex justify-between items-center p-4 sm:p-6 sm:px-10 border-b border-white/5 bg-[#0f0e17]/60 backdrop-blur-xl relative z-20">
        <div className="flex items-center gap-3">
           <button 
             onClick={handleExit}
             className="flex items-center justify-center bg-white/5 border border-white/10 w-10 h-10 sm:w-auto sm:px-4 sm:py-2 rounded-xl text-[#e8e6f0] hover:bg-white/10 transition-colors active:scale-95"
           >
             <ChevronLeft size={20} className="text-[#a78bfa]" />
             <span className="hidden sm:inline font-semibold ml-1">Sair</span>
           </button>
           <div className="hidden sm:block"><Logo /></div>
        </div>

        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl">
          <span className="text-[#a78bfa] text-[10px] sm:text-sm font-black tracking-widest uppercase">
            Sessão: {sessionId}
          </span>
        </div>
      </header>

      <div className="sm:hidden flex justify-center mt-4 z-20 relative">
        <Logo />
      </div>

      <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative z-10 w-full max-w-2xl mx-auto mt-2 sm:mt-0">
        <div className="w-full bg-[rgba(26,25,36,0.8)] backdrop-blur-2xl border border-white/5 rounded-2xl sm:rounded-[32px] p-5 sm:p-10 shadow-2xl">
          
          <h2 className="text-[#e8e6f0] text-xl sm:text-4xl font-black leading-snug mb-6 sm:mb-8 tracking-tight text-center">
            {currentInteraction?.question || "Aguardando pergunta..."}
          </h2>

          {type === 'multiple_choice' && (
            isMultipleChoiceVoted ? (
              <div className="flex flex-col items-center text-center py-6 sm:py-8 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 sm:mb-6 border border-emerald-500/30">
                  <span className="text-emerald-400 text-4xl sm:text-5xl">✓</span>
                </div>
                <h3 className="text-[#e8e6f0] text-xl sm:text-2xl font-bold mb-2 tracking-tight">Voto Registrado!</h3>
                <p className="text-[#8b89a0] text-sm sm:text-base">Olhe para o telão para ver os resultados.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                {currentInteraction?.options?.map((option: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => handleVoteMultipleChoice(index)}
                    className="group relative w-full flex items-center text-left bg-[#0f0e17]/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/5 hover:border-[#38bdf8]/60 transition-all active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-lg sm:rounded-xl bg-[#1a1924] border border-white/10 flex items-center justify-center mr-3 sm:mr-4">
                      <span className="text-[#38bdf8] text-base sm:text-lg font-black">{getOptionLetter(index)}</span>
                    </div>
                    <span className="text-[#e8e6f0] text-sm sm:text-lg font-semibold leading-snug">{option}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {type === 'word_cloud' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:px-2 gap-2">
                <span className="text-[#f472b6] text-xs sm:text-sm font-bold tracking-wider uppercase text-center">Envie uma palavra</span>
                <span className="text-[#8b89a0] text-xs sm:text-sm font-medium bg-white/5 px-3 py-1 rounded-full">
                  {wordLimit === 'unlimited' ? `${myWordsCount} enviadas` : `${myWordsCount} de ${wordLimit} respostas`}
                </span>
              </div>

              {!isWordCloudFull ? (
                <form onSubmit={handleSubmitWord} className="flex flex-col sm:flex-row gap-3 mb-6">
                  <input 
                    type="text" 
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    placeholder="Ex: Inovação"
                    maxLength={30}
                    className="w-full sm:flex-1 bg-[#0f0e17] text-[#e8e6f0] text-base sm:text-lg rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 border border-white/10 focus:outline-none focus:border-[#f472b6]/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={!wordInput.trim()}
                    className="w-full sm:w-auto py-3 sm:py-0 bg-[#f472b6] text-[#0f0e17] font-black px-6 rounded-xl sm:rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9a8d4] transition-colors active:scale-95 flex items-center justify-center"
                  >
                    Enviar
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center mb-6 text-center">
                  <span className="text-emerald-400 text-2xl sm:text-3xl mb-2">✓</span>
                  <p className="text-[#e8e6f0] font-bold text-sm sm:text-base">Limite de respostas atingido!</p>
                  <p className="text-[#8b89a0] text-xs sm:text-sm mt-1">Acompanhe a formação da nuvem no telão.</p>
                </div>
              )}

              {myWordsCount > 0 && (
                <div className="border-t border-white/5 pt-5 sm:pt-6 mt-2">
                  <p className="text-[#5a5872] text-[10px] sm:text-xs font-bold tracking-widest uppercase mb-3 sm:mb-4 text-center">Suas contribuições</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(myResponse as string[]).map((word, idx) => (
                      <span key={idx} className="bg-[rgba(244,114,182,0.1)] text-[#f472b6] border border-[#f472b6]/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm animate-in zoom-in duration-300">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {type === 'q_and_a' && (
            <div className="text-center py-8 sm:py-10 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
              <span className="text-[#34d399] text-3xl sm:text-4xl mb-3 sm:mb-4 block">💬</span>
              <p className="text-[#e8e6f0] font-bold text-base sm:text-lg mb-2">Modo Q&A em desenvolvimento</p>
              <p className="text-[#8b89a0] text-xs sm:text-sm px-4 sm:px-6">Em breve você poderá enviar e curtir perguntas por aqui.</p>
            </div>
          )}

        </div>
      </main>
>>>>>>> Stashed changes
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-componente: opção de voto
// ─────────────────────────────────────────────

const OPTION_COLORS = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#fb7185'];
const OPTION_KEYS   = ['opt_a', 'opt_b', 'opt_c', 'opt_d', 'opt_e'];

function VoteOption({
  optionId, option, index, selected, disabled, onVote,
}: {
  optionId: string;
  option:   CardOption;
  index:    number;
  selected: boolean;
  disabled: boolean;
  onVote:   (id: string) => void;
}) {
  const color = OPTION_COLORS[index % OPTION_COLORS.length];
  const label = String.fromCharCode(65 + index);

  return (
    <button
      onClick={() => !disabled && onVote(optionId)}
      disabled={disabled}
      style={{
        ...ui.optionBtn,
        borderColor:     selected ? color : 'rgba(255,255,255,0.08)',
        backgroundColor: selected ? color + '22' : '#1a1927',
        cursor:          disabled ? 'default' : 'pointer',
        transform:       selected ? 'scale(1.01)' : 'scale(1)',
        transition:      'all 0.2s ease',
      }}
    >
      <span style={{ ...ui.optionBadge, backgroundColor: color + '33', color }}>
        {label}
      </span>
      <span style={ui.optionText}>{option.text}</span>
      {selected && <span style={{ color, fontSize: 20 }}>✓</span>}
    </button>
  );
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────

export default function ParticipantPage() {
  const { phase, errorMsg, activeCard, enter, vote } = useParticipantSession();

  // ── Render por fase ──
  if (phase === 'enter_code') {
    return <CodeEntry onEnter={enter} />;
  }

  if (phase === 'loading') {
    return (
      <div style={ui.centerCard}>
        <div style={ui.spinner} />
        <p style={ui.subtitle}>Conectando…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={ui.centerCard}>
        <p style={{ ...ui.subtitle, color: '#fb7185' }}>⚠ {errorMsg}</p>
        <button style={ui.primaryBtn} onClick={() => window.location.reload()}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (phase === 'waiting' || !activeCard) {
    return (
      <div style={ui.centerCard}>
        <div style={ui.waitingPulse} />
        <p style={ui.titleText}>Aguardando o apresentador…</p>
        <p style={ui.subtitle}>A próxima pergunta aparecerá aqui automaticamente.</p>
      </div>
    );
  }

  const { card, myVote, cardId } = activeCard;
  const optionEntries = card.options
    ? OPTION_KEYS
        .filter(k => card.options![k])
        .map(k => ({ id: k, option: card.options![k] }))
    : [];

  return (
    <div style={ui.page}>
      {/* Pergunta */}
      <div style={ui.questionCard}>
        <span style={ui.typeBadge}>📊 Múltipla escolha</span>
        <h2 style={ui.questionText}>{card.question}</h2>
      </div>

      {/* Opções */}
      <div style={ui.optionsList}>
        {optionEntries.map(({ id, option }, i) => (
          <VoteOption
            key={id}
            optionId={id}
            option={option}
            index={i}
            selected={myVote === id}
            disabled={!!myVote}
            onVote={vote}
          />
        ))}
      </div>

      {/* Feedback pós-voto */}
      {phase === 'answered' && (
        <div style={ui.answeredBanner}>
          <span style={{ fontSize: 24 }}>✓</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#34d399' }}>Resposta registrada!</p>
            <p style={{ margin: 0, fontSize: 13, color: '#8b89a0' }}>
              Aguarde a próxima pergunta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Estilos inline (CSSProperties)
// ─────────────────────────────────────────────

const ui: Record<string, React.CSSProperties> = {
  page: {
    minHeight:       '100dvh',
    backgroundColor: '#0f0e17',
    padding:         '20px 16px 40px',
    maxWidth:        480,
    margin:          '0 auto',
  },
  centerCard: {
    minHeight:      '100dvh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            20,
    padding:        '0 24px',
    backgroundColor: '#0f0e17',
  },
  logoText: {
    fontFamily:  'sans-serif',
    fontSize:    32,
    fontWeight:  700,
    color:       '#e8e6f0',
    margin:      0,
    letterSpacing: '-0.04em',
  },
  titleText: {
    fontSize:   22,
    fontWeight: 700,
    color:      '#e8e6f0',
    margin:     0,
    textAlign:  'center',
  },
  subtitle: {
    fontSize:  15,
    color:     '#8b89a0',
    margin:    0,
    textAlign: 'center',
  },
  codeInput: {
    width:           '100%',
    maxWidth:        280,
    backgroundColor: '#1a1927',
    border:          '1.5px solid rgba(255,255,255,0.12)',
    borderRadius:    12,
    padding:         '16px 20px',
    color:           '#e8e6f0',
    fontSize:        24,
    fontWeight:      700,
    letterSpacing:   '0.12em',
    textAlign:       'center',
    outline:         'none',
    fontFamily:      'monospace',
  },
  primaryBtn: {
    width:           '100%',
    maxWidth:        280,
    backgroundColor: '#a78bfa',
    border:          'none',
    borderRadius:    12,
    padding:         '16px 24px',
    color:           '#0f0e17',
    fontSize:        16,
    fontWeight:      700,
    cursor:          'pointer',
  },
  spinner: {
    width:       40,
    height:      40,
    border:      '3px solid rgba(167,139,250,0.2)',
    borderTop:   '3px solid #a78bfa',
    borderRadius: '50%',
    animation:   'spin 0.8s linear infinite',
  },
  waitingPulse: {
    width:        60,
    height:       60,
    borderRadius: '50%',
    backgroundColor: 'rgba(167,139,250,0.2)',
    animation:    'pulse 2s ease-in-out infinite',
  },
  questionCard: {
    backgroundColor: '#1a1927',
    borderRadius:    16,
    padding:         '20px',
    marginBottom:    20,
    border:          '1px solid rgba(255,255,255,0.07)',
  },
  typeBadge: {
    display:         'inline-block',
    backgroundColor: 'rgba(167,139,250,0.15)',
    color:           '#a78bfa',
    borderRadius:    100,
    padding:         '4px 12px',
    fontSize:        12,
    fontWeight:      700,
    marginBottom:    12,
  },
  questionText: {
    fontSize:   20,
    fontWeight: 700,
    color:      '#e8e6f0',
    margin:     0,
    lineHeight: 1.4,
  },
  optionsList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           10,
  },
  optionBtn: {
    display:        'flex',
    alignItems:     'center',
    gap:            12,
    width:          '100%',
    backgroundColor: '#1a1927',
    border:         '1.5px solid rgba(255,255,255,0.08)',
    borderRadius:   12,
    padding:        '14px 16px',
    textAlign:      'left',
  },
  optionBadge: {
    width:          32,
    height:         32,
    borderRadius:   8,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       13,
    fontWeight:     700,
    flexShrink:     0,
  },
  optionText: {
    flex:       1,
    fontSize:   15,
    color:      '#e8e6f0',
    fontWeight: 500,
    textAlign:  'left',
  },
  answeredBanner: {
    display:        'flex',
    alignItems:     'center',
    gap:            14,
    backgroundColor: 'rgba(52,211,153,0.1)',
    border:         '1px solid rgba(52,211,153,0.2)',
    borderRadius:   12,
    padding:        '16px 18px',
    marginTop:      20,
  },
};
