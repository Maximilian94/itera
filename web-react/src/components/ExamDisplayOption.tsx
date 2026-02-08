type ExamDisplayOptionProps = {
  name: string
  description: string
  children?: React.ReactNode
}

export function ExamDisplayOption({ name, description, children }: ExamDisplayOptionProps) {
  return (
    <div className="flex items-center gap-4 border cursor-pointer border-solid border-slate-300 rounded-lg p-2 hover:bg-slate-100 transition-all ease-in-out duration-200 shadow-md w-64 h-full hover:shadow-sm active:shadow-none">
      {children}
      <div className="flex flex-col items-start justify-center">
        <span className="text-md font-medium">{name}</span>
        <span className="text-xs text-slate-500">{description}</span>
      </div>
    </div>
  )
}
