import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade';
import { Button, Card, CardContent, Paper, Typography } from '@mui/material'
import Grid from '@mui/material/Grid';
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/exams/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade();

  return <div>
    <Typography variant="h1" component="h2">
      Exams
    </Typography>


    <div className='p-4'>
      <Grid container spacing={2}>
        {examBoards?.map((examBoard) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={examBoard.id}>
            <Link to="/exams/$examBoard" params={{ examBoard: examBoard.id }}>
            <div className='w-full h-40'>
         <Button sx={{ height: '100%' }}>
                <Paper sx={{ height: '100%' }}>
                  <img src={examBoard.logoUrl} alt={examBoard.name} className="w-full h-full object-contain" />
                  <Typography variant="body1">{examBoard.name}</Typography>
                </Paper>
              </Button>
            </div>
            </Link>
          </Grid>
        ))}
      </Grid>
    </div>
  </div>
}