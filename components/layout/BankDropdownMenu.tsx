import Link from "next/link";

const bankItems = [
  {
    title: "国考面试",
    description: "覆盖国家公务员、税务、海关、边检、公安、中央机关等结构化面试真题",
    href: "/banks/national-civil-service",
  },
  {
    title: "省考面试",
    description: "覆盖各省公务员、省直、市直、县区、选调生等面试真题",
    href: "/banks/provincial-civil-service",
  },
  {
    title: "事业编面试",
    description: "覆盖事业单位、教师、医疗、社工、高校辅导员等岗位面试真题",
    href: "/banks/public-institution",
  },
  {
    title: "国企央企银行面试",
    description: "覆盖国企、央企、银行、农商行、国家电网、电力系统等面试真题",
    href: "/banks/state-owned-enterprise",
  },
  {
    title: "私企民企面试",
    description: "覆盖互联网、电商、运营、销售、客服、产品、技术、财务、人事等企业招聘场景",
    href: "/banks/private-company",
  },
] as const;

export default function BankDropdownMenu() {
  return (
    <div className="invisible absolute left-1/2 top-full z-50 mt-3 w-[min(92vw,620px)] -translate-x-1/2 rounded-2xl border border-cyan-300/20 bg-slate-950/95 p-3 opacity-0 shadow-2xl backdrop-blur-xl transition duration-200 group-hover:visible group-hover:opacity-100">
      <div className="grid gap-2 sm:grid-cols-2">
        {bankItems.map((bank, idx) => (
          <Link
            key={bank.href}
            href={bank.href}
            className={`rounded-xl border border-transparent p-3 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 ${
              idx === bankItems.length - 1 ? "sm:col-span-2" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-cyan-100">{bank.title}</h3>
              <span aria-hidden className="text-cyan-300">→</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-300">{bank.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
