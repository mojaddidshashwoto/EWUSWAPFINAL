export type Role = "student" | "security" | "admin";
export type ReportType = "lost" | "found";
export type ReportStatus =
  | "Lost"
  | "Possible Match"
  | "Found"
  | "Claim Submitted"
  | "Verification Required"
  | "Verified"
  | "At Security"
  | "Ready for Pickup"
  | "Returned";

export type Report = {
  id: string;
  type: ReportType;
  title: string;
  category: string;
  brand: string;
  color: string;
  description: string;
  location: string;
  specificLocation?: string;
  date: string;
  time: string;
  status: ReportStatus;
  createdBy: string;
  createdByName: string;
  custodyStatus?: string;
  sensitive?: boolean;
  icon: string;
  accent: string;
  features?: string;
  imageUrl?: string;
  pinCoordinates?: { x: number; y: number };
};

export type Claim = {
  id: string;
  reportId: string;
  claimantId: string;
  claimantName: string;
  status: "Submitted" | "Under Review" | "Verification Required" | "Verified" | "Rejected" | "Returned";
  submittedAt: string;
  answers?: string;
  claimPin?: string;
  pickupSlot?: string;
  securityDesk?: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "security" | "finder";
  text: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  reportId: string;
  reportTitle: string;
  otherPartyName: string;
  otherPartyRole: string;
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
};

export type LockerHub = {
  id: string;
  name: string;
  building: string;
  availableLockers: number;
  totalLockers: number;
  code: string;
  status: "active" | "full";
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  tone: "blue" | "green" | "orange";
  read: boolean;
  createdAt: string;
};

export type AppState = {
  reports: Report[];
  claims: Claim[];
  notifications: AppNotification[];
  chatThreads: ChatThread[];
  chatMessages: Record<string, ChatMessage[]>;
  role: Role;
  lostMode: boolean;
  lockers: LockerHub[];
};

export const categories = [
  "Mobile Phone",
  "Laptop",
  "Tablet",
  "Wallet",
  "ID Card",
  "Bank Card",
  "Keys",
  "Earbuds",
  "Watch",
  "Bag",
  "Books",
  "Clothing",
  "Documents",
  "Accessories",
  "Other",
];

export const locations = [
  "Academic Building",
  "Classroom",
  "Library",
  "Cafeteria",
  "Auditorium",
  "Corridor",
  "Staircase",
  "Elevator",
  "Playground",
  "Parking Area",
  "Main Gate",
  "Student Lounge",
  "Other",
];

export const locationCoordinates: Record<string, { x: number; y: number; label: string }> = {
  "Academic Building": { x: 45, y: 30, label: "Block A - Main Academic Bldg" },
  "Library": { x: 75, y: 25, label: "EWU Central Library (2nd & 3rd Floor)" },
  "Cafeteria": { x: 30, y: 65, label: "Student Cafeteria & Food Court" },
  "Auditorium": { x: 60, y: 70, label: "East West Auditorium" },
  "Main Gate": { x: 15, y: 80, label: "Main Gate & EWU Security Office" },
  "Student Lounge": { x: 80, y: 60, label: "Student Recreation & Lounge" },
  "Playground": { x: 50, y: 85, label: "Campus Sports Field / Playground" },
  "Parking Area": { x: 85, y: 80, label: "Vehicle & Bike Parking Lot" },
  "Corridor": { x: 40, y: 48, label: "Central Ground Floor Corridor" },
  "Classroom": { x: 55, y: 40, label: "Building B - Classrooms" },
  "Staircase": { x: 65, y: 45, label: "North Stairwell" },
  "Elevator": { x: 48, y: 52, label: "Central Elevators" },
  "Other": { x: 50, y: 50, label: "EWU Campus Premises" },
};

export const currentUser = {
  id: "student-a",
  name: "Nafis Rahman",
  email: "nafis.rahman@ewu.edu.bd",
  identifier: "2022-3-60-041",
  initials: "NR",
};

