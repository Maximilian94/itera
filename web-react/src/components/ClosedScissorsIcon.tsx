import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';

export function ClosedScissorsIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* handles */}
      <circle cx="5" cy="7" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="5" cy="17" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />

      {/* handle to pivot */}
      <path d="M7 8.5L11 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15.5L11 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* blades (closed/near-overlapped) */}
      <path d="M11 12L20 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 12L20 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </SvgIcon>
  );
}
