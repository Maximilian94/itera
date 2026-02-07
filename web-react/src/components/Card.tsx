export const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={`
        border border-solid border-slate-300
        shadow-md
        rounded-lg
        transition-all ease-in-out duration-200
        p-2
        hover:shadow-sm
        hover:bg-slate-100
        active:shadow-none
        ${className ?? ''}`
        }>
            {children}
        </div>
    )
}