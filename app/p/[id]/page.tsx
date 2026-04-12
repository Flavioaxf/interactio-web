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
  const [participantId] = useState(() => {
    // Mantemos um ID único por aba do navegador durante a sessão
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('participantId');
      if (!id) {
        id = 'part_' + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem('participantId', id);
      }
      return id;
    }
    return 'part_' + Math.random().toString(36).substring(2, 10);
  });

  // O que o usuário já respondeu nesta interação (pode ser número ou array de palavras)
  const [myResponse, setMyResponse] = useState<any>(null);
  
  // Controle do input de texto para a Nuvem de Palavras
  const [wordInput, setWordInput] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    const db = getDatabase();
    const sessionRef = ref(db, `sessions/${sessionId}`);

    const unsubscribe = onValue(sessionRef, (snapshot) => {
      const data = snapshot.val();
      setSessionData(data);
      
      if (data && data.interactions) {
        const currentIndex = typeof data.currentInteraction === 'number' ? data.currentInteraction : 0;
        const currentInteraction = data.interactions[currentIndex];
        
        if (currentInteraction) {
          const myData = data.responses?.[currentIndex]?.[participantId];
          setMyResponse(myData !== undefined ? myData : null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId, participantId]);

  // ── LÓGICA: MÚLTIPLA ESCOLHA ──
  const handleVoteMultipleChoice = async (optionIndex: number) => {
    setMyResponse(optionIndex);
    const db = getDatabase();
    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const voteRef = ref(db, `sessions/${sessionId}/responses/${currentIndex}/${participantId}`);
    await set(voteRef, optionIndex);
  };

  // ── LÓGICA: NUVEM DE PALAVRAS ──
  const handleSubmitWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = wordInput.trim().toUpperCase();
    if (!cleanWord) return;

    const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
    const currentInteraction = sessionData.interactions[currentIndex];
    const limit = currentInteraction.limit || 3;
    
    // Transforma a resposta atual num array, ou cria um novo se estiver vazio
    const currentWords: string[] = Array.isArray(myResponse) ? myResponse : [];
    
    // Impede envio se já bateu o limite numérico
    if (limit !== 'unlimited' && currentWords.length >= limit) return;

    const newWords = [...currentWords, cleanWord];
    setMyResponse(newWords);
    setWordInput(''); // Limpa o campo para a próxima palavra

    const db = getDatabase();
    const voteRef = ref(db, `sessions/${sessionId}/responses/${currentIndex}/${participantId}`);
    await set(voteRef, newWords);
  };

  const getOptionLetter = (index: number) => String.fromCharCode(65 + index);

  const Logo = () => (
    <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-[#e8e6f0]" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      inter<span className="text-[#a78bfa]">actio</span>
    </h1>
  );

  if (loading) {
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
        <div className="w-24 h-24 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6">
          <span className="text-[#ef4444] text-5xl">✖</span>
        </div>
        <p className="text-[#e8e6f0] text-3xl font-bold mb-2">Sessão Inativa</p>
        <p className="text-[#8b89a0] text-lg">O apresentador ainda não iniciou a interação.</p>
      </div>
    );
  }

  const currentIndex = typeof sessionData.currentInteraction === 'number' ? sessionData.currentInteraction : 0;
  const currentInteraction = sessionData.interactions[currentIndex];
  const type = currentInteraction?.type || 'multiple_choice';

  // Verifica se o usuário já esgotou as respostas
  const isMultipleChoiceVoted = type === 'multiple_choice' && myResponse !== null;
  
  const wordLimit = currentInteraction?.limit || 3;
  const myWordsCount = Array.isArray(myResponse) ? myResponse.length : 0;
  const isWordCloudFull = type === 'word_cloud' && wordLimit !== 'unlimited' && myWordsCount >= wordLimit;

  return (
    <div className="min-h-screen bg-[#0f0e17] relative overflow-hidden flex flex-col font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#a78bfa] rounded-full mix-blend-screen filter blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#38bdf8] rounded-full mix-blend-screen filter blur-[150px] opacity-[0.07] pointer-events-none"></div>

      <header className="flex justify-between items-center p-6 sm:px-10 border-b border-white/5 bg-[#0f0e17]/60 backdrop-blur-xl relative z-20">
        <Logo />
        <div className="bg-[#a78bfa]/10 border border-[#a78bfa]/20 px-4 py-2 rounded-xl">
          <span className="text-[#a78bfa] text-xs sm:text-sm font-black tracking-widest uppercase">
            Sessão: {sessionId}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 relative z-10 w-full max-w-2xl mx-auto">
        <div className="w-full bg-[rgba(26,25,36,0.8)] backdrop-blur-2xl border border-white/5 rounded-[32px] p-6 sm:p-10 shadow-2xl">
          
          {/* PERGUNTA SEMPRE NO TOPO */}
          <h2 className="text-[#e8e6f0] text-2xl sm:text-4xl font-black leading-snug mb-8 tracking-tight text-center">
            {currentInteraction?.question || "Aguardando pergunta..."}
          </h2>

          {/* ── MODO MÚLTIPLA ESCOLHA ── */}
          {type === 'multiple_choice' && (
            isMultipleChoiceVoted ? (
              <div className="flex flex-col items-center text-center py-8 animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/30">
                  <span className="text-emerald-400 text-5xl">✓</span>
                </div>
                <h3 className="text-[#e8e6f0] text-2xl font-bold mb-2 tracking-tight">Voto Registrado!</h3>
                <p className="text-[#8b89a0]">Olhe para o telão para ver os resultados.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                {currentInteraction?.options?.map((option: string, index: number) => (
                  <button 
                    key={index}
                    onClick={() => handleVoteMultipleChoice(index)}
                    className="group relative w-full flex items-center text-left bg-[#0f0e17]/50 rounded-2xl p-4 border border-white/5 hover:border-[#38bdf8]/60 transition-all active:scale-[0.98]"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl bg-[#1a1924] border border-white/10 flex items-center justify-center mr-4">
                      <span className="text-[#38bdf8] text-lg font-black">{getOptionLetter(index)}</span>
                    </div>
                    <span className="text-[#e8e6f0] text-lg font-semibold">{option}</span>
                  </button>
                ))}
              </div>
            )
          )}

          {/* ── MODO NUVEM DE PALAVRAS ── */}
          {type === 'word_cloud' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              
              {/* STATUS DE ENVIO */}
              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-[#f472b6] text-sm font-bold tracking-wider uppercase">Envie uma palavra</span>
                <span className="text-[#8b89a0] text-sm font-medium bg-white/5 px-3 py-1 rounded-full">
                  {wordLimit === 'unlimited' ? `${myWordsCount} enviadas` : `${myWordsCount} de ${wordLimit} respostas`}
                </span>
              </div>

              {/* CAMPO DE TEXTO E BOTÃO */}
              {!isWordCloudFull ? (
                <form onSubmit={handleSubmitWord} className="flex gap-3 mb-6">
                  <input 
                    type="text" 
                    value={wordInput}
                    onChange={(e) => setWordInput(e.target.value)}
                    placeholder="Ex: Inovação"
                    maxLength={30}
                    className="flex-1 bg-[#0f0e17] text-[#e8e6f0] text-lg rounded-2xl px-5 py-4 border border-white/10 focus:outline-none focus:border-[#f472b6]/50 transition-colors"
                  />
                  <button 
                    type="submit"
                    disabled={!wordInput.trim()}
                    className="bg-[#f472b6] text-[#0f0e17] font-black px-6 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#f9a8d4] transition-colors active:scale-95 flex items-center justify-center"
                  >
                    Enviar
                  </button>
                </form>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 flex flex-col items-center justify-center mb-6 text-center">
                  <span className="text-emerald-400 text-3xl mb-2">✓</span>
                  <p className="text-[#e8e6f0] font-bold">Limite de respostas atingido!</p>
                  <p className="text-[#8b89a0] text-sm mt-1">Acompanhe a formação da nuvem no telão.</p>
                </div>
              )}

              {/* PALAVRAS JÁ ENVIADAS PELO ALUNO (TAGS) */}
              {myWordsCount > 0 && (
                <div className="border-t border-white/5 pt-6 mt-2">
                  <p className="text-[#5a5872] text-xs font-bold tracking-widest uppercase mb-4 text-center">Suas contribuições</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {(myResponse as string[]).map((word, idx) => (
                      <span key={idx} className="bg-[rgba(244,114,182,0.1)] text-[#f472b6] border border-[#f472b6]/20 px-4 py-2 rounded-xl font-semibold text-sm animate-in zoom-in duration-300">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ── MODO Q&A (PLACEHOLDER FUTURO) ── */}
          {type === 'q_and_a' && (
            <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[#34d399] text-4xl mb-4 block">💬</span>
              <p className="text-[#e8e6f0] font-bold text-lg mb-2">Modo Q&A em desenvolvimento</p>
              <p className="text-[#8b89a0] text-sm px-6">Em breve você poderá enviar e curtir perguntas por aqui.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}