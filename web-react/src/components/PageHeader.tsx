export const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  return (
    <div>
      <h1 className="text-lg font-bold text-slate-900">{title}</h1>
      {subtitle != null && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
    </div>
  )
}