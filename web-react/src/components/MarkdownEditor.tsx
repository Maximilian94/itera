import MDEditor from '@uiw/react-md-editor'
import '@uiw/react-md-editor/markdown-editor.css'
import { Box, FormHelperText, Typography } from '@mui/material'

export interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minHeight?: number
  error?: string
  /** When true, shows amber/yellow border to indicate unsaved changes */
  changed?: boolean
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  minHeight = 400,
  error,
  changed,
}: MarkdownEditorProps) {
  return (
    <Box
      sx={{
        '& .w-md-editor': {
          borderRadius: 1,
          border: '1px solid',
          borderColor: error ? 'error.main' : changed ? 'warning.main' : 'divider',
          '&:focus-within': {
            borderColor: error ? 'error.main' : changed ? 'warning.main' : 'primary.main',
            borderWidth: 2,
            boxShadow: 1,
          },
        },
        '& .w-md-editor-toolbar': {
          bgcolor: 'action.hover',
          borderBottom: '1px solid',
          borderColor: 'divider',
        },
        '& .w-md-editor-content': {
          height: minHeight,
        },
        '& .w-md-editor-area': {
          fontFamily: 'inherit',
        },
      }}
    >
      {label && (
        <Typography
          variant="body2"
          sx={{ mb: 0.5, fontWeight: 500, color: 'text.secondary' }}
        >
          {label}
        </Typography>
      )}
      <div data-color-mode="light">
        <MDEditor
          value={value}
          onChange={(val) => onChange(val ?? '')}
          height={minHeight}
          visibleDragbar={false}
          preview="live"
          textareaProps={{ placeholder }}
        />
      </div>
      {error && (
        <FormHelperText error sx={{ mt: 0.5 }}>
          {error}
        </FormHelperText>
      )}
    </Box>
  )
}
