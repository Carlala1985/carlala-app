import type { BookingStatus } from "@prisma/client";
import type { Dict } from "@/lib/i18n/en";

const tone: Record<BookingStatus, string> = {
  REQUESTED: "bg-lilac text-ink", ACCEPTED: "bg-peach text-ink", PAID: "bg-[#e3f4ea] text-ok", COMPLETED: "bg-[#e9e6ef] text-muted",
  DECLINED: "bg-[#fde8e6] text-err", CANCELLED: "bg-[#fde8e6] text-err", EXPIRED: "bg-[#e9e6ef] text-muted",
};

export function StatusPill({ status, t }: { status: BookingStatus; t: Dict }) {
  return <span className={`pill ${tone[status]}`}>{t.status[status]}</span>;
}
