// Languages: Spanish (the source) and English. The interface is written in Spanish; in English, a
// translator rewrites what the page shows (text, title, placeholder, aria-label) from the table and
// patterns below, as elements appear. The person's own content never goes through it: terminals and
// anything inside an element with translate="no" (file names, spaces, skills, servers...).
//
// To add a string: write it in Spanish in the code, then add its English here (EN for fixed text,
// PATTERNS for text with numbers or names in it).

export let LANG = "es";
export function setLanguage(setting) {
  LANG = setting === "en" || setting === "es" ? setting : (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  document.documentElement.lang = LANG;
  return LANG;
}

const EN = {
  // window
  "Kit de IA": "AI kit", "Explorador": "Explorer", "Servidores": "Servers", "Uso de IA": "AI usage",
  "Comandos (Ctrl+Shift+P)": "Commands (Ctrl+Shift+P)", "Comandos (⌘⇧P)": "Commands (⌘⇧P)", "Espacios": "Spaces", "Nuevo espacio": "New space", "Agentes": "Agents",
  "Abre Claude Code, Codex o Gemini en una pestaña y aparecerá aquí con su estado.": "Open Claude Code, Codex or Gemini in a tab and it shows up here with its status.",
  "Configuración (Ctrl+,)": "Settings (Ctrl+,)", "Configuración (⌘,)": "Settings (⌘,)", "Configuración": "Settings", "Nueva pestaña aquí": "New tab here", "Renombrar…": "Rename…",
  "Nombre del espacio": "Space name", "Abrir carpeta": "Open folder", "Cerrar espacio": "Close space", "Carpeta del nuevo espacio": "Folder for the new space",
  "Terminal": "Terminal", "Editar esta lista…": "Edit this list…", "Nombre de la pestaña": "Tab name", "Cerrar pestaña": "Close tab", "Nueva pestaña": "New tab",
  "Minimizar": "Minimize", "Maximizar": "Maximize", "Cerrar": "Close", "Ver uso de Claude": "See Claude usage", "settings.json con error": "settings.json has an error",
  "Bienvenido a Mooser": "Welcome to Mooser",
  "Abre una carpeta de proyecto para empezar. Cada carpeta es un espacio con sus pestañas y agentes.": "Open a project folder to start. Each folder is a space with its own tabs and agents.",
  "Empezar en tu carpeta personal": "Start in your home folder", "Nuevo espacio (abrir carpeta)…": "New space (open folder)…",
  "Dividir a la derecha": "Split right", "Dividir hacia abajo": "Split down", "Ampliar o restaurar panel": "Zoom or restore pane", "Cerrar panel": "Close pane",
  "Ocultar panel": "Hide panel", "Ocultar panel lateral": "Hide side panel", "Mostrar panel lateral": "Show side panel",
  "Expandir barra": "Expand sidebar", "Plegar barra": "Fold sidebar", "Expandir barra lateral": "Expand sidebar", "Plegar barra lateral": "Fold sidebar",
  "Texto más grande": "Larger text", "Texto más pequeño": "Smaller text", "Atajos de teclado": "Keyboard shortcuts", "Cambiar tema…": "Change theme…", "Recargar ventana": "Reload window",
  "Escribe un comando o un espacio…": "Type a command or a space…", "Ir al espacio 1…9": "Go to space 1…9", "Pestaña siguiente / anterior": "Next / previous tab",
  "Moverse entre paneles": "Move between panes", "Alt+flechas": "Alt+arrows", "⌘⌥flechas": "⌘⌥arrows", "Copiar / pegar en la terminal": "Copy / paste in the terminal",
  "Este equipo": "This computer", "Este Mac": "This Mac", "Sin agentes": "No agents", "Ctrl+Shift+P comandos": "Ctrl+Shift+P commands", "⌘⇧P comandos": "⌘⇧P commands",
  "Trabajando": "Working", "Te necesita": "Needs you", "Terminó": "Done", "En espera": "Idle",
  "Terminó.": "Finished.", "Enter cierra": "Enter closes", "Símbolo del sistema": "Command Prompt", "Restaurar": "Restore", "Ampliar": "Zoom", "Cerrar panel ": "Close pane",
  "main.js no exporta una función por defecto": "main.js has no default export function",
  // settings
  "Apariencia": "Appearance", "Avisos": "Alerts", "Acerca de": "About", "Tema": "Theme", "Idioma": "Language", "Automático (el del sistema)": "Automatic (the system's)",
  "Color de acento": "Accent color", "Botones, selección y foco. Vacío: el del tema.": "Buttons, selection and focus. Empty: the theme's.", "Usar el del tema": "Use the theme's",
  "Fondo": "Background", "El del tema": "The theme's", "Color liso": "Plain color", "Imagen propia": "Your own image",
  "Opacidad del cristal": "Glass opacity", "Cuánto tapan los paneles el fondo.": "How much the panels cover the background.", "Desenfoque": "Blur", "Esquinas": "Corners",
  "Separación": "Spacing", "Entre paneles y bordes.": "Between panels and edges.", "Tamaño del texto de la interfaz": "Interface text size", "Animaciones": "Animations",
  "Deslizar al plegar o abrir paneles.": "Slide when folding or opening panels.", "Fuente": "Font", "Vacío: Cascadia Code, SF Mono, Menlo o Consolas.": "Empty: Cascadia Code, SF Mono, Menlo or Consolas.",
  "Tamaño": "Size", "Interlineado": "Line height", "Cursor": "Cursor", "Bloque": "Block", "Barra": "Bar", "Subrayado": "Underline", "Cursor parpadeante": "Blinking cursor",
  "Copiar al seleccionar": "Copy on select", "Copia el texto en cuanto lo seleccionas.": "Copies text as soon as you select it.", "Historial": "Scrollback",
  "Líneas que guarda cada terminal.": "Lines each terminal keeps.", "Shell": "Shell",
  "Vacío: automático (PowerShell 7 o Windows PowerShell en Windows; tu $SHELL en macOS). Se aplica a las terminales nuevas.": "Empty: automatic (PowerShell 7 or Windows PowerShell on Windows; your $SHELL on macOS). Applies to new terminals.",
  "Automático": "Automatic", "Sonido": "Sound", "Un sonido suave cuando un agente te necesita o termina y no lo estás mirando.": "A soft sound when an agent needs you or finishes and you aren't looking at it.",
  "Notificaciones del sistema": "System notifications", "Cuando Mooser no es la ventana activa.": "When Mooser isn't the active window.", "Restablecimiento de Claude": "Claude reset",
  "Avisar cuando se restablece tu sesión de 5 horas.": "Let me know when your 5-hour session resets.", "Agentes del botón +": "Agents in the + button",
  "Lo que aparece al pulsar + en la barra de pestañas. El comando se escribe en una terminal nueva, así usa tu PATH.": "What shows when you press + in the tab bar. The command is typed into a new terminal, so it uses your PATH.",
  "Nombre": "Name", "Comando": "Command", "Quitar": "Remove", "Añadir agente": "Add agent", "Nuevo agente": "New agent",
  "Un hogar tranquilo para tus terminales y tus agentes de IA. Código abierto con licencia MIT.": "A calm home for your terminals and AI agents. Open source, MIT licensed.",
  "También con ⌘+ y ⌘-.": "Also with ⌘+ and ⌘-.", "También con Ctrl+= y Ctrl+-.": "Also with Ctrl+= and Ctrl+-.",
  "Cambiar el idioma recarga la ventana; tus terminales siguen abiertas.": "Changing the language reloads the window; your terminals stay open.",
  "Medianoche": "Midnight", "Ámbar": "Amber", "Cáustica": "Caustic",
  // explorer
  "Inicio": "Home", "Escritorio": "Desktop", "Documentos": "Documents", "Descargas": "Downloads", "Lugares": "Places", "Volver a leer": "Reload",
  "Elige una carpeta": "Choose a folder", "Filtrar en esta carpeta": "Filter this folder", "Guardar": "Save", "Cancelar": "Cancel",
  "Enviar a la papelera": "Move to trash", "Enviado a la papelera.": "Moved to trash.", "Mover a…": "Move to…", "Copiar a…": "Copy to…", "Quitar selección": "Clear selection",
  "Abrir como espacio": "Open as space", "Abrir": "Open", "Renombrar": "Rename", "Mostrar en el sistema": "Show in system", "Nueva carpeta": "New folder",
  "Abrir esta carpeta en el sistema": "Open this folder in the system", "Abrir espacio": "Open space", "Leyendo…": "Reading…", "Nada coincide con el filtro.": "Nothing matches the filter.",
  "Esta carpeta está vacía.": "This folder is empty.", "Entrar": "Open", "Carpeta superior": "Parent folder", "Elegir otra carpeta…": "Choose another folder…",
  "Ocultar archivos ocultos": "Hide hidden files", "Mostrar archivos ocultos": "Show hidden files", "Nombre ": "Name", "proyecto": "project",
  // kit
  "Modelos": "Models", "Agentes ": "Agents", "Predeterminado": "Default", "El que Claude Code elige según tu plan.": "The one Claude Code picks for your plan.",
  "El más capaz, para el trabajo más difícil.": "The most capable, for the hardest work.", "Razonamiento profundo y tareas largas.": "Deep reasoning and long tasks.",
  "Equilibrio entre velocidad y capacidad.": "A balance of speed and capability.", "El más rápido, para tareas sencillas.": "The fastest, for simple tasks.",
  "Conectado": "Connected", "Requiere iniciar sesión": "Needs sign-in", "Pendiente de aprobar": "Pending approval", "Sin conexión": "Offline", "Sin comprobar": "Not checked",
  "Tuyos": "Yours", "De claude.ai": "From claude.ai", "Plugins": "Plugins", "De este proyecto": "From this project", "Leyendo tu configuración…": "Reading your setup…",
  "Buscar": "Search", "Nuevo": "New", "Cuándo debe usarse": "When it should be used", "Nuevo skill": "New skill",
  "Se crea en tu carpeta de Claude Code y se abre en tu editor para que escribas sus instrucciones.": "It's created in your Claude Code folder and opens in your editor so you can write its instructions.",
  "Crear y abrir": "Create and open", "Creando…": "Creating…", "Creado. Edítalo en tu editor.": "Created. Edit it in your editor.", "Nada coincide con la búsqueda.": "Nothing matches the search.",
  "Sin descripción": "No description", "Editar": "Edit", "Ver": "View", "Activar": "Turn on", "Activando…": "Turning on…", "Desactivado": "Off", "Plugin apagado": "Plugin off",
  "Papelera": "Trash", "Enviando…": "Moving…", "Comprobar": "Check", "Comprobando…": "Checking…", "Añadir": "Add", "URL o comando": "URL or command", "Añadir servidor MCP": "Add MCP server",
  "Una URL (https://…) para un servidor remoto, o el comando que lo arranca, por ejemplo: npx -y paquete-mcp": "A URL (https://…) for a remote server, or the command that starts it, for example: npx -y some-mcp-package",
  "Escribe un nombre y una URL o comando.": "Type a name and a URL or command.", "Añadiendo…": "Adding…", "Quitando…": "Removing…",
  "Pulsa Comprobar para ver tus servidores.": "Press Check to see your servers.", "Comprobando cada servidor, tarda unos segundos…": "Checking each server, this takes a few seconds…",
  "Disponible en todos tus proyectos.": "Available in all your projects.", "Conector de tu cuenta: se gestiona en claude.ai, Ajustes, Conectores.": "A connector of your account: manage it at claude.ai, Settings, Connectors.",
  "Lo trae un plugin: apágalo desde Plugins.": "A plugin brings it: turn it off in Plugins.", "Definido en el .mcp.json del proyecto.": "Defined in the project's .mcp.json.",
  "Apagar": "Turn off", "Encender": "Turn on", "Apagando…": "Turning off…", "Encendiendo…": "Turning on…", "Desinstalar": "Uninstall", "Desinstalando…": "Uninstalling…",
  "Actualizar": "Update", "Actualizando…": "Updating…", "Para instalar más, escribe /plugin en Claude Code.": "To install more, type /plugin in Claude Code.",
  "No tienes plugins instalados.": "You have no plugins installed.", "No hay servidores MCP.": "No MCP servers.", "Sin componentes": "No components",
  "Elegido a mano en settings.json.": "Set by hand in settings.json.", "Modelo por defecto de Claude Code": "Claude Code's default model", "Cambiando el modelo…": "Changing the model…",
  "Modo rápido": "Fast mode", "Respuestas más rápidas con el mismo modelo, cuando lo admite.": "Faster answers with the same model, when it supports it.",
  "Modo rápido apagado.": "Fast mode off.", "Modo rápido encendido.": "Fast mode on.", "Guardando…": "Saving…", "Dentro de una sesión puedes cambiarlo con /model.": "Within a session you can change it with /model.",
  "Sincronizado desde claude.ai": "Synced from claude.ai", "Volver a leer ": "Reload",
  // servers
  "Guarda tus servidores SSH para conectarte con un clic": "Save your SSH servers to connect with one click", "Comprobar todos": "Check all", "Buscar servidor": "Search servers",
  "Archivos": "Files", "Mover archivos entre este equipo y tus servidores": "Move files between this computer and your servers",
  "En Windows instala Git for Windows para que Mooser escriba tus contraseñas guardadas. Sin él, ssh te la pedirá en la terminal.": "On Windows, install Git for Windows so Mooser can type your saved passwords. Without it, ssh asks for them in the terminal.",
  "Aún no hay servidores. Pulsa «Nuevo» para añadir el primero.": "No servers yet. Press New to add the first one.", "Conectar": "Connect", "Contraseña": "Password",
  "Nuevo servidor": "New server", "Volver": "Back", "Guardada: déjala vacía para mantenerla": "Saved: leave it empty to keep it", "Contraseña del servidor": "Server password",
  "Nombre (opcional)": "Name (optional)", "Dirección (IP o dominio)": "Address (IP or domain)", "Usuario": "User", "Puerto": "Port", "Grupo (p. ej. Producción)": "Group (e.g. Production)",
  "Contraseña (se guarda cifrada en este equipo)": "Password (saved encrypted on this computer)", "Olvidar la contraseña guardada": "Forget the saved password",
  "Llave privada (opcional, ruta al archivo)": "Private key (optional, path to the file)", "Color del grupo (lo comparten todos sus servidores)": "Group color (shared by all its servers)",
  "Selecciona y pulsa la flecha para copiar al otro lado": "Select, then press the arrow to copy to the other side", "Subir": "Up", "Doble clic para entrar": "Double-click to open",
  "Copiar a la derecha": "Copy to the right", "Copiar a la izquierda": "Copy to the left", "Sin grupo": "No group", "Guardado.": "Saved.", "Eliminar": "Delete", "Elegir carpeta": "Choose folder",
  "Turquesa": "Turquoise", "Azul": "Blue", "Violeta": "Violet", "Rosa": "Pink", "Coral": "Coral", "Limón": "Lemon", "Verde": "Green",
  // usage
  "Sesión de Claude restablecida": "Claude session reset", "Vuelves a tener el 100% disponible.": "You have 100% available again.", "Sesión de 5 horas": "5-hour session",
  "Se restablece en": "Resets in", "Sin sesión en curso": "No session running", "Empieza con tu próximo mensaje a Claude.": "It starts with your next message to Claude.",
  "Avisarme con sonido al restablecerse": "Alert me with a sound when it resets", "Semana": "Week", "Agentes abiertos": "Open agents", "No hay agentes abiertos ahora.": "No agents open right now.",
  // from the main process
  "No se pudo leer la lista de MCP": "Couldn't read the MCP list", "Solo se activan o desactivan los tuyos": "Only your own can be turned on or off", "Escribe un nombre": "Type a name",
  "Claude Code devolvió un error": "Claude Code returned an error", "Este sistema no ofrece cifrado seguro para guardar contraseñas": "This system offers no secure encryption to save passwords",
  "Falta la dirección del servidor": "The server address is missing", "Contraseña incorrecta: edítala en el servidor.": "Wrong password: edit it in the server.",
  "El servidor pide contraseña: guárdala al editar el servidor.": "The server asks for a password: save it when you edit the server.",
  "La huella del servidor cambió. Si es esperado, quita su línea de ~/.ssh/known_hosts.": "The server's fingerprint changed. If that's expected, remove its line from ~/.ssh/known_hosts.",
  "No se pudo leer la carpeta": "Couldn't read the folder", "Servidor no encontrado": "Server not found", "Sin respuesta": "No answer", "No existe": "Doesn't exist",
  "Ya existe algo con ese nombre": "Something with that name already exists",
  "No encontré una sesión de Claude Code en este equipo. Inicia sesión en Claude Code.": "No Claude Code session found on this computer. Sign in to Claude Code.",
  "La sesión de Claude Code caducó. Abre Claude Code para renovarla y pulsa Actualizar.": "Your Claude Code session expired. Open Claude Code to renew it, then press Update.",
  "Claude no aceptó la sesión. Abre Claude Code para renovarla y pulsa Actualizar.": "Claude didn't accept the session. Open Claude Code to renew it, then press Update.",
  "Elige archivos": "Choose files", "Imagen de fondo": "Background image", "Imágenes": "Images", "Listo.": "Done.",
};

const DAYS = { lunes: "Monday", martes: "Tuesday", "miércoles": "Wednesday", jueves: "Thursday", viernes: "Friday", "sábado": "Saturday", domingo: "Sunday" };
const when = (w) => w.replace(/^hoy a las/, "today at").replace(/^mañana a las/, "tomorrow at").replace(/^el (\S+) a las/, (_m, d) => `on ${DAYS[d] ?? d} at`);
const plural = (n, one, many) => `${n} ${Number(n) === 1 ? one : many}`;
const counts = (s) => s.replace(/(\d+) agentes?/g, (_m, n) => plural(n, "agent", "agents")).replace(/(\d+) comandos?/g, (_m, n) => plural(n, "command", "commands"))
  .replace(/(\d+) skills?/g, (_m, n) => plural(n, "skill", "skills")).replace(/(\d+) plugins?/g, (_m, n) => plural(n, "plugin", "plugins"));

const PATTERNS = [
  [/^Agentes · (\d+)$/, (_m, n) => `Agents · ${n}`],
  [/^Agentes abiertos · (\d+)$/, (_m, n) => `Open agents · ${n}`],
  [/^(\d+) pestañas?( · (?:Alt\+|⌘)\d)?$/, (_m, n, k) => `${plural(n, "tab", "tabs")}${k ?? ""}`],
  [/^(\d+) agentes?(?:, (\d+) trabajando)?(?:, (\d+) te necesitan?)?$/, (_m, n, w, b) => `${plural(n, "agent", "agents")}${w ? `, ${w} working` : ""}${b ? `, ${b} need${b === "1" ? "s" : ""} you` : ""}`],
  [/^· semana (\d+)%$/, (_m, n) => `· week ${n}%`],
  [/^(.+) te necesita$/, (_m, a) => `${a} needs you`],
  [/^(.+) terminó$/, (_m, a) => `${a} finished`],
  [/^(.+) en (.+) — (.+)$/, (_m, a, s, st) => `${a} in ${s} — ${tr(st)}`],
  [/^Nueva pestaña con (.+)$/, (_m, a) => `New tab with ${a}`],
  [/^Abrir (.+)$/, (_m, x) => `Open ${tr(x)}`],
  [/^Ir a (.+)$/, (_m, x) => `Go to ${x}`],
  [/^Agente: (.+) en (.+) \((.+)\)$/, (_m, a, s, st) => `Agent: ${a} in ${s} (${tr(st)})`],
  [/^Error en (.+)$/, (_m, p) => `Error in ${p}`],
  [/^(\d+) plugins? con error$/, (_m, n) => `${plural(n, "plugin", "plugins")} with errors`],
  [/^Versión (.+)$/, (_m, v) => `Version ${v}`],
  [/^Terminó con código (-?\d+)\.$/, (_m, c) => `Finished with code ${c}.`],
  [/^Carpeta creada: (.+)$/, (_m, n) => `Folder created: ${n}`],
  [/^Renombrado a (.+)$/, (_m, n) => `Renamed to ${n}`],
  [/^(Movido|Copiado) a (.+)$/, (_m, op, d) => `${op === "Movido" ? "Moved" : "Copied"} to ${d}`],
  [/^(\d+) seleccionados?$/, (_m, n) => `${n} selected`],
  [/^¿Enviar (\d+) elementos a la papelera\?$/, (_m, n) => `Move ${n} items to the trash?`],
  [/^¿Enviar «(.+)» a la papelera\?$/, (_m, n) => `Move “${n}” to the trash?`],
  [/^«(.+)» activado\.$/, (_m, n) => `“${n}” turned on.`],
  [/^«(.+)» añadido\.$/, (_m, n) => `“${n}” added.`],
  [/^«(.+)» quitado\.$/, (_m, n) => `“${n}” removed.`],
  [/^¿Quitar «(.+)»\?$/, (_m, n) => `Remove “${n}”?`],
  [/^¿Desinstalar (.+)\?$/, (_m, n) => `Uninstall ${n}?`],
  [/^(.+) desinstalado\.$/, (_m, n) => `${n} uninstalled.`],
  [/^(.+) (apagado|encendido)\. Se aplica en las sesiones nuevas de Claude Code\.$/, (_m, n, s) => `${n} turned ${s === "apagado" ? "off" : "on"}. Applies to new Claude Code sessions.`],
  [/^(.+) está al día\.$/, (_m, n) => `${n} is up to date.`],
  [/^Modelo por defecto: (.+)\. Se aplica en las sesiones nuevas\.$/, (_m, n) => `Default model: ${n}. Applies to new sessions.`],
  [/^No tienes (skill|agente)s propios todavía\. Crea uno con «Nuevo»\.$/, (_m, k) => `You have no ${k === "skill" ? "skills" : "agents"} of your own yet. Create one with New.`],
  [/^Del plugin (.+)$/, (_m, p) => `From the ${p} plugin`],
  [/^Tienda: (.+)$/, (_m, p) => `Marketplace: ${p}`],
  [/^Modelo: (.+)$/, (_m, p) => `Model: ${p}`],
  [/^(\d+) skills, .*$/, (m) => counts(m)],
  [/^[\d\w ,]*\d+ (agentes?|comandos?)[\d\w ,]*$/, (m) => counts(m)],
  [/^(\d+) guardados$/, (_m, n) => `${n} saved`],
  [/^Editar (.+)$/, (_m, n) => `Edit ${n}`],
  [/^Plan (\S+)( \S+)?$/, (m) => m],
  [/^(.*?)actualizado (\d\d:\d\d)$/, (_m, pre, t) => `${pre}updated ${t}`],
  [/^(\d+)% usado$/, (_m, n) => `${n}% used`],
  [/^(hoy|mañana|el \S+) a las (\d\d:\d\d)$/, (m) => when(m)],
  [/^Se restablece (.+) · en (.+)$/, (_m, w, s) => `Resets ${when(w)} · in ${s}`],
  [/^Ya existe en el destino: (.+)$/, (_m, n) => `Already in the destination: ${n}`],
  [/^Ya tienes un (skill|agente) llamado (.+)$/, (_m, k, n) => `You already have ${k === "skill" ? "a skill" : "an agent"} named ${n}`],
  [/^Claude respondió (\d+)\. Prueba de nuevo en un rato\.$/, (_m, c) => `Claude answered ${c}. Try again in a while.`],
  [/^(\d+) espacios?$/, (_m, n) => plural(n, "space", "spaces")],
];

export function tr(s) {
  if (LANG === "es" || typeof s !== "string") return s;
  const k = s.trim();
  if (!k || !/[A-Za-zÁ-úñ¿]/.test(k)) return s;
  const hit = EN[k];
  if (hit !== undefined) return s.replace(k, hit);
  for (const [re, fn] of PATTERNS) { const m = re.exec(k); if (m) return s.replace(k, fn(...m)); }
  return s;
}
export const t = tr;

// ---------- the page ----------
const ATTRS = ["title", "placeholder", "aria-label"];
const skip = (el) => el.closest?.('[translate="no"], .xterm, input, textarea, select option[data-raw]');
function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const p = node.parentElement;
    if (!p || skip(p)) return;
    const next = tr(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.closest?.('[translate="no"], .xterm')) return;
  for (const a of ATTRS) { const v = node.getAttribute(a); if (v) { const n = tr(v); if (n !== v) node.setAttribute(a, n); } }
  if (node.tagName === "INPUT" || node.tagName === "TEXTAREA") return;
  for (const c of node.childNodes) translateNode(c);
}
export function startTranslator() {
  if (LANG === "es") return;
  translateNode(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
      else for (const n of m.addedNodes) translateNode(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
