// routes/_authenticated/dashboard.tsx
import { CreateExamDialog } from '@/components/CreateExamDialog'
import { Button } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const [open, setOpen] = useState(false)
  
  const handleSubmit = () => {
    setOpen(false)
  }

  return <div>Área logada
    <CreateExamDialog open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} />
    <Button variant="contained" color="primary" onClick={() => setOpen(true)}>Create Exam</Button>
  </div>
}
