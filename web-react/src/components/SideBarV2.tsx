import { useClerkAuth } from '@/auth/clerk'
import { Route as DashboardRoute } from '@/routes/_authenticated/dashboard'
import { Route as ExamsRoute } from '@/routes/_authenticated/exams'
import { Route as TreinoRoute } from '@/routes/_authenticated/treino'
import { Route as HistoryRoute } from '@/routes/_authenticated/history'
import { Route as AccountRoute } from '@/routes/_authenticated/account'
import { Route as DatabaseRoute } from '@/routes/_authenticated/database'
import { Route as ExamBoardsRoute } from '@/routes/_authenticated/exam-boards'
import { Route as ExamBasesRoute } from '@/routes/_authenticated/exam-bases'
import { HomeIcon, DocumentTextIcon, AcademicCapIcon, ClockIcon, UserCircleIcon, PlusCircleIcon } from '@heroicons/react/24/solid'
import { HomeIcon as HomeIconOutline, DocumentTextIcon as DocumentTextIconOutline, AcademicCapIcon as AcademicCapIconOutline, ClockIcon as ClockIconOutline, UserCircleIcon as UserCircleIconOutline, ArrowRightOnRectangleIcon, PlusCircleIcon as PlusCircleIconOutline } from '@heroicons/react/24/outline'
import { Link, useMatchRoute, type RegisteredRouter, type ToPathOption } from '@tanstack/react-router'

export const SideBarV2 = () => {
    const { logout } = useClerkAuth()
    const pages: Array<{ label: string, href: string, icon: React.ElementType, activeIcon: React.ElementType, fuzzy?: boolean }> = [
        {
            label: 'Home',
            href: DashboardRoute.to,
            icon: HomeIconOutline,
            activeIcon: HomeIcon,
        },
        {
            label: 'Exams',
            href: ExamsRoute.to,
            icon: DocumentTextIconOutline,
            activeIcon: DocumentTextIcon,
            fuzzy: true,
        },
        {
            label: 'Criar exame',
            href: ExamBasesRoute.to,
            icon: PlusCircleIconOutline,
            activeIcon: PlusCircleIcon,
        },
        {
            label: 'Treino',
            href: TreinoRoute.to,
            icon: AcademicCapIconOutline,
            activeIcon: AcademicCapIcon,
            fuzzy: true,
        },
        {
            label: 'History',
            href: HistoryRoute.to,
            icon: ClockIconOutline,
            activeIcon: ClockIcon,
        },
        {
            label: 'Account',
            href: AccountRoute.to,
            icon: UserCircleIconOutline,
            activeIcon: UserCircleIcon,
        },
        // {
        //     label: 'Questions Database',
        //     href: DatabaseRoute.to,
        //     icon: HomeIconOutline,
        //     activeIcon: HomeIcon,
        // },
        // {
        //     label: 'Exam Boards',
        //     href: ExamBoardsRoute.to,
        //     icon: HomeIconOutline,
        //     activeIcon: HomeIcon,
        // },
        // {
        //     label: 'Exam Base',
        //     href: ExamBasesRoute.to,
        //     icon: HomeIconOutline,
        //     activeIcon: HomeIcon,
        // },
    ]

    return (
        <div className="h-full">
            <div
                className={'w-13 bg-linear-to-b from-blue-600 to-blue-900 h-full rounded-lg flex flex-col items-center justify-between py-2 gap-2'}
            >
                <div className='flex flex-col items-center justify-center gap-2'>
                    {pages.map((page) => (
                        <NavItem key={page.label} href={page.href} icon={page.icon} activeIcon={page.activeIcon} label={page.label} fuzzy={page.fuzzy} />
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => logout()}
                    className="flex flex-col items-center justify-center gap-0.5 cursor-pointer border-0 p-0 text-left w-full min-w-0"
                    aria-label="Sair"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all ease-in-out duration-200 bg-inherit text-white hover:bg-white/10">
                        <ArrowRightOnRectangleIcon className="size-5" strokeWidth={1.5} />
                    </div>
                    <div className="text-[10px] text-white flex items-center justify-center font-bold">
                        <span className="text-wrap text-center">Logout</span>
                    </div>
                </button>
            </div>
        </div>
    )
}

const NavItem = ({ href, icon: Icon, activeIcon: ActiveIcon, label, fuzzy }: { href: string, icon: React.ElementType, activeIcon: React.ElementType, label: string, fuzzy?: boolean }) => {
    const matchRoute = useMatchRoute()
    const isActive = matchRoute({ to: href as ToPathOption<RegisteredRouter>, fuzzy: fuzzy ?? false })
    return (
        <Link to={href}>
            <div className="cursor-pointer flex flex-col items-center justify-center gap-0.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ease-in-out duration-200 ${isActive ? 'bg-white text-blue-600' : 'bg-inherit text-white hover:bg-white/10'}`}>
                    {isActive ? <ActiveIcon className='size-4' strokeWidth={2} /> : <Icon className='size-5' strokeWidth={1.5} />}
                </div>
                <div className='text-[10px] text-white flex items-center justify-center font-bold'>
                    <span className='text-wrap text-center'>
                        {label}
                    </span>
                </div>
            </div>
        </Link>
    )
}