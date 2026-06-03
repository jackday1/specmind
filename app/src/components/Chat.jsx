import { useState, useRef, useEffect } from 'preact/hooks';
import { getConversations, createConversation, getConversation, askConversation, deleteConversation, loadMoreMessages } from '../api.js';

export default function Chat({ teamId, projectId }) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [limitError, setLimitError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const scrollRef = useRef(null);
  const scrollRestore = useRef(null);

  useEffect(() => { if (projectId) loadConversations(); }, [projectId]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (scrollRestore.current) {
      const { prevTop, prevHeight } = scrollRestore.current;
      scrollRef.current.scrollTop = prevTop + (scrollRef.current.scrollHeight - prevHeight);
      scrollRestore.current = null;
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadConversations = async () => {
    try { setConversations(await getConversations(projectId)); } catch (err) { console.error(err); }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await getConversation(id);
      setActiveId(id);
      setMessages(conv.messages || []);
      setHasMore(conv.hasMore || false);
      setLimitError('');
    } catch (err) { console.error(err); }
  };

  const handleNew = async () => {
    if (!projectId) return;
    try {
      const conv = await createConversation('', projectId);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv._id);
      setMessages([]);
      setHasMore(false);
      setLimitError('');
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await deleteConversation(id);
      const updated = conversations.filter((c) => c._id !== id);
      setConversations(updated);
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch (err) { console.error(err); }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    scrollRestore.current = {
      prevTop: scrollRef.current?.scrollTop || 0,
      prevHeight: scrollRef.current?.scrollHeight || 0,
    };
    try {
      const oldest = messages[0];
      const { messages: older, hasMore: more } = await loadMoreMessages(activeId, oldest.timestamp);
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
    } catch (err) {
      scrollRestore.current = null;
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending || !activeId) return;
    const question = input.trim();
    setInput('');
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: question, timestamp: new Date().toISOString() }]);
    try {
      const { answer } = await askConversation(activeId, question);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer, timestamp: new Date().toISOString() }]);
      loadConversations();
    } catch (err) {
      const msg = err.message || 'Something went wrong. Please try again.';
      setLimitError(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: msg, timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div class="flex h-[calc(100vh-140px)] -mx-4 md:-mx-6">
      <div class="w-56 shrink-0 border-r border-[#2a2520] flex flex-col bg-[#0c0b0a]">
        <div class="p-3 border-b border-[#2a2520]">
          <button onClick={handleNew} class="btn-primary w-full text-xs justify-center">+ New chat</button>
        </div>
        <div class="flex-1 overflow-y-auto">
          {conversations.length === 0 && <p class="text-[10px] text-[#635d56] p-3 text-center">No conversations yet</p>}
          {conversations.map((conv) => (
            <div key={conv._id} onClick={() => loadConversation(conv._id)}
              class={`group flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                activeId === conv._id ? 'bg-[rgba(240,101,67,0.06)] border-l-2 border-l-[#f06543]' : 'border-l-2 border-l-transparent hover:bg-[#151311]'
              }`}>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-[#efe9e1] truncate">{conv.title}</p>
                <p class="text-[10px] text-[#635d56] mono mt-0.5">{formatDate(conv.updatedAt)}</p>
              </div>
              <button onClick={(e) => handleDelete(conv._id, e)} class="opacity-0 group-hover:opacity-100 btn-ghost text-[10px] px-1.5 shrink-0">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      <div class="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <svg class="w-6 h-6 text-[#635d56] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
              <p class="text-sm text-[#8f887e] mb-1">Select a conversation</p>
              <button onClick={handleNew} class="btn-primary text-xs">Start a new chat</button>
            </div>
          </div>
        ) : (
          <>
            {limitError && (
              <div class="bg-[rgba(229,83,75,0.06)] border-b border-[rgba(229,83,75,0.15)] px-4 py-2.5 text-xs text-[#e5534b] flex items-center gap-2">
                <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>{limitError}</span>
              </div>
            )}
            <div ref={scrollRef} class="flex-1 overflow-y-auto space-y-4 p-4 md:p-6">
              {hasMore && (
                <div class="text-center pb-2">
                  <button onClick={handleLoadMore} disabled={loadingMore} class="text-[10px] text-[#8f887e] hover:text-[#efe9e1] transition-colors disabled:opacity-40">
                    {loadingMore ? 'Loading...' : 'Load earlier messages'}
                  </button>
                </div>
              )}
              {messages.length === 0 && <div class="text-center mt-20"><p class="text-sm text-[#8f887e]">Ask a question to get started</p></div>}
              {messages.map((msg, i) => (
                <div key={i} class={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div class={`w-7 h-7 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-[#f06543] text-white' : 'bg-[#1d1a17] text-[#8f887e] border border-[#2a2520]'}`}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div class={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#151311] border border-[#2a2520] text-[#efe9e1]' : 'bg-[#151311] border border-[#2a2520] text-[#d6d0c8]'}`}>
                    <div class="whitespace-pre-wrap">{msg.content}</div>
                    <div class="text-[10px] text-[#635d56] mt-1.5">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
              {sending && (
                <div class="flex gap-3">
                  <div class="w-7 h-7 bg-[#1d1a17] text-[#8f887e] border border-[#2a2520] flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">AI</div>
                  <div class="bg-[#151311] border border-[#2a2520] px-4 py-2.5"><span class="inline-block w-2 h-2 bg-[#f06543] animate-pulse" /></div>
                </div>
              )}
            </div>
            <form onSubmit={handleSend} class="flex gap-3 p-4 md:p-6 border-t border-[#2a2520]">
              <input type="text" value={input} onInput={(e) => setInput(e.target.value)} placeholder={limitError ? 'Message limit reached' : 'Ask about your specifications...'} disabled={sending || !!limitError} class="input-field flex-1 disabled:opacity-30" />
              <button type="submit" disabled={!input.trim() || sending || !!limitError} class="btn-primary">Send</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
