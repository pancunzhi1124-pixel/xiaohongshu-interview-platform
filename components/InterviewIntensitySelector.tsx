"use client";

type InterviewIntensityOption = {
  label: string;
  subtitle: string;
  description: string;
  value: number;
  badge: string;
  badgeClassName: string;
};

const intensityOptions: InterviewIntensityOption[] = [
  {
    label: "快速模拟",
    subtitle: "适合 5-10 分钟快速练习",
    description: "随机抽取 3 题",
    value: 3,
    badge: "入门",
    badgeClassName: "border border-emerald-300/30 bg-emerald-400/20 text-emerald-200",
  },
  {
    label: "标准模拟",
    subtitle: "最接近常规求职模拟体验",
    description: "随机抽取 5 题",
    value: 5,
    badge: "推荐",
    badgeClassName: "border border-fuchsia-300/30 bg-fuchsia-400/20 text-fuchsia-200",
  },
  {
    label: "深度模拟",
    subtitle: "适合系统训练与深度复盘",
    description: "随机抽取 8 题",
    value: 8,
    badge: "进阶",
    badgeClassName: "border border-amber-300/30 bg-amber-400/20 text-amber-200",
  },
];

export default function InterviewIntensitySelector({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3">
      {intensityOptions.map((item) => {
        const selected = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(item.value)}
            className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left text-white shadow-lg backdrop-blur transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5 ${
              selected
                ? "scale-[1.01] border-cyan-300/60 bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-purple-500/20 ring-1 ring-cyan-300/40 shadow-[0_0_0_1px_rgba(34,211,238,0.35),0_20px_50px_rgba(59,130,246,0.18)]"
                : "border-white/10 bg-white/5 text-white hover:border-cyan-300/30 hover:bg-white/[0.08]"
            }`}
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.08),transparent_28%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-white sm:text-lg">{item.label}</h3>
                <p className="mt-1 text-sm text-slate-300">{item.subtitle}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.badgeClassName}`}>{item.badge}</span>
                <span
                  aria-hidden="true"
                  className={`grid h-5 w-5 place-items-center rounded-full transition duration-300 ${
                    selected
                      ? "border border-cyan-200/40 bg-cyan-300 shadow-[0_0_0_4px_rgba(34,211,238,0.12),0_0_18px_rgba(103,232,249,0.75)]"
                      : "border border-white/20 bg-white/5"
                  }`}
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-cyan-50 shadow-[0_0_10px_rgba(255,255,255,0.8)]" /> : null}
                </span>
              </div>
            </div>

            <div className="relative mt-4 flex items-end justify-between gap-3">
              <p className="text-sm font-medium text-cyan-200">{item.description}</p>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${selected ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"}`}>
                {item.value} 题
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
