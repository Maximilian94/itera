import { Button, Card, CardContent, Paper, Typography } from '@mui/material'
import Grid from '@mui/material/Grid';
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/exams/')({
  component: RouteComponent,
})

function RouteComponent() {
  const bancas = [
    {
      name: 'Fundação Carlos Chagas (FCC)',
      logo: 'https://www.fcc.org.br/wp-content/uploads/2020/05/fcc.jpg',
      examsCount: 0
    },
    {
      name: 'Fundação Getulio Vargas (FGV)',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/2/28/FGV_Nacional.png?20140902205707',
      examsCount: 0
    },
    {
      name: 'VUNESP',
      logo: 'https://images.seeklogo.com/logo-png/15/1/vunesp-logo-png_seeklogo-150971.png',
      examsCount: 0
    },
    {
      name: 'Instituto Avança SP',
      logo: 'https://static-cdn.selecao.net.br/uploads/301/configs/c4b55f2c9723d132f05f2baa330811b7.jpg',
      examsCount: 0
    },
  ];
  
  return <div>
    <Typography variant="h1" component="h2">
      Exams
    </Typography>

    <Grid container spacing={2}>
    {bancas.map((banca) => (
        <Grid size={1.5} key={banca.name}>
          <Link to="/exams/$examBoard" params={{ examBoard: banca.name.toLowerCase().replace(' ', '-') }}>
          <Button sx={{ height: '100%' }}>
              <Paper sx={{ height: '100%' }}>
                  <img src={banca.logo} alt={banca.name} className="w-full h-full object-contain" />
                  <Typography variant="body1">{banca.name}</Typography>
              </Paper>
            </Button>
          </Link>
        </Grid>
      ))}
      </Grid>
  </div>
}
