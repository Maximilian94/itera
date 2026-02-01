import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import { useExamsQuery } from '@/features/exams/queries/exams.queries'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import {
    Alert,
    Box,
    Card,
    Chip,
    Grid,
    Paper,
    Stack,
    Typography,
} from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import dayjs from 'dayjs'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
}

export const Route = createFileRoute('/_authenticated/exams/$examBoard/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { examBoard: examBoardSlug } = Route.useParams()

    const { examBases } = useExamBaseFacade({ examBoardId: examBoardSlug })

    useEffect(() => {
        console.log("examBoardSlug", examBoardSlug)

        console.log("examBases", examBases)
    }, [examBoardSlug])

    const governmentScopeLabel = (scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') => {
        let label = ''
        if (scope === 'MUNICIPAL') {
            label = 'Municipal'
        } else if (scope === 'STATE') {
            label = 'Estadual'
        } else if (scope === 'FEDERAL') {
            label = 'Federal'
        }
        return label
    }


    function statusChip(status: 'not_started' | 'in_progress' | 'finished') {
        if (status === 'finished') {
            return (
                <Chip
                    size="small"
                    color="success"
                    icon={<CheckCircleIcon />}
                    label="Finished"
                />
            )
        }
        if (status === 'in_progress') {
            return (
                <Chip
                    size="small"
                    color="warning"
                    icon={<HourglassTopIcon />}
                    label="In progress"
                />
            )
        }
        return (
            <Chip
                size="small"
                color="info"
                icon={<RadioButtonUncheckedIcon />}
                label="Not started"
            />
        )
    }

    const locationLabel = (examBase: ExamBase) => {
        if (examBase.governmentScope === 'MUNICIPAL') {
            return `${examBase.city ?? ''} / ${examBase.state ?? ''}`
        } else if (examBase.governmentScope === 'STATE') {
            return examBase.state ?? ''
        } else if (examBase.governmentScope === 'FEDERAL') {
            return 'Federal'
        }
    }

    function formatBRL(value: string | number) {
        const number = typeof value === "string" ? Number(value) : value;

        if (!Number.isFinite(number)) return "—";

        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
        }).format(number);
    }

    return (
        <Box className="p-4 flex flex-col gap-3">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="h4">
                    {/* {examBoard ? `${examBoard.name} exams` : 'Exams'} */}
                </Typography>
            </Stack>

            {/* {isLoadingExamBoards ? <Typography>Loading...</Typography> : null} */}

            {/* {!isLoadingExamBoards && !examBoard ? (
        <Alert severity="error">
          Exam board not found for route: <strong>{examBoardSlug}</strong>
        </Alert>
      ) : null} */}

            {/* {examsError instanceof Error ? (
        <Alert severity="error">{examsError.message}</Alert>
      ) : null} */}

            {/* {isLoadingExams ? <Typography>Loading exams...</Typography> : null} */}

            {(examBases ?? []).map((examBase) => (
                <Paper key={examBase.id} className='w-full overflow-hidden pr-4 h-min'>
                    <Grid container spacing={2}>
                        <Grid size={1}>
                            <div className='w-full h-12 flex items-center justify-start'>
                                <img
                                    src={examBase.examBoard?.logoUrl}
                                    alt={examBase.examBoard?.name}
                                    className="h-full w-full object-contain object-left"
                                />
                            </div>
                        </Grid>
                        <Grid size={1}>
                            <div className='flex flex-col items-center justify-center h-full'>
                                <Typography variant="body1">{dayjs(examBase.examDate).format('YYYY')}</Typography>
                            </div>

                        </Grid>
                        <Grid size={3}>
                            <div className='flex flex-col h-full w-full items-start justify-center'>
                                <Typography variant="body1">{governmentScopeLabel(examBase.governmentScope)}</Typography>
                                <Typography variant="body2">{locationLabel(examBase)}</Typography>
                            </div>

                        </Grid>
                        <Grid size={5}>
                            <div className='flex flex-col h-full w-full items-start justify-center'>
                                <Typography variant="body1">{examBase.institution}</Typography>
                                <Typography variant="body2">{examBase.role}</Typography>
                            </div>

                        </Grid>
                        <Grid size={2}>
                            <div className='flex flex-col h-full w-full items-end justify-center'>
                                <Typography variant="body1">{formatBRL(examBase.salaryBase ?? 0)}</Typography>
                            </div>
                        </Grid>
                    </Grid>
                </Paper>
                // <Link
                //   key={examBase.id}
                //   to="/exams/$examBoard/$examId"
                //   params={{ examBoard: examBoardSlug, examId: examBase.id }}
                // >
                //   <Typography variant="body1">{examBase.name}</Typography>
                // </Link>
            ))}

            {/* {!isLoadingExams && (examsRes?.exams?.length ?? 0) === 0 && examBoard ? (
        <Typography color="text.secondary">
          No exams are associated with this exam board yet.
        </Typography>
      ) : null} */}
        </Box>
    )
}
