export default function FloatingOrbs() {
  return (
    <>
      <div className="pointer-events-none absolute -left-20 top-10 h-64 w-64 animate-pulse rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-72 w-72 animate-pulse rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-1/3 h-80 w-80 animate-pulse rounded-full bg-purple-500/20 blur-3xl" />
    </>
  );
}
