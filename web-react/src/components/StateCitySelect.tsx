import {
  Autocomplete,
  CircularProgress,
  TextField,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import {
  fetchEstados,
  fetchMunicipiosPorEstado,
  type IbgeEstado,
  type IbgeMunicipio,
} from '@/lib/ibge'

export type StateCitySelectProps = {
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state: string
  city: string
  onStateChange: (state: string) => void
  onCityChange: (city: string) => void
  size?: 'small' | 'medium'
  fullWidth?: boolean
  sx?: SxProps<Theme>
}

/**
 * Encontra o estado que corresponde ao valor armazenado (sigla ou nome).
 * Mantém compatibilidade com dados antigos.
 */
function findEstadoByValue(estados: IbgeEstado[], value: string): IbgeEstado | null {
  if (!value.trim()) return null
  const v = value.trim()
  const bySigla = estados.find((e) => e.sigla === v)
  if (bySigla) return bySigla
  const byNome = estados.find(
    (e) => e.nome.toLowerCase() === v.toLowerCase(),
  )
  return byNome ?? null
}

/**
 * Encontra o município que corresponde ao valor armazenado.
 */
function findMunicipioByValue(
  municipios: IbgeMunicipio[],
  value: string,
): IbgeMunicipio | null {
  if (!value.trim()) return null
  const v = value.trim()
  return (
    municipios.find((m) => m.nome.toLowerCase() === v.toLowerCase()) ?? null
  )
}

export function StateCitySelect({
  governmentScope,
  state,
  city,
  onStateChange,
  onCityChange,
  size = 'medium',
  fullWidth = true,
  sx,
}: StateCitySelectProps) {
  const stateDisabled = governmentScope === 'FEDERAL'
  const cityDisabled = governmentScope !== 'MUNICIPAL'

  const { data: estados = [], isLoading: isLoadingEstados } = useQuery({
    queryKey: ['ibge', 'estados'],
    queryFn: fetchEstados,
    staleTime: 1000 * 60 * 60 * 24, // 24h - dados raramente mudam
  })

  const selectedEstado = findEstadoByValue(estados, state)

  const { data: municipios = [], isLoading: isLoadingMunicipios } = useQuery({
    queryKey: ['ibge', 'municipios', selectedEstado?.id],
    queryFn: () => fetchMunicipiosPorEstado(selectedEstado!.id),
    enabled: !!selectedEstado && governmentScope === 'MUNICIPAL',
    staleTime: 1000 * 60 * 60 * 24,
  })

  const selectedMunicipio = findMunicipioByValue(municipios, city)

  const handleStateChange = (_: unknown, value: IbgeEstado | null) => {
    onStateChange(value?.sigla ?? '')
    if (value?.sigla !== selectedEstado?.sigla) {
      onCityChange('')
    }
  }

  const handleCityChange = (_: unknown, value: IbgeMunicipio | null) => {
    onCityChange(value?.nome ?? '')
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ width: fullWidth ? '100%' : undefined }}>
      <Autocomplete<IbgeEstado>
        options={estados}
        getOptionLabel={(opt) => `${opt.sigla} - ${opt.nome}`}
        value={selectedEstado}
        onChange={handleStateChange}
        disabled={stateDisabled}
        size={size}
        loading={isLoadingEstados}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Estado"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingEstados ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={sx}
          />
        )}
        sx={{ minWidth: 0 }}
      />
      <Autocomplete<IbgeMunicipio>
        options={municipios}
        getOptionLabel={(opt) => opt.nome}
        value={selectedMunicipio}
        onChange={handleCityChange}
        disabled={cityDisabled}
        size={size}
        loading={isLoadingMunicipios}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Cidade"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {isLoadingMunicipios ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            sx={sx}
          />
        )}
        sx={{ minWidth: 0 }}
      />
    </div>
  )
}
