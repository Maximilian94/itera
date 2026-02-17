import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import SchoolIcon from '@mui/icons-material/School'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import type { RegisteredRouter, ToPathOption } from '@tanstack/react-router'
import type React from 'react'
import { Route as DashboardRoute } from '@/routes/_authenticated/dashboard'
import { Route as ExamsRoute } from '@/routes/_authenticated/exams'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HistoryIcon from '@mui/icons-material/History'
import StorageIcon from '@mui/icons-material/Storage'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import { Route as HistoryRoute } from '@/routes/_authenticated/history'
import { Route as DatabaseRoute } from '@/routes/_authenticated/database'
import { Route as ExamBoardsRoute } from '@/routes/_authenticated/exam-boards'
import LogoutIcon from '@mui/icons-material/Logout'
import { useClerk } from '@clerk/clerk-react'

interface NavItem {
  label: string
  href: ToPathOption<RegisteredRouter>
  icon: React.ElementType;
}

export const SideBar = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const { signOut } = useClerk()

  const pages: Array<NavItem> = [
    {
      label: 'Dashboard',
      href: DashboardRoute.to,
      icon: DashboardIcon,
    },
    {
      label: 'Exams',
      href: ExamsRoute.to,
      icon: SchoolIcon,
    },
    {
      label: 'History',
      href: HistoryRoute.to,
      icon: HistoryIcon,
    },
    {
      label: 'Questions Database',
      href: DatabaseRoute.to,
      icon: StorageIcon,
    },
    {
      label: 'Exam Boards',
      href: ExamBoardsRoute.to,
      icon: AccountBalanceIcon,
    },
  ]

  async function logout() {
    await signOut()
    await navigate({ to: '/' })
  }

  return (
    <div className="group flex flex-col gap-2 h-full text-slate-50 bg-slate-800">
      <nav aria-label="main mailbox folders">
        <List>
          {pages.map((page) => (
            <Link to={page.href} key={page.label}>
              <ListItem disablePadding>
                <ListItemButton selected={pathname === page.href}>
                  <div className="flex gap-2 items-center">
                    <page.icon />
                    <ListItemText primary={page.label} className="
                  max-w-0 overflow-hidden whitespace-nowrap opacity-0
                  group-hover:max-w-[200px] group-hover:opacity-100
                  transition-[max-width,opacity] duration-300 ease-in-out
                " />
                  </div>
                </ListItemButton>
              </ListItem>
            </Link>
          ))}
          {/* <Link to="/dashboard">
            <ListItem disablePadding>
              <ListItemButton>
                <div className="flex gap-2 items-center">
                  <SchoolIcon></SchoolIcon>
                  <ListItemText
                    primary="Inbox"
                    className="
                  max-w-0 overflow-hidden whitespace-nowrap opacity-0
                  group-hover:max-w-[200px] group-hover:opacity-100
                  transition-[max-width,opacity] duration-300 ease-in-out
                "
                  />
                </div>
              </ListItemButton>
            </ListItem>
          </Link> */}
        </List>
      </nav>

      <div className="mt-auto border-t border-slate-700">
        <List>
          <ListItem disablePadding>
            <ListItemButton onClick={logout}>
              <div className="flex gap-2 items-center">
                <LogoutIcon />
                <ListItemText
                  primary="Logout"
                  className="
                    max-w-0 overflow-hidden whitespace-nowrap opacity-0
                    group-hover:max-w-[200px] group-hover:opacity-100
                    transition-[max-width,opacity] duration-300 ease-in-out
                  "
                />
              </div>
            </ListItemButton>
          </ListItem>
        </List>
      </div>
    </div>
  )
}