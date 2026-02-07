export const Card = ({ children, className, noElevation = false }: { children: React.ReactNode, className?: string, noElevation?: boolean }) => {
    const elevationClasses = noElevation ? '' : 'hover:shadow-sm hover:bg-slate-100 active:shadow-none'
    return (
        <div className={`
        border border-solid border-slate-300
        ${noElevation ? '' : 'shadow-md'}
        rounded-lg
        transition-all ease-in-out duration-200
        p-2
        ${noElevation ? '' : 'hover:shadow-sm'}
        ${elevationClasses}
        ${className ?? ''}`
        }>
            {children}
        </div>
    )
}