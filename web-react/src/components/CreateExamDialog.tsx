import { Dialog, DialogContent, DialogTitle, DialogContentText, Button, DialogActions } from "@mui/material"

export interface CreateExamDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
}

export const CreateExamDialog = ({ open, onClose, onSubmit }: CreateExamDialogProps) => {
  return (
    <>
    <Dialog open={open} onClose={onClose}>
    <DialogTitle>Create Exam</DialogTitle>
    <DialogContent>
      <DialogContentText>Create a new exam</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button variant="contained" color="primary" onClick={onSubmit}>Create Exam</Button>
    </DialogActions>
    </Dialog>
    </>
  )
}