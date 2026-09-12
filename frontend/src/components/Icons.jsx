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

export function IconEdit(props) {
  return <Base {...props}><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m14 6 4 4"/></Base>;
}

export function IconTrash(props) {
  return <Base {...props}><path d="M5 7h14"/><path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2"/><path d="M7 7l1 12.5A1.5 1.5 0 0 0 9.5 21h5a1.5 1.5 0 0 0 1.5-1.5L17 7"/><line x1="10" y1="11" x2="10" y2="16.5"/><line x1="14" y1="11" x2="14" y2="16.5"/></Base>;
}

export function IconMapPin(props) {
  return <Base {...props}><path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></Base>;
}

export function IconRefresh(props) {
  return <Base {...props}><path d="M4 12a8 8 0 0 1 13.5-5.8L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.5 5.8L4 15.5"/><path d="M4 20v-4.5h4.5"/></Base>;
}

export function IconPlus(props) {
  return <Base {...props}><line x1="12" y1="4.5" x2="12" y2="19.5"/><line x1="4.5" y1="12" x2="19.5" y2="12"/></Base>;
}

export function IconChevronLeft(props) {
  return <Base {...props}><path d="m14.5 4.5-7 7.5 7 7.5"/></Base>;
}

export function IconUser(props) {
  return <Base {...props}><circle cx="12" cy="8" r="3.4"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/></Base>;
}

export function IconInfo(props) {
  return <Base {...props}><circle cx="12" cy="12" r="9"/><line x1="12" y1="10.5" x2="12" y2="16"/><line x1="12" y1="7.2" x2="12" y2="7.2"/></Base>;
}

export function IconLayers(props) {
  return <Base {...props}><path d="m12 3.5 8.5 4.8L12 13l-8.5-4.7Z"/><path d="m3.5 12.8 8.5 4.7 8.5-4.7"/><path d="m3.5 16.9 8.5 4.7 8.5-4.7"/></Base>;
}

export function IconTable(props) {
  return <Base {...props}><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="3.5" y1="15" x2="20.5" y2="15"/><line x1="12" y1="4.5" x2="12" y2="19.5"/></Base>;
}

export function IconLoader(props) {
  return <Base {...props}><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/></Base>;
}

export function IconPlug(props) {
  return <Base {...props}><path d="M9 3.5v5M15 3.5v5"/><path d="M6.5 8.5h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.5V21"/></Base>;
}

export function IconCheck(props) {
  return <Base {...props}><path d="m4.5 12.5 5 5 10-11"/></Base>;
}

export function IconX(props) {
  return <Base {...props}><line x1="5.5" y1="5.5" x2="18.5" y2="18.5"/><line x1="18.5" y1="5.5" x2="5.5" y2="18.5"/></Base>;
}

export function IconAlertTriangle(props) {
  return <Base {...props}><path d="M12 4 3 20h18Z"/><line x1="12" y1="10" x2="12" y2="14.5"/><line x1="12" y1="17" x2="12" y2="17"/></Base>;
}

export function IconFlask(props) {
  return <Base {...props}><path d="M9.5 3.5h5"/><path d="M10.5 4v6l-5.5 9.5A1.5 1.5 0 0 0 6.3 21.7h11.4a1.5 1.5 0 0 0 1.3-2.2L13.5 10V4"/><line x1="8" y1="15" x2="16" y2="15"/></Base>;
}

export function IconZap(props) {
  return <Base {...props}><path d="M12.5 3 5 13.5h6l-1 7.5L19 10.5h-6.5z"/></Base>;
}

export function IconSprout(props) {
  return <Base {...props}><path d="M12 21v-9"/><path d="M12 12C12 7.5 8.5 5 4.5 5 4.5 9.5 8 12 12 12Z"/><path d="M12 9c0-3.3 2.7-5 6-5 0 3.3-2.7 5-6 5Z"/></Base>;
}

export function IconSun(props) {
  return <Base {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.3M12 19.2v2.3M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6"/></Base>;
}

export function IconCloud(props) {
  return <Base {...props}><path d="M7 18.5a4.3 4.3 0 0 1-.7-8.5 5.5 5.5 0 0 1 10.6-1.7A4 4 0 0 1 17 18.5Z"/></Base>;
}

export function IconThermometer(props) {
  return <Base {...props}><path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a3.5 3.5 0 1 0 4 0Z"/></Base>;
}

export function IconWind(props) {
  return <Base {...props}><path d="M3.5 8h11a2.5 2.5 0 1 0-2.3-3.5"/><path d="M3.5 12.5h14a2.5 2.5 0 1 1-2.3 3.5"/><path d="M3.5 17h8"/></Base>;
}

export function IconGauge(props) {
  return <Base {...props}><circle cx="12" cy="13" r="8"/><path d="M12 13 15.5 9"/><path d="M9 5.5h6"/></Base>;
}

export function IconCloudRain(props) {
  return <Base {...props}><path d="M7 16a4.3 4.3 0 0 1-.7-8.5 5.5 5.5 0 0 1 10.6-1.7A4 4 0 0 1 17 16Z"/><line x1="8.5" y1="19" x2="8.5" y2="21.5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="15.5" y1="19" x2="15.5" y2="21.5"/></Base>;
}

export function IconEye(props) {
  return <Base {...props}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></Base>;
}

export function IconSearch(props) {
  return <Base {...props}><circle cx="11" cy="11" r="6.5"/><line x1="20" y1="20" x2="15.7" y2="15.7"/></Base>;
}

export function IconArrowDown(props) {
  return <Base {...props}><line x1="12" y1="4.5" x2="12" y2="19.5"/><path d="m6 13.5 6 6 6-6"/></Base>;
}

export function IconArrowUp(props) {
  return <Base {...props}><line x1="12" y1="19.5" x2="12" y2="4.5"/><path d="m6 10.5 6-6 6 6"/></Base>;
}