const seedReports: Report[] = [
  { id: "LOST-2026-00482", type: "lost", title: "Black Samsung phone", category: "Mobile Phone", brand: "Samsung", color: "Black", description: "Samsung Galaxy phone with a slim black case. I last remember using it while studying.", location: "Library", specificLocation: "Second floor study tables", date: "Sep 20, 2026", time: "2:00 PM", status: "Possible Match", createdBy: "student-a", createdByName: "Nafis Rahman", icon: "phone", accent: "coral", features: "Transparent case with a small blue sticker; navy wallpaper.", pinCoordinates: { x: 75, y: 25 } },
  { id: "FOUND-2026-00291", type: "found", title: "Black Samsung smartphone", category: "Mobile Phone", brand: "Samsung", color: "Black", description: "A black Samsung phone was found on a library desk. Sensitive details are hidden until verified.", location: "Library", specificLocation: "Second floor study tables", date: "Sep 20, 2026", time: "2:20 PM", status: "At Security", createdBy: "student-b", createdByName: "Sadia Karim", custodyStatus: "EWU Security Office", icon: "phone", accent: "mint", features: "Blue sticker on the lower-right corner; a navy wallpaper.", pinCoordinates: { x: 74, y: 27 } },
  { id: "LOST-2026-00479", type: "lost", title: "Blue canvas backpack", category: "Bag", brand: "North Star", color: "Blue", description: "Medium blue backpack with a stitched campus patch and two main compartments.", location: "Cafeteria", specificLocation: "Near the window seats", date: "Sep 21, 2026", time: "12:40 PM", status: "Lost", createdBy: "student-c", createdByName: "Tanjim Ahmed", icon: "bag", accent: "coral", features: "Small yellow keychain inside the front pocket.", pinCoordinates: { x: 30, y: 65 } },
  { id: "FOUND-2026-00288", type: "found", title: "Blue backpack", category: "Bag", brand: "North Star", color: "Blue", description: "Blue backpack found near the cafeteria window seats.", location: "Cafeteria", date: "Sep 21, 2026", time: "1:05 PM", status: "Found", createdBy: "student-d", createdByName: "Rafi Hossain", custodyStatus: "Finder currently has it", icon: "bag", accent: "mint", features: "A small yellow keychain is hidden from public view.", pinCoordinates: { x: 32, y: 66 } },
  { id: "LOST-2026-00476", type: "lost", title: "Student ID card", category: "ID Card", brand: "EWU", color: "White / blue", description: "EWU student ID card in a transparent sleeve. Secure verification required.", location: "Academic Building", specificLocation: "Outside Room 402", date: "Sep 22, 2026", time: "9:15 AM", status: "Lost", createdBy: "student-e", createdByName: "Maliha Chowdhury", sensitive: true, icon: "id", accent: "coral", pinCoordinates: { x: 45, y: 30 } },
  { id: "FOUND-2026-00284", type: "found", title: "Wireless earbuds", category: "Earbuds", brand: "Apple", color: "White", description: "White wireless earbuds in a compact charging case.", location: "Auditorium", date: "Sep 22, 2026", time: "4:30 PM", status: "Found", createdBy: "student-f", createdByName: "Farhan Kabir", custodyStatus: "EWU Security Office", icon: "buds", accent: "mint", pinCoordinates: { x: 60, y: 70 } },
  { id: "LOST-2026-00473", type: "lost", title: "Scientific calculator", category: "Other", brand: "Casio", color: "Black", description: "Casio scientific calculator with a handwritten initials mark on the inside battery cover.", location: "Classroom", specificLocation: "Room 504", date: "Sep 18, 2026", time: "11:10 AM", status: "Lost", createdBy: "student-g", createdByName: "Siam Hasan", icon: "calc", accent: "coral", features: "Initials S.H. inside the battery cover.", pinCoordinates: { x: 55, y: 40 } },
  { id: "FOUND-2026-00280", type: "found", title: "Brown leather wallet", category: "Wallet", brand: "Local", color: "Brown", description: "Brown leather wallet found near the main gate. Card details are not displayed.", location: "Main Gate", date: "Sep 19, 2026", time: "5:10 PM", status: "Ready for Pickup", createdBy: "security", createdByName: "EWU Security", custodyStatus: "EWU Security Office", sensitive: true, icon: "wallet", accent: "mint", pinCoordinates: { x: 15, y: 80 } },
  { id: "LOST-2026-00470", type: "lost", title: "Laptop charger", category: "Accessories", brand: "Dell", color: "Black", description: "USB-C laptop charger with a long cable and compact adapter.", location: "Student Lounge", date: "Sep 17, 2026", time: "3:45 PM", status: "Lost", createdBy: "student-h", createdByName: "Ayman Sarker", icon: "charger", accent: "coral", pinCoordinates: { x: 80, y: 60 } },
  { id: "FOUND-2026-00274", type: "found", title: "Spiral notebook", category: "Books", brand: "Campus Notes", color: "Yellow", description: "Yellow spiral notebook with lecture notes inside.", location: "Academic Building", date: "Sep 16, 2026", time: "10:20 AM", status: "Returned", createdBy: "student-i", createdByName: "Mehedi Hasan", custodyStatus: "Returned to owner", icon: "book", accent: "mint", pinCoordinates: { x: 47, y: 32 } },
  { id: "LOST-2026-00462", type: "lost", title: "Silver watch", category: "Watch", brand: "Casio", color: "Silver", description: "Silver analog watch with a dark face and metal strap.", location: "Playground", date: "Sep 15, 2026", time: "6:00 PM", status: "Lost", createdBy: "student-j", createdByName: "Raisa Ahmed", icon: "watch", accent: "coral", pinCoordinates: { x: 50, y: 85 } },
  { id: "FOUND-2026-00269", type: "found", title: "Set of keys", category: "Keys", brand: "—", color: "Silver", description: "Three silver keys on a navy fabric loop.", location: "Parking Area", date: "Sep 14, 2026", time: "8:45 AM", status: "Found", createdBy: "student-k", createdByName: "Sohana Islam", custodyStatus: "EWU Security Office", icon: "keys", accent: "mint", pinCoordinates: { x: 85, y: 80 } },
  { id: "FOUND-2026-00265", type: "found", title: "Black laptop sleeve", category: "Accessories", brand: "HP", color: "Black", description: "Protective laptop sleeve found in the corridor.", location: "Corridor", date: "Sep 13, 2026", time: "2:10 PM", status: "Returned", createdBy: "student-l", createdByName: "Arif Chowdhury", custodyStatus: "Returned to owner", icon: "laptop", accent: "mint", pinCoordinates: { x: 40, y: 48 } },
];

