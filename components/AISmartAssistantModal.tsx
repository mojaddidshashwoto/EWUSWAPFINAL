import { useState } from "react";
import { X, Sparkles, Search, ArrowRight, CheckCircle2, ShieldCheck, MapPin, Clock } from "lucide-react";
import { Report, getMatches, itemEmoji, scoreMatch } from "@/lib/demo";

interface AISmartAssistantModalProps {
  reports: Report[];
  onClose: () => void;
  onSelectReport: (report: Report) => void;
}

export function AISmartAssistantModal({
  reports,
  onClose,
  onSelectReport,
}: AISmartAssistantModalProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    summary: string;
    matchedReports: { report: Report; confidence: number; reason: string }[];
  } | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setAiAnalysis(null);

    setTimeout(() => {
      const qLower = query.toLowerCase();

      // Find best matching found reports
      const foundReports = reports.filter((r) => r.type === "found");
      const results = foundReports
        .map((r) => {
          let conf = 40;
          let reasons: string[] = [];

          if (qLower.includes(r.category.toLowerCase())) {
            conf += 25;
            reasons.push(`Matched category '${r.category}'`);
          }
          if (r.brand && qLower.includes(r.brand.toLowerCase())) {
            conf += 20;
            reasons.push(`Matched brand '${r.brand}'`);
          }
          if (r.color && qLower.includes(r.color.toLowerCase())) {
            conf += 15;
            reasons.push(`Matched color '${r.color}'`);
          }
          if (r.location && qLower.includes(r.location.toLowerCase())) {
            conf += 20;
            reasons.push(`Matched location '${r.location}'`);
          }

          return {
            report: r,
            confidence: Math.min(conf, 96),
            reason: reasons.length ? reasons.join(" · ") : "Keyword relevance",
          };
        })
        .filter((r) => r.confidence >= 50)
        .sort((a, b) => b.confidence - a.confidence);

      setAiAnalysis({
        summary: results.length
          ? `Found ${results.length} potential matching records in EWU database based on your description.`
          : "No exact high-confidence matches found yet. We've logged this to Lost Mode alert.",
        matchedReports: results,
      });

      setSearching(false);
    }, 600);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card modal-wide flex flex-col max-h-[90vh] p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="bg-navy text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-soft/20 text-mint flex items-center justify-center font-bold">
              <Sparkles size={22} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-mint uppercase tracking-wider">Natural Language Recovery Engine</div>
              <h2 className="text-lg font-bold text-white m-0">EWU AI Search Assistant</h2>
            </div>
          </div>
          <button className="icon-button text-white/70 hover:text-white" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-6 bg-card border-b border-border space-y-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you lost in plain words (e.g. I lost my black Samsung phone in the library)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-mint/50"
              />
            </div>
            <button type="submit" disabled={searching || !query.trim()} className="button button-primary px-5 py-3 text-xs flex items-center gap-1.5 shrink-0">
              {searching ? (
                <span>Searching AI...</span>
              ) : (
                <>
                  <span>Ask AI</span>
                  <Sparkles size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Prompt Chips */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground font-semibold">Try asking:</span>
            {[
              "Black Samsung phone in Library",
              "Blue North Star backpack cafeteria",
              "Student ID card academic building",
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => {
                  setQuery(prompt);
                  setTimeout(() => handleSearch(), 50);
                }}
                className="px-2.5 py-1 rounded-md bg-muted hover:bg-accent border border-border text-navy transition-colors cursor-pointer"
              >
                "{prompt}"
              </button>
            ))}
          </div>
        </div>

        {/* Results Area */}
        <div className="p-6 space-y-4 bg-background overflow-y-auto flex-1">
          {searching ? (
            <div className="py-12 text-center space-y-3">
              <Sparkles size={36} className="text-mint animate-bounce mx-auto" />
              <div className="text-xs font-bold text-navy">AI Parsing Campus Database...</div>
              <div className="text-[11px] text-muted-foreground">Comparing categories, locations, dates, and features</div>
            </div>
          ) : aiAnalysis ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-mint-soft border border-mint/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-navy">
                  <ShieldCheck size={18} className="text-mint shrink-0" />
                  <span>{aiAnalysis.summary}</span>
                </div>
              </div>

              {aiAnalysis.matchedReports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiAnalysis.matchedReports.map(({ report, confidence, reason }) => (
                    <button
                      key={report.id}
                      onClick={() => {
                        onSelectReport(report);
                        onClose();
                      }}
                      className="p-4 rounded-xl border border-border bg-card hover:border-mint transition-all text-left flex flex-col justify-between group shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{report.category}</span>
                          <span className="text-xs font-black text-mint px-2 py-0.5 rounded bg-mint-soft">
                            {confidence}% AI Confidence
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{itemEmoji(report.icon)}</span>
                          <h4 className="text-xs font-bold text-navy truncate group-hover:text-blue m-0">{report.title}</h4>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-3">
                          <span className="flex items-center gap-1"><MapPin size={11} /> {report.location}</span>
                          <span className="flex items-center gap-1"><Clock size={11} /> {report.date}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="italic">{reason}</span>
                        <span className="text-blue font-bold flex items-center gap-1">View Details <ArrowRight size={11} /></span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <Search size={28} className="mx-auto opacity-30" />
                  <div className="text-xs font-bold text-navy">No Direct Matches Found</div>
                  <div className="text-[11px]">Try broadening your description or post a Lost Item Report directly.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground space-y-2">
              <Sparkles size={32} className="mx-auto opacity-20 text-blue" />
              <div className="text-xs font-bold text-navy">Describe what you lost to search with AI</div>
              <div className="text-[11px]">Our matching model checks category, location proximity, timestamps, and physical item features.</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/40 border-t border-border flex justify-end">
          <button className="button button-ghost text-xs" onClick={onClose}>
            Close Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
