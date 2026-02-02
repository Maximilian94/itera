import { Box, Typography } from '@mui/material'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

export interface MarkdownProps {
  children: string
  variant?: 'body1' | 'body2' | 'caption'
  sx?: object
}

const fontSizeMap = {
  body1: '1rem',
  body2: '0.875rem',
  caption: '0.75rem',
}

export function Markdown({
  children,
  variant = 'body2',
  sx = {},
}: MarkdownProps) {
  const fontSize = fontSizeMap[variant]

  const components: Components = {
    p: ({ children: c, ...props }) => (
      <Typography
        component="p"
        sx={{ fontSize, margin: 0, '& + &': { mt: 1 } }}
        {...props}
      >
        {c}
      </Typography>
    ),
    strong: ({ children: c, ...props }) => (
      <Typography component="strong" sx={{ fontWeight: 700 }} {...props}>
        {c}
      </Typography>
    ),
    em: ({ children: c, ...props }) => (
      <Typography component="em" sx={{ fontStyle: 'italic' }} {...props}>
        {c}
      </Typography>
    ),
    code: ({ className, children: c, ...props }) =>
      className ? (
        <Typography
          component="code"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.9em',
            bgcolor: 'action.hover',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
            display: 'block',
            overflow: 'auto',
            p: 1,
          }}
          {...props}
        >
          {c}
        </Typography>
      ) : (
        <Typography
          component="code"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.9em',
            bgcolor: 'action.hover',
            px: 0.5,
            py: 0.25,
            borderRadius: 0.5,
          }}
          {...props}
        >
          {c}
        </Typography>
      ),
    ul: ({ children: c, ...props }) => (
      <Typography component="ul" sx={{ pl: 2.5, my: 0.5, fontSize }} {...props}>
        {c}
      </Typography>
    ),
    ol: ({ children: c, ...props }) => (
      <Typography component="ol" sx={{ pl: 2.5, my: 0.5, fontSize }} {...props}>
        {c}
      </Typography>
    ),
    li: ({ children: c, ...props }) => (
      <Typography
        component="li"
        sx={{ fontSize, '& + &': { mt: 0.25 } }}
        {...props}
      >
        {c}
      </Typography>
    ),
    h1: ({ children: c, ...props }) => (
      <Typography component="h1" variant="h5" sx={{ mt: 1, mb: 0.5 }} {...props}>
        {c}
      </Typography>
    ),
    h2: ({ children: c, ...props }) => (
      <Typography component="h2" variant="h6" sx={{ mt: 1, mb: 0.5 }} {...props}>
        {c}
      </Typography>
    ),
    h3: ({ children: c, ...props }) => (
      <Typography
        component="h3"
        variant="subtitle1"
        sx={{ mt: 1, mb: 0.5 }}
        {...props}
      >
        {c}
      </Typography>
    ),
    br: () => <br />,
  }

  if (children == null || children === '') {
    return null
  }

  return (
    <Box sx={{ lineHeight: 1.6, ...sx }}>
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={components}>
        {String(children)}
      </ReactMarkdown>
    </Box>
  )
}
