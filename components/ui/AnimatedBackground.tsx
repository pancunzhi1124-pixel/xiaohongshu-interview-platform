export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.2),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.18),transparent_40%)]" />
      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/10" />
    </div>
  );
}
