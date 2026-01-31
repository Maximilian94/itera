import { Box } from "@mui/material"

interface TabPanelProps {
  children?: React.ReactNode;
  hidden: boolean;
  value: number;
}

export const CustomTabPanel = ({ children, hidden, value, ...other }: TabPanelProps) => {
  return (
    <div
      role="tabpanel"
      hidden={hidden}
      id={`simple-tabpanel-${value}`}
      aria-labelledby={`simple-tab-${value}`}
      {...other}
    >
      {!hidden && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}