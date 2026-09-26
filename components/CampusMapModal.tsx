import { useState } from "react";
import { X, MapPin, Compass, Search, Filter, Shield, Layers, Plus } from "lucide-react";
import { Report, locationCoordinates, itemEmoji, categories } from "@/lib/demo";

interface CampusMapModalProps {
  reports: Report[];
  onClose: () => void;
  onSelectReport: (report: Report) => void;
  onSelectLocationForReport?: (locationName: string) => void;
  pickerMode?: boolean;
}

export function CampusMapModal({
  reports,
  onClose,
  onSelectReport,
  onSelectLocationForReport,
  pickerMode = false,
}: CampusMapModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"all" | "lost" | "found">("all");
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  const filteredReports = reports.filter((r) => {
    return (
      (selectedType === "all" || r.type === selectedType) &&
      (selectedCategory === "all" || r.category === selectedCategory)
    );
  });

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal-card modal-wide flex flex-col h-[680px] max-h-[92vh] p-0 overflow-hidden" role="dialog">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-soft text-blue flex items-center justify-center font-bold">
              <Compass size={22} />
            </div>
            <div>
              <div className="eyebrow accent-text flex items-center gap-1.5">
                <MapPin size={13} /> East West University Campus
              </div>
              <h2 className="text-lg font-bold text-navy m-0">
                {pickerMode ? "Select Location on Campus Map" : "Interactive Campus Recovery Map"}
              </h2>
            </div>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Filter Toolbar */}
        {!pickerMode && (
          <div className="px-6 py-3 bg-muted/40 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="segmented">
                <button className={selectedType === "all" ? "selected" : ""} onClick={() => setSelectedType("all")}>
                  All Pins
                </button>
                <button className={selectedType === "lost" ? "selected" : ""} onClick={() => setSelectedType("lost")}>
                  Lost Only
                </button>
                <button className={selectedType === "found" ? "selected" : ""} onClick={() => setSelectedType("found")}>
                  Found Only
                </button>
              </div>

              <div className="select-wrap">
                <Filter size={13} />
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-coral inline-block" /> Lost Pin
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-mint inline-block" /> Found Pin
              </span>
              <span className="font-semibold text-navy">{filteredReports.length} items plotted</span>
            </div>
          </div>
        )}

        {/* Interactive SVG Campus Map */}
        <div className="relative flex-1 bg-[#102f42] overflow-hidden select-none">
          {/* SVG Map Graphic */}
          <svg className="w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="gridGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#173e55" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#102f42" stopOpacity="0.8" />
              </linearGradient>
              <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="1000" height="600" fill="url(#gridGrad)" />
            <rect width="1000" height="600" fill="url(#gridPattern)" />

            {/* EWU Campus Buildings & Zone Outlines */}
            {/* Main Academic Block A */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="350" y="100" width="220" height="180" rx="12" fill="#1e4e6c" stroke="#2c7893" strokeWidth="2" />
              <text x="460" y="190" fill="#a5cad6" textAnchor="middle" fontSize="14" fontWeight="bold">
                ACADEMIC BLOCK A
              </text>
              <text x="460" y="210" fill="#699ab0" textAnchor="middle" fontSize="11">
                Classrooms & Offices
              </text>
            </g>

            {/* EWU Library Block */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="650" y="90" width="200" height="150" rx="12" fill="#19485b" stroke="#65b99e" strokeWidth="2" />
              <text x="750" y="165" fill="#aee6d4" textAnchor="middle" fontSize="14" fontWeight="bold">
                CENTRAL LIBRARY
              </text>
              <text x="750" y="185" fill="#6da392" textAnchor="middle" fontSize="11">
                2nd & 3rd Floor
              </text>
            </g>

            {/* Cafeteria & Student Plaza */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="180" y="320" width="220" height="140" rx="12" fill="#254238" stroke="#65b99e" strokeWidth="2" />
              <text x="290" y="385" fill="#bceadc" textAnchor="middle" fontSize="14" fontWeight="bold">
                CAFETERIA & PLAZA
              </text>
              <text x="290" y="405" fill="#6bb59e" textAnchor="middle" fontSize="11">
                Food Court
              </text>
            </g>

            {/* Auditorium */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="520" y="350" width="180" height="130" rx="12" fill="#38283a" stroke="#e86f61" strokeWidth="2" />
              <text x="610" y="410" fill="#f5c7c2" textAnchor="middle" fontSize="14" fontWeight="bold">
                AUDITORIUM
              </text>
              <text x="610" y="430" fill="#b87a74" textAnchor="middle" fontSize="11">
                Main Hall
              </text>
            </g>

            {/* Playground & Sports Area */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="420" y="490" width="240" height="80" rx="8" fill="#1b3d32" stroke="#489178" strokeDasharray="4 4" strokeWidth="2" />
              <text x="540" y="535" fill="#8bc9b5" textAnchor="middle" fontSize="13" fontWeight="bold">
                CAMPUS PLAYGROUND
              </text>
            </g>

            {/* Main Gate & Security Desk */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="60" y="440" width="130" height="110" rx="10" fill="#3a3020" stroke="#e9a84c" strokeWidth="2" />
              <text x="125" y="490" fill="#fadb9e" textAnchor="middle" fontSize="13" fontWeight="bold">
                MAIN GATE
              </text>
              <text x="125" y="510" fill="#b09156" textAnchor="middle" fontSize="10">
                EWU Security Office
              </text>
            </g>

            {/* Parking Area */}
            <g className="transition-opacity hover:opacity-90">
              <rect x="780" y="440" width="160" height="110" rx="10" fill="#243440" stroke="#4b7086" strokeWidth="1.5" />
              <text x="860" y="495" fill="#a4c2d4" textAnchor="middle" fontSize="13" fontWeight="bold">
                PARKING LOT
              </text>
            </g>

            {/* Walkways / Pathways */}
            <path d="M 125 440 L 125 390 L 180 390 M 400 390 L 520 390 M 460 280 L 460 350 M 570 190 L 650 190" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" strokeLinecap="round" />

            {/* Location Hotspots for Picker Mode */}
            {pickerMode &&
              Object.entries(locationCoordinates).map(([locName, coord]) => {
                const cx = (coord.x / 100) * 1000;
                const cy = (coord.y / 100) * 600;
                return (
                  <g
                    key={locName}
                    className="cursor-pointer group"
                    onClick={() => {
                      if (onSelectLocationForReport) {
                        onSelectLocationForReport(locName);
                        onClose();
                      }
                    }}
                  >
                    <circle cx={cx} cy={cy} r="22" fill="#2c7893" fillOpacity="0.4" className="animate-ping" />
                    <circle cx={cx} cy={cy} r="14" fill="#2c7893" stroke="#ffffff" strokeWidth="2" />
                    <text x={cx} y={cy + 4} fill="#ffffff" textAnchor="middle" fontSize="11" fontWeight="bold">
                      +
                    </text>
                    <title>{coord.label}</title>
                  </g>
                );
              })}
          </svg>

          {/* HTML Overlay Pin Markers for Reports */}
          {!pickerMode &&
            filteredReports.map((report) => {
              const coords = report.pinCoordinates || locationCoordinates[report.location] || { x: 50, y: 50 };
              const isLost = report.type === "lost";

              return (
                <div
                  key={report.id}
                  style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 group cursor-pointer"
                  onClick={() => onSelectReport(report)}
                >
                  <div
                    className={`size-9 rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-transform hover:scale-125 ${
                      isLost ? "bg-coral shadow-coral/40" : "bg-mint shadow-mint/40"
                    }`}
                  >
                    <span className="text-sm">{itemEmoji(report.icon)}</span>
                  </div>

                  {/* Tooltip Card on Hover */}
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 rounded-lg bg-card border border-border shadow-xl z-20 text-left pointer-events-none">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase flex justify-between">
                      <span>{report.category}</span>
                      <span className={isLost ? "text-coral" : "text-mint"}>{report.type.toUpperCase()}</span>
                    </div>
                    <div className="text-xs font-bold text-navy truncate mt-0.5">{report.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {report.location}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-3 bg-card border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-mint" />
            <span>Click on any item marker to view report details and initiate recovery.</span>
          </div>
          <button className="button button-ghost py-1 px-3 text-xs" onClick={onClose}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}
