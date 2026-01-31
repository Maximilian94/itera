import { Button, Paper, Tab, Tabs } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useState } from 'react';
import { CustomTabPanel } from '@/ui/customTabPanel';

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoard, examId } = Route.useParams()
  const [value, setValue] = useState(0)

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  return (
    <div className="p-4">
      <Paper>
      <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
      <Tab label="Detalhes" value={0} />
    <Tab label="Tentativas" value={1} />
    <Tab label="Estatísticas" value={2} />
  </Tabs>
  <CustomTabPanel value={value} hidden={value !== 0}>
        Detalhes da prova
      </CustomTabPanel>

      <CustomTabPanel value={value} hidden={value !== 1}>
        Suas tentativas
      </CustomTabPanel>

      <CustomTabPanel value={value} hidden={value !== 2}>
        Estatísticas
      </CustomTabPanel>
        <Link to="/exams/$examBoard/$examId/$attemptId" params={{ examBoard: examBoard, examId: examId, attemptId: '1' }}>
          <Button variant="contained" color="primary" startIcon={<PlayArrowIcon />}>Iniciar prova</Button>
        </Link>
      </Paper>
    </div>
  )
}
