// Icônes ligne minimalistes (SVG en ligne, sans dépendance externe) —
// remplacent les emoji dans la navigation et le tableau de bord pour un
// rendu plus sobre et professionnel. `currentColor` + `strokeWidth`
// permettent de les teinter et redimensionner comme du texte.
function Base({ children, size = 20, ...props }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconHome(props) {
  return <Base {...props}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9"/></Base>;
}

export function IconCompass(props) {
  return <Base {...props}><circle cx="12" cy="12" r="9"/><path d="m14.5 9.5-1.8 5.2a1 1 0 0 1-.6.6l-3 1 1.8-5.2a1 1 0 0 1 .6-.6z"/></Base>;
}

export function IconAntenna(props) {
  return <Base {...props}><path d="M12 21V10"/><circle cx="12" cy="6" r="2.2"/><path d="M8.5 3.5a6 6 0 0 0 0 8.5M15.5 3.5a6 6 0 0 1 0 8.5M6 1.5a9.2 9.2 0 0 0 0 13M18 1.5a9.2 9.2 0 0 1 0 13"/></Base>;
}

export function IconCalculator(props) {
  return <Base {...props}><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11.5" x2="8" y2="11.5"/><line x1="12" y1="11.5" x2="12" y2="11.5"/><line x1="16" y1="11.5" x2="16" y2="11.5"/><line x1="8" y1="15.5" x2="8" y2="15.5"/><line x1="12" y1="15.5" x2="12" y2="15.5"/><line x1="16" y1="15.5" x2="16" y2="15.5"/><line x1="8" y1="19" x2="8" y2="19"/><line x1="12" y1="19" x2="16" y2="19"/></Base>;
}

export function IconTrendUp(props) {
  return <Base {...props}><path d="m3 16 6-6 4 4 8-9"/><path d="M15 5h6v6"/></Base>;
}

export function IconCalendar(props) {
  return <Base {...props}><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="6.5"/><line x1="16" y1="3" x2="16" y2="6.5"/></Base>;
}

export function IconUsers(props) {
  return <Base {...props}><circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16.5 8.2a3 3 0 0 1 0 5.9"/><path d="M18.5 20a5.2 5.2 0 0 0-3-4.8"/></Base>;
}

export function IconLogout(props) {
  return <Base {...props}><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M15 16l4-4-4-4"/><line x1="19" y1="12" x2="9" y2="12"/></Base>;
}

export function IconArrowRight(props) {
  return <Base {...props}><line x1="4" y1="12" x2="19" y2="12"/><path d="m13 6 6 6-6 6"/></Base>;
}

export function IconShield(props) {
  return <Base {...props}><path d="M12 3.5 5 6v6c0 4.5 3 7.5 7 8.5 4-1 7-4 7-8.5V6z"/><path d="m9.2 12 1.9 1.9L15 10"/></Base>;
}

export function IconLeaf(props) {
  return <Base {...props}><path d="M5 19c9 0 14-5 14-14-9 0-14 5-14 14Z"/><path d="M5 19c0-5 2-8.5 6-11"/></Base>;
}

export function IconWrench(props) {
  return <Base {...props}><path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6 2.4 2.4 6-6a4 4 0 0 0 5-5.4l-2.6 2.6-2-2z"/></Base>;
}

export function IconDroplet(props) {
  return <Base {...props}><path d="M12 3.5s6 6.7 6 11a6 6 0 1 1-12 0c0-4.3 6-11 6-11Z"/></Base>;
}
