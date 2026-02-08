export const PageHeader = ({ title }: { title: string }) => {
    return (
        <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">{title}</h1>
        </div>
    )
}