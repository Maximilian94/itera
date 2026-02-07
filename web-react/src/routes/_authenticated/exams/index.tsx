import { ExamBaseRow } from '@/components/ExamBaseRow'
import { ExamDisplayOption } from '@/components/ExamDisplayOption'
import { PageHeader } from '@/components/PageHeader'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import { Button, Grid, Paper, Typography } from '@mui/material'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  BookmarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'

export const Route = createFileRoute('/_authenticated/exams/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Exames" />

      <div className="flex items-center gap-4">
        <ExamDisplayOption
          name="Bancas"
          description="Agrupa os exames por banca"
        >
          <AcademicCapIcon className="w-6 h-6 text-blue-500" />
        </ExamDisplayOption>
        <ExamDisplayOption
          name="Recentes"
          description="Exibir os exames mais recentes"
        >
          <CalendarDaysIcon className="w-6 h-6 text-green-500" />
        </ExamDisplayOption>
        <ExamDisplayOption
          name="Favoritos"
          description="Exibir os exames favoritos"
        >
          <BookmarkIcon className="w-6 h-6 text-yellow-500" />
        </ExamDisplayOption>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Lista de exames</h2>
        {isLoadingExamBases ? (
          <p className="text-sm text-slate-500">Carregando exames...</p>
        ) : (examBases?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">Nenhum exame encontrado.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {(examBases ?? []).map((examBase) => (
              <ExamBaseRow key={examBase.id} examBase={examBase} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
