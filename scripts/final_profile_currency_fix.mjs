import fs from "node:fs";
const path = "client/src/pages/Home.tsx";
let s = fs.readFileSync(path, "utf8");
s = s.replaceAll("${listing.price} or", "{formatTaka(listing.price)} or");
s = s.replaceAll("Pay ${selectedListing.price}", "Pay {formatTaka(selectedListing.price)}");
s = s.replaceAll('currency: "USD"', 'currency: "BDT"');
fs.writeFileSync(path, s);
