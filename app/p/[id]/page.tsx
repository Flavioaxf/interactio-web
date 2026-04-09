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
