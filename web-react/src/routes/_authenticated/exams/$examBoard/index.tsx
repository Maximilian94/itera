import { Button, Card, IconButton } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import { DeleteIcon, TrashIcon } from 'lucide-react'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BookmarkIcon from '@mui/icons-material/Bookmark';

type ExamStatus = 'not_started' | 'bad_result' | 'good_result';

export const Route = createFileRoute('/_authenticated/exams/$examBoard/')({
    component: RouteComponent,
})

function RouteComponent() {
    const { examBoard } = Route.useParams()
    console.log(examBoard)

    const exams = [
        {
            id: 1,
            name: 'FGV - 2026 - TJ-MS - Técnico de Nível Superior - Enfermagem - Tipo 1',
            examBoard: 'FGV',
            year: 2026,
            state: 'MS',
            level: 'Técnico de Nível Superior',
            subject: 'Enfermagem',
            type: 'Tipo 1',
            status: 'not_started',
            testScore: 0,
            bookmarked: false,
        },
        {
            id: 2,
            name: 'FGV - 2026 - TJ-MS - Técnico de Nível Superior - Enfermagem - Tipo 2',
            examBoard: 'FGV',
            year: 2026,
            state: 'MS',
            level: 'Técnico de Nível Superior',
            subject: 'Enfermagem',
            type: 'Tipo 2',
            status: 'bad_result',
            testScore: 40,
            bookmarked: false,
        },
        {
            id: 3,
            name: 'FGV - 2026 - TJ-MS - Técnico de Nível Superior - Enfermagem - Tipo 3',
            examBoard: 'FGV',
            year: 2026,
            state: 'MS',
            level: 'Técnico de Nível Superior',
            subject: 'Enfermagem',
            type: 'Tipo 3',
            status: 'good_result',
            testScore: 80,
            bookmarked: false,
        },
        {
            id: 4,
            name: 'FGV - 2026 - TJ-MS - Técnico de Nível Superior - Enfermagem - Tipo 4',
            examBoard: 'FGV',
            year: 2026,
            state: 'MS',
            level: 'Técnico de Nível Superior',
            subject: 'Enfermagem',
            type: 'Tipo 4',
            status: 'not_started',
            testScore: 0,
            bookmarked: true,
        },
    ]


    function examStatusIcon({ status }: { status: ExamStatus }) {
        return (
            <div className="flex items-center gap-2">
                {status === 'not_started' && <RadioButtonUncheckedIcon color='info' />}
                {status === 'bad_result' && <CancelIcon color='error' />}
                {status === 'good_result' && <CheckCircleIcon color='success' />}
            </div>
        )
    }
    return <div className="p-4 flex flex-col gap-2">
        {exams.map((exam) => (
            <Link to="/exams/$examBoard/$examId" params={{ examBoard: exam.examBoard, examId: exam.id.toString() }}>
                <Button fullWidth>
                <Card key={exam.id} className='group flex gap-6 justify-between h-8 items-center w-full'>
                    <div className="flex items-center gap-2 w-16">
                        {examStatusIcon({ status: exam.status as ExamStatus })}
                        {exam.testScore}%
                    </div>
                    <div className="flex items-start gap-2">
                        {exam.examBoard} - {exam.year} - {exam.state} - {exam.level} - {exam.subject} - {exam.type}
                    </div>

                    <div className="flex flex-1 justify-end">
                        <div className={`${exam.bookmarked ? 'flex' : 'hidden'} group-hover:flex`}>
                            <IconButton>
                                {exam.bookmarked ? <BookmarkIcon color='primary' /> : <BookmarkBorderIcon color='primary' />}
                            </IconButton>
                        </div>

                    </div>
                </Card>
                </Button>
            </Link>

        ))}
    </div>
}
