import { Button, Grid, IconButton, Paper, Tab, Tabs, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import PushPinIcon from '@mui/icons-material/PushPin';
import VisibilityIcon from '@mui/icons-material/Visibility';
import React, { useState } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import InsightsIcon from '@mui/icons-material/Insights';
import ForumIcon from '@mui/icons-material/Forum';
import HistoryIcon from '@mui/icons-material/History';
import NoteIcon from '@mui/icons-material/Note';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import { CustomTabPanel } from '@/ui/customTabPanel';

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/',
)({
  component: RouteComponent,
})

const MOCK_OPTIONS = [
  {
    id: 1,
    label: 'A component should handle UI, data access, and global state to reduce files.',
    isEliminated: false,
  },

  {
    id: 2,
    label: 'Each component/service should have a focused responsibility.',
    isEliminated: false,
  },

  {
    id: 3,
    label: 'Services should contain UI rendering to centralize code.',
    isEliminated: false,
  },

  {
    id: 4,
    label: 'Templates should contain business rules to avoid TypeScript.',
    isEliminated: false,
  },
]

function RouteComponent() {
  const [value, setValue] = useState(0)
  const questionAlternativeArray = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];
  const [options, setOptions] = useState<Array<{ id: number, label: string, isEliminated: boolean }>>(MOCK_OPTIONS);
  const [optionSelected, setOptionSelected] = useState<number | null>(null);
  const questions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const [currentQuestion, setCurrentQuestion] = useState<number>(1);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const eliminateOption = (id: number, isEliminated: boolean) => {
    setOptions(options.map((option) => option.id === id ? { ...option, isEliminated } : option))
  }

  const handleOptionSelected = (id: number) => {
    if (optionSelected === id) {
      setOptionSelected(null)
    } else {
      setOptionSelected(id)
    }
  }

  return (
    <div className='p-4'>
      <Grid container spacing={2}>
        <Grid size={10}>
          <div className='flex flex-col gap-2'>

            <div className='flex items-center justify-between'>
              <div className='flex items-center justify-start'>
                <IconButton>
                  <ArrowBackIosNewIcon />
                </IconButton>

                <Typography variant="body1" component="p">
                  1/10
                </Typography>

                <IconButton >
                  <PushPinIcon />
                </IconButton>

                <IconButton>
                  <VisibilityIcon />
                </IconButton>

              </div>
              <div>
                Middle Side
              </div>
              <div>
                <IconButton>
                  <ArrowForwardIosIcon />
                </IconButton>
              </div>
            </div>

            <Paper sx={{ backgroundColor: 'var(--bg-slate-900)' }}>
              <Tabs value={value} onChange={handleChange} aria-label="basic tabs example">
                <Tab label="Questão" icon={<PlayArrowIcon />} iconPosition="start" />
                <Tab label="Explanation" icon={<AutoStoriesIcon />} iconPosition="start" />
                <Tab label="Statistics" icon={<InsightsIcon />} iconPosition="start" />
                <Tab label="Comments" icon={<ForumIcon />} iconPosition="start" />
                <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
                <Tab label="Notes" icon={<NoteIcon />} iconPosition="start" />
              </Tabs>

              <CustomTabPanel value={value} hidden={value !== 0}>
                <div className='flex flex-col gap-6 '>

                  <Typography variant="h6">
                    Which statement best reflects the Single Responsibility Principle (SRP) in Angular architecture?
                  </Typography>

                  <div className='flex flex-col gap-3'>
                    {options.map((option) => (
                      <div key={option.id} className='flex items-center gap-2 relative'>
                        {option.isEliminated && (
                          <span className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 bg-slate-300/80" />
                        )}

                        <IconButton size='small' onClick={() => eliminateOption(option.id, !option.isEliminated)}>
                          <ContentCutIcon fontSize='inherit' />
                        </IconButton>

                        <button className={`
                          flex gap-2 items-center justify-start w-full h-full p-1 rounded-sm
                          ${option.isEliminated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          ${optionSelected === option.id ? 'bg-slate-500 outline-1 outline-violet-400 outline-offset-4' : 'bg-slate-700'}`}
                          onClick={() => handleOptionSelected(option.id)}
                          disabled={option.isEliminated}
                        >
                          <div className={`
                            flex items-center justify-center px-2 py-0.5 w-min-content h-full  rounded-sm
                            ${optionSelected === option.id ? 'bg-violet-400 text-white' : 'bg-slate-900'
                            }`}>
                            {questionAlternativeArray[option.id - 1]}
                          </div>
                          <Typography variant="body1">
                            {option.label}
                          </Typography>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>


              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 1}>
                Explanation
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 2}>
                Statistics
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 3}>
                Comments
              </CustomTabPanel>


              <CustomTabPanel value={value} hidden={value !== 4}>
                History
              </CustomTabPanel>

              <CustomTabPanel value={value} hidden={value !== 5}>
                Notes
              </CustomTabPanel>

            </Paper>
          </div>
        </Grid>
        <Grid size={2}>
          <div className='flex flex-col gap-3 w-full'>
            <Button variant="contained" color="primary" fullWidth>
              Finish Exam
            </Button>

            <Grid container spacing={1} className='w-full'>
              {questions.map((question) => (
                <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 2 }} key={question}>
                  <button
                    onClick={() => setCurrentQuestion(question)}
                    className={`
                      flex shrink-0 items-center justify-center w-full h-8 bg-slate-700 rounded-sm cursor-pointer
                      ${currentQuestion === question ? 'bg-violet-400 text-white outline-1 outline-violet-400 outline-offset-4' : ''}`}
                  >
                    {question}
                  </button>
                </Grid>
              ))}
            </Grid>
          </div>

        </Grid>
      </Grid>
    </div>
  )
}
