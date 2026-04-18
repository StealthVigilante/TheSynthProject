import Link from "next/link";

const instruments = [
  {
    href: "/hardware/volca-keys",
    name: "Korg Volca Keys",
    tagline: "Analog loop synthesizer",
    year: "2013",
    desc: "3 VCOs, VCF, VCA, LFO, delay. 27 mini keys.",
  },
];

export default function HardwarePage() {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.4em", textTransform: "uppercase", marginBottom: 8 }}>
          Hardware Lab
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10 }}>
          Real-world synths.
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", maxWidth: 440 }}>
          Faithful front-end recreations of iconic hardware synthesizers — styled to your theme.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 1, border: "1px solid var(--border)" }}>
        {instruments.map((inst) => (
          <Link
            key={inst.href}
            href={inst.href}
            style={{
              display: "block", padding: "24px",
              background: "var(--card)",
              borderRight: "1px solid var(--border)",
              textDecoration: "none",
            }}
          >
            <div style={{ height: 2, width: 32, background: "var(--primary)", marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--foreground)", letterSpacing: "-0.02em", marginBottom: 4 }}>
              {inst.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              {inst.tagline} · {inst.year}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {inst.desc}
            </div>
            <div style={{ marginTop: 20, fontSize: 10, fontWeight: 700, color: "var(--primary)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
              Open →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
