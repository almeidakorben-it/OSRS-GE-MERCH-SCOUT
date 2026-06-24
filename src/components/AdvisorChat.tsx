import React, { useState } from "react";
import { Sparkles, Send, HelpCircle, Coins, MessageSquare } from "lucide-react";

interface AdvisorChatProps {
  activeAlgoId?: string;
}

export default function AdvisorChat({ activeAlgoId = "momentum" }: AdvisorChatProps) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "advisor"; text: string }>>([
    {
      sender: "advisor",
      text: "Salutations, fellow merchant! I am your OSRS mercantile advisor. Ask me anything about Grand Exchange flipping, tax optimization, risk mitigation, or high-volume skilling commodities!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generalQuestion: userMsg, activeAlgoId }),
      });
      const data = await response.json();
      if (data.success && data.advice) {
        setMessages((prev) => [...prev, { sender: "advisor", text: data.advice }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "advisor", text: `My merchanting contacts failed to reply. Details: ${data.error || "Unknown API error"}` },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { sender: "advisor", text: `Alas! The Grand Exchange servers encountered an error: ${err?.message || err}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    return text.split("\n").map((line, idx) => {
      let content = line;
      content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-300 mt-0.5" dangerouslySetInnerHTML={{ __html: content.substring(2) }} />
        );
      }
      return (
        <p key={idx} className="text-slate-300 mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      );
    });
  };

  const setQuestionHeuristic = (question: string) => {
    setInput(question);
  };

  return (
    <div id="advisor-chat-panel" className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col h-full min-h-[500px]">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 font-display">
          <MessageSquare className="w-4 h-4 text-purple-400 animate-pulse" />
          Wise Merchant Chat Advisor
        </h2>
        <span className="text-[9px] uppercase tracking-wider bg-purple-950/40 border border-purple-800/30 text-purple-400 font-bold px-2 py-0.5 rounded-full">
          Gemini AI Active
        </span>
      </div>

      {/* Messages scroll box */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 scrollbar-thin max-h-[400px]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`p-3.5 rounded-xl max-w-[85%] text-xs ${
              msg.sender === "user"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "bg-slate-950/80 border border-slate-800 text-slate-200"
            }`}>
              {msg.sender === "advisor" ? (
                <div className="prose prose-invert max-w-none text-left break-words">
                  {parseMarkdown(msg.text)}
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            <span>Advising merchant...</span>
          </div>
        )}
      </div>

      {/* Quick helper prompts */}
      <div className="mb-4">
        <span className="text-[10px] text-slate-500 font-bold block mb-1.5 uppercase tracking-wider">Example Consultations:</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            "How do OSRS Grand Exchange buy limits reset?",
            "Suggest optimal flips with 15M starting budget.",
            "Explain the difference between skilling staples & rare uniques.",
          ].map((q, idx) => (
            <button
              key={idx}
              onClick={() => setQuestionHeuristic(q)}
              className="text-[10px] bg-slate-950/60 border border-slate-850 text-slate-400 hover:text-white hover:border-slate-705 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Form Submission */}
      <form onSubmit={handleSendMessage} className="relative mt-auto">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about buy limits, cash budgets, meta shifts..."
          className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg pl-4 pr-10 py-3 focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600 font-medium"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-amber-500 disabled:text-slate-700 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
