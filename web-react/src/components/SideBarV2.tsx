import { useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useClerkAuth } from '@/auth/clerk'
import { Route as DashboardRoute } from '@/routes/_authenticated/dashboard'
import { Route as ExamsRoute } from '@/routes/_authenticated/exams'
import { Route as TreinoRoute } from '@/routes/_authenticated/treino'
import { Route as HistoryRoute } from '@/routes/_authenticated/history'
import { Route as AccountRoute } from '@/routes/_authenticated/account'
import { Route as ExamBoardsRoute } from '@/routes/_authenticated/exam-boards'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { HomeIcon, DocumentTextIcon, AcademicCapIcon, ClockIcon, BuildingLibraryIcon } from '@heroicons/react/24/solid'
import { HomeIcon as HomeIconOutline, DocumentTextIcon as DocumentTextIconOutline, AcademicCapIcon as AcademicCapIconOutline, ClockIcon as ClockIconOutline, BuildingLibraryIcon as BuildingLibraryIconOutline, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { Link, useMatchRoute, useNavigate, type RegisteredRouter, type ToPathOption } from '@tanstack/react-router'
import { Menu, MenuItem } from '@mui/material'

const PLAN_NAMES: Record<string, string> = {
    ESSENCIAL: 'Essencial',
    ESTRATEGICO: 'Estratégico',
    ELITE: 'Elite',
}

function getInitials(firstName: string | null, lastName: string | null): string {
    const first = (firstName ?? '').trim()
    const last = (lastName ?? '').trim()
    if (first && last) return (first[0] + last[0]).toUpperCase()
    if (first) return first.slice(0, 2).toUpperCase()
    return '?'
}

export const SideBarV2 = () => {
    const { user } = useUser()
    const { logout } = useClerkAuth()
    const { access } = useAccessState()
    const navigate = useNavigate()
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const avatarRef = useRef<HTMLButtonElement>(null)

    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuário'
    const planLabel = access.status !== 'inactive' && access.plan
        ? `Plano ${PLAN_NAMES[access.plan] ?? access.plan}`
        : 'Plano Sem assinatura'

    const handleAvatarClick = () => setAnchorEl(avatarRef.current)
    const handleClose = () => setAnchorEl(null)

    const handleConfig = () => {
        handleClose()
        navigate({ to: AccountRoute.to, search: { tab: 'perfil' as const, access: undefined } })
    }

    const handleLogout = () => {
        handleClose()
        logout()
    }
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
            label: 'Bancas',
            href: ExamBoardsRoute.to,
            icon: BuildingLibraryIconOutline,
            activeIcon: BuildingLibraryIcon,
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

                <div className="flex flex-col items-center justify-center gap-0.5">
                    <button
                        ref={avatarRef}
                        type="button"
                        onClick={handleAvatarClick}
                        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/30 hover:border-white/60 transition-all cursor-pointer bg-white/10 shrink-0"
                        aria-label="Menu do usuário"
                    >
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt={displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-white text-sm font-bold">
                                {getInitials(user?.firstName ?? null, user?.lastName ?? null)}
                            </span>
                        )}
                    </button>
                    <span className="text-[10px] text-white font-bold text-center">Perfil</span>
                </div>

                <Menu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                        paper: {
                            sx: { mt: 1.5, minWidth: 200, py: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
                        },
                    }}
                    MenuListProps={{ sx: { py: 0 } }}
                >
                    <div className="px-3 py-2.5">
                        <p className="text-sm font-medium text-slate-800 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{planLabel}</p>
                    
                    </div>
                    <hr className="border-slate-200" />
                    <MenuItem onClick={handleConfig} sx={{ gap: 1.5, py: 1.5, fontSize: '0.875rem' }}>
                        <Cog6ToothIcon className="size-4 text-slate-500 shrink-0" />
                        Configurações
                    </MenuItem>
                    <MenuItem onClick={handleLogout} sx={{ gap: 1.5, py: 1.5, fontSize: '0.875rem', color: 'error.main' }}>
                        <ArrowRightOnRectangleIcon className="size-4 shrink-0" />
                        Sair
                    </MenuItem>
                </Menu>
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