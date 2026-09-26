import fs from "node:fs";
const path = "client/src/pages/Home.tsx";
let s = fs.readFileSync(path, "utf8");
s = s.replace('<strong>{formatTaka(listing.price)} · {listing.credits} cr</strong>', '<strong>{listing.mode === "swap" ? "Free exchange" : `${formatTaka(listing.price)} · ${listing.credits} cr`}</strong>');
s = s.replace('<button className="course-start" onClick={() => openCheckout(listing)}>', '<button className="course-start" onClick={() => listing.mode === "swap" ? requestSkillSwap(listing) : openCheckout(listing)}>');
fs.writeFileSync(path, s);