const seedNotifications: AppNotification[] = [
  { id: "n1", title: "Possible match found", body: "Your lost black Samsung phone may have been found near Library.", tone: "blue", read: false, createdAt: "8 min ago" },
  { id: "n2", title: "Security update", body: "Your matched phone is now held at the EWU Security Office.", tone: "orange", read: false, createdAt: "24 min ago" },
  { id: "n3", title: "A safer way to recover", body: "Remember: item details stay private until ownership is verified.", tone: "green", read: true, createdAt: "Yesterday" },
];

const seedThreads: ChatThread[] = [
  {
    id: "thread-1",
    reportId: "FOUND-2026-00291",
    reportTitle: "Black Samsung smartphone",
    otherPartyName: "Sadia Karim (Finder)",
    otherPartyRole: "finder",
    lastMessage: "I handed the phone over to EWU Security Office at Main Gate.",
    updatedAt: "10 mins ago",
    unread: true,
  },
  {
    id: "thread-2",
    reportId: "FOUND-2026-00280",
    reportTitle: "Brown leather wallet",
    otherPartyName: "Officer Kabir (EWU Security)",
    otherPartyRole: "security",
    lastMessage: "Please bring your Student ID card when coming to collect.",
    updatedAt: "1 hour ago",
    unread: false,
  },
];

const seedMessages: Record<string, ChatMessage[]> = {
  "thread-1": [
    { id: "m1", threadId: "thread-1", senderId: "student-b", senderName: "Sadia Karim", senderRole: "finder", text: "Hello! Is this your Samsung phone with the blue sticker?", createdAt: "25 mins ago" },
    { id: "m2", threadId: "thread-1", senderId: "student-a", senderName: "Nafis Rahman", senderRole: "student", text: "Hi Sadia! Yes, that is mine! I lost it on the library 2nd floor desk.", createdAt: "20 mins ago" },
    { id: "m3", threadId: "thread-1", senderId: "student-b", senderName: "Sadia Karim", senderRole: "finder", text: "I handed the phone over to EWU Security Office at Main Gate. You can claim it there safely!", createdAt: "10 mins ago" },
  ],
  "thread-2": [
    { id: "m4", threadId: "thread-2", senderId: "security", senderName: "Officer Kabir", senderRole: "security", text: "Hello Nafis. Your claim for the brown leather wallet has been verified.", createdAt: "2 hours ago" },
    { id: "m5", threadId: "thread-2", senderId: "security", senderName: "Officer Kabir", senderRole: "security", text: "Please bring your Student ID card when coming to collect.", createdAt: "1 hour ago" },
  ],
};

