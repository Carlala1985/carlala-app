import { describe, expect, it } from "vitest";
import { emails, type TripInfo } from "../src/lib/email/templates";

const info: TripInfo = { car: "Dacia Spring", when: "lun. 1 dec. 10:00 → 14:00", area: "Floreasca", total: "60 RON", earnings: "45 RON", other: "Radu", message: '<script>alert("x")</script> hi' };

describe("emails", () => {
  it("escapes anything a user typed", () => {
    const r = emails.newRequest("en", info, "https://app.carlala.eu/account/requests");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain("&lt;script&gt;");
  });
  it("is written in the recipient's language", () => {
    expect(emails.accepted("ro", info, "u").subject).toBe("Cererea ta pentru Dacia Spring a fost acceptată");
    expect(emails.accepted("en", info, "u").subject).toBe("Your request for the Dacia Spring was accepted");
  });
  it("puts the action link in both HTML and plain text", () => {
    const url = "https://app.carlala.eu/reset-password?token=abc";
    const r = emails.reset("ro", url);
    expect(r.html).toContain(`href="${url}"`);
    expect(r.text).toContain(url);
  });
  it("includes the owner's earnings in new-request emails", () => {
    expect(emails.newRequest("ro", info, "u").text).toContain("Câștigi: 45 RON");
  });
});
