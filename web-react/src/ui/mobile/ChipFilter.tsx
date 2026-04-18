interface ChipFilterOption<T extends string> {
  label: string
  value: T
}

interface ChipFilterProps<T extends string> {
  options: Array<ChipFilterOption<T>>
  value: T
  onChange: (value: T) => void
}

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
}: ChipFilterProps<T>) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2 pb-1">
        {options.map((option) => {
          const isActive = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-cyan-600 bg-cyan-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
