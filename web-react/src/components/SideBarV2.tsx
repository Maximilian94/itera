import { useRef, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { DocumentMagnifyingGlassIcon, DocumentTextIcon, HomeIcon, MagnifyingGlassCircleIcon, RectangleStackIcon, UsersIcon } from '@heroicons/react/24/solid'
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconOutline, DocumentTextIcon as DocumentTextIconOutline, HomeIcon as HomeIconOutline, MagnifyingGlassCircleIcon as MagnifyingGlassCircleIconOutline, RectangleStackIcon as RectangleStackIconOutline, UsersIcon as UsersIconOutline } from '@heroicons/react/24/outline'
import { Link, useMatchRoute, useNavigate } from '@tanstack/react-router'
import { Menu, MenuItem } from '@mui/material'
import { useClerkAuth } from '@/auth/clerk'
import { Route as DashboardRoute } from '@/routes/_authenticated/dashboard'
import { Route as ConcursosRoute } from '@/routes/_authenticated/concursos/index'
import { Route as AccountRoute } from '@/routes/_authenticated/account'
import { Route as AdminUsersRoute } from '@/routes/_authenticated/admin/users'
import { Route as AdminPciScraperRoute } from '@/routes/_authenticated/admin/pci-scraper'
import { Route as AdminDocumentScraperRoute } from '@/routes/_authenticated/admin/document-scraper'
import { Route as AdminGerenciarConcursosRoute } from '@/routes/_authenticated/admin/gerenciar-concursos'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { authService } from '@/features/auth/services/auth.service'

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
    const { data: profileData } = useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: () => authService.getProfile(),
    })
    const isAdmin = profileData?.user?.role === 'ADMIN'

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
    const pages: Array<{ label: string, href: string, icon: React.ElementType, activeIcon: React.ElementType, fuzzy?: boolean, alsoMatch?: Array<string> }> = [
        {
            label: 'Home',
            href: DashboardRoute.to,
            icon: HomeIconOutline,
            activeIcon: HomeIcon,
        },
        {
            label: 'Concursos',
            href: ConcursosRoute.to,
            icon: DocumentTextIconOutline,
            activeIcon: DocumentTextIcon,
            fuzzy: true,
            // Concursos é a porta de entrada (MAX-28); /exams vira a camada de
            // provas/admin e mantém este item ativo.
            alsoMatch: ['/exams'],
        },
        // Navegação enxuta: tudo parte de Concursos — o treino vive embutido
        // na página do cargo ("Bancas"/"Meus treinos"/"History" removidos).
    ]

    const adminPages: typeof pages = [
        {
            label: 'Concursos',
            href: AdminGerenciarConcursosRoute.to,
            icon: RectangleStackIconOutline,
            activeIcon: RectangleStackIcon,
        },
        {
            label: 'Usuários',
            href: AdminUsersRoute.to,
            icon: UsersIconOutline,
            activeIcon: UsersIcon,
        },
        {
            label: 'PCI Scraper',
            href: AdminPciScraperRoute.to,
            icon: MagnifyingGlassCircleIconOutline,
            activeIcon: MagnifyingGlassCircleIcon,
        },
        {
            label: 'Documentos',
            href: AdminDocumentScraperRoute.to,
            icon: DocumentMagnifyingGlassIconOutline,
            activeIcon: DocumentMagnifyingGlassIcon,
        },
    ]

    return (
        <div className="hidden h-full md:block">
            <div
                className={'w-[74px] bg-white border border-slate-200 shadow-sm h-full rounded-xl flex flex-col items-center justify-between py-2.5 gap-2'}
            >
                <div className='flex flex-col items-center justify-center gap-1.5'>
                    <img src="/logo.svg" alt="Maximize Enfermagem" className="w-8 h-8 mb-1 shrink-0" />
                    {pages.map((page) => (
                        <NavItem key={page.label} href={page.href} icon={page.icon} activeIcon={page.activeIcon} label={page.label} fuzzy={page.fuzzy} alsoMatch={page.alsoMatch} />
                    ))}
                    {isAdmin && (
                        <>
                            <div className="w-8 h-px bg-slate-200 my-1" />
                            {adminPages.map((page) => (
                                <NavItem key={page.label} href={page.href} icon={page.icon} activeIcon={page.activeIcon} label={page.label} fuzzy={page.fuzzy} />
                            ))}
                        </>
                    )}
                </div>

                <div className="flex flex-col items-center justify-center gap-1">
                    <button
                        ref={avatarRef}
                        type="button"
                        onClick={handleAvatarClick}
                        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-slate-200 hover:border-cyan-400 transition-all cursor-pointer bg-cyan-600 shrink-0"
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
                    <span className="text-[10px] text-slate-500 font-semibold text-center">Perfil</span>
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
                        <p className="text-sm font-medium text-sky-900 truncate">{displayName}</p>
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

const NavItem = ({ href, icon: Icon, activeIcon: ActiveIcon, label, fuzzy, alsoMatch }: { href: string, icon: React.ElementType, activeIcon: React.ElementType, label: string, fuzzy?: boolean, alsoMatch?: Array<string> }) => {
    const matchRoute = useMatchRoute()
    const isActive = Boolean(
        matchRoute({ to: href, fuzzy: fuzzy ?? false }) ||
        (alsoMatch ?? []).some((to) => matchRoute({ to, fuzzy: true })),
    )
    return (
        <Link to={href}>
            <div className={`cursor-pointer flex flex-col items-center justify-center gap-1 w-16 py-2 rounded-lg transition-colors ease-in-out duration-200 ${isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
                {isActive ? <ActiveIcon className='size-5' /> : <Icon className='size-5' strokeWidth={1.7} />}
                <span className='text-[10px] font-semibold text-center whitespace-nowrap leading-none'>
                    {label}
                </span>
            </div>
        </Link>
    )
}