export const seedLockers: LockerHub[] = [
  { id: "box-1", name: "Main Gate Locker #01", building: "Main Gate Security Desk", availableLockers: 4, totalLockers: 8, code: "FB-101", status: "active" },
  { id: "box-2", name: "Library Lobby Locker #03", building: "EWU Central Library 1st Floor", availableLockers: 2, totalLockers: 6, code: "FB-204", status: "active" },
  { id: "box-3", name: "Cafeteria DropBox #02", building: "Student Cafeteria Block B", availableLockers: 5, totalLockers: 8, code: "FB-302", status: "active" },
];

export function freshState(): AppState {
  return {
    reports: seedReports.map((r) => ({ ...r })),
    claims: [
      {
        id: "claim-seed-1",
        reportId: "FOUND-2026-00291",
        claimantId: currentUser.id,
        claimantName: currentUser.name,
        status: "Verification Required",
        submittedAt: "Today, 1:30 PM",
        answers: "Slim black case with a small navy wallpaper and blue sticker on lower corner.",
        claimPin: "849201",
        pickupSlot: "Today 3:30 PM - 5:00 PM",
        securityDesk: "Main Gate Security Desk, Desk #02",
      }
    ],
    notifications: seedNotifications.map((n) => ({ ...n })),
    chatThreads: seedThreads.map((t) => ({ ...t })),
    chatMessages: JSON.parse(JSON.stringify(seedMessages)),
    role: "student",
    lostMode: false,
    lockers: seedLockers.map((l) => ({ ...l })),
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return freshState();
  try {
    const stored = window.localStorage.getItem("ewu-loop-state-v2");
    if (stored) return JSON.parse(stored) as AppState;
  } catch {
    // Demo mode fallback
  }
  return freshState();
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("ewu-loop-state-v2", JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function scoreMatch(lost: Report, found: Report) {
  if (lost.type !== "lost" || found.type !== "found") return { score: 0, reasons: [] as string[] };
  let score = 0;
  const reasons: string[] = [];
  if (lost.category === found.category) { score += 25; reasons.push("Same category"); }
  if (lost.brand && found.brand && lost.brand.toLowerCase() === found.brand.toLowerCase()) { score += 20; reasons.push("Same brand"); }
  if (lost.color && found.color && lost.color.toLowerCase() === found.color.toLowerCase()) { score += 15; reasons.push("Same color"); }
  if (lost.location === found.location) { score += 20; reasons.push("Same location"); }
  if (lost.date === found.date) { score += 10; reasons.push("Same date"); }
  if (lost.time && found.time && Math.abs(parseInt(lost.time) - parseInt(found.time)) <= 1) { score += 10; reasons.push("Similar time"); }
  return { score: Math.min(score, 100), reasons };
}

export function getMatches(report: Report, reports: Report[]) {
  const base = report.type === "lost" ? reports.filter((r) => r.type === "found") : reports.filter((r) => r.type === "lost");
  return base.map((candidate) => ({ report: candidate, ...scoreMatch(report.type === "lost" ? report : candidate, report.type === "lost" ? candidate : report) })).filter((match) => match.score >= 50).sort((a, b) => b.score - a.score);
}

export function newId(type: ReportType) {
  const year = new Date().getFullYear();
  const prefix = type === "lost" ? "LOST" : "FOUND";
  return `${prefix}-${year}-${String(Math.floor(10000 + Math.random() * 89999))}`;
}

export function itemEmoji(icon: string) {
  const map: Record<string, string> = { phone: "▣", bag: "▰", id: "▤", buds: "◉", calc: "▦", wallet: "▰", charger: "⌁", book: "▤", watch: "◷", keys: "⌕", laptop: "▣" };
  return map[icon] ?? "✦";
}

export function statusTone(status: ReportStatus) {
  if (["Returned", "Verified", "Ready for Pickup"].includes(status)) return "success";
  if (["Lost", "Claim Submitted", "Verification Required"].includes(status)) return "warning";
  if (["At Security", "Found", "Possible Match"].includes(status)) return "info";
  return "neutral";
}
