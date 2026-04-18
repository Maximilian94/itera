import type { ReactNode } from 'react'
import { Drawer } from '@mui/material'
import { PhoneSafeArea } from './PhoneSafeArea'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({
  open,
  onClose,
  children,
}: BottomSheetProps) {
  return (
    <Drawer anchor="bottom" open={open} onClose={onClose}>
      <PhoneSafeArea bottom className="rounded-t-3xl bg-white">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="max-h-[85dvh] overflow-auto px-4 pb-4 pt-3">
          {children}
        </div>
      </PhoneSafeArea>
    </Drawer>
  )
}
