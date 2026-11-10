import type { OrderMessage } from "@monologg/types";

export const ORDER_MESSAGES: OrderMessage[] = [
  { id: "1", from: "system", text: "Order Room created. Escrow of ₦120,000 is now locked securely.", time: "Dec 14, 9:00 AM" },
  { id: "2", from: "client", text: "Hi Emeka! Excited to work with you on this. I'm uploading the script now. Please review and let me know if you have any questions.", time: "Dec 14, 9:05 AM" },
  { id: "3", from: "client", text: "Brief attached.", time: "Dec 14, 9:06 AM", attachment: { name: "Nike_Campaign_Brief_v2.pdf", size: "1.2 MB", type: "file" } },
  { id: "4", from: "talent", text: "Perfect, thank you! I've reviewed the brief. The tone requirements are clear — I'll go for warm-authoritative to match the brand voice. I should have the first take ready within 24 hours.", time: "Dec 14, 10:30 AM" },
  { id: "5", from: "system", text: "Emeka Johnson has confirmed the brief. Phase advanced to Deliverables.", time: "Dec 14, 10:31 AM" },
];
