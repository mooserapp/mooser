<p align="center">
  <img src="assets/icon.png" width="112" alt="Mooser">
</p>

<h1 align="center">Mooser</h1>

<p align="center">
  Un hogar tranquilo para tus terminales y tus agentes de IA.<br>
  Espacios por proyecto, pestañas, paneles divididos, el estado de cada agente<br>
  y paneles para tus skills, archivos, servidores SSH y el uso de tu plan de Claude.
</p>

<p align="center"><b>Windows</b> · <b>macOS</b> · Licencia MIT</p>

---

## Qué es

Mooser es una app de escritorio para trabajar con varios agentes de código a la vez (Claude Code, Codex, Gemini CLI, Aider, OpenCode…) sin perderte entre ventanas de terminal.

- **Espacios**: cada carpeta de proyecto es un espacio con sus pestañas. Cambias de proyecto con un clic o con `Alt+1…9`.
- **Pestañas y paneles**: divide cualquier panel a la derecha o hacia abajo, cambia el tamaño arrastrando los tres puntos y amplía uno con un atajo.
- **Agentes con estado**: Mooser reconoce cuando corre un agente y muestra si está *trabajando*, si *te necesita* (te pide confirmar algo) o si *terminó*. Te avisa con un sonido suave y una notificación cuando estás en otra cosa.
- **Kit de IA**: los skills, agentes, servidores MCP, plugins y el modelo por defecto de Claude Code en un solo lugar. Crea, edita, activa o desactiva tus skills y agentes; enciende o apaga plugins; añade o quita MCP; elige el modelo.
- **Explorador**: navega carpetas, abre archivos, abre una carpeta como espacio, crea, renombra, mueve, copia o envía a la papelera. Los iconos tienen color según el tipo de archivo.
- **Servidores**: guarda tus servidores SSH por grupos de color, conéctate en una pestaña con la contraseña guardada (cifrada) y pasa archivos entre tu equipo y tus servidores, o de un servidor a otro.
- **Uso de IA**: cuánto llevas usado de la sesión de 5 horas y de la semana de tu plan de Claude, con una cuenta atrás hasta que se restablece y un aviso opcional.
- **Paleta de comandos** (`Ctrl+Shift+P` / `⌘⇧P`) para hacerlo todo con el teclado.

## Instalar

### Desde el código (Windows y macOS)

Necesitas [Node.js](https://nodejs.org) 20 o más reciente y Git.

```sh
git clone <url-de-este-repositorio> mooser
cd mooser
npm install
npm start
```

`npm install` descarga Electron y las terminales nativas ([node-pty](https://github.com/microsoft/node-pty), que ya trae binarios para Windows y macOS: no hace falta compilar nada).

### Crear el instalador

```sh
npm run dist:win   # en Windows: dist/Mooser Setup x.y.z.exe
npm run dist:mac   # en un Mac:  dist/Mooser-x.y.z.dmg
```

Cada instalador se crea en su propio sistema: el de macOS hay que generarlo en un Mac. El de macOS no va firmado; la primera vez ábrelo con clic derecho y **Abrir**.

### Requisitos opcionales

| Para | Necesitas |
|---|---|
| Kit de IA | [Claude Code](https://docs.claude.com/claude-code) instalado (`claude` en el PATH o en `~/.local/bin`) |
| Uso de IA | Haber iniciado sesión en Claude Code en este equipo |
| Servidores con contraseña guardada en Windows | [Git for Windows](https://git-scm.com/download/win) (su `ssh` acepta la contraseña sin teclearla). Sin él, ssh te la pide en la terminal |
| Editar skills y agentes | VS Code (`code`) o cualquier editor por defecto del sistema |

## Usar

1. Pulsa **Abrir carpeta** y elige un proyecto: se crea un espacio con una terminal en esa carpeta.
2. Pulsa **+** en la barra de pestañas para abrir otra terminal o arrancar directamente Claude Code, Codex o Gemini.
3. Divide paneles desde la cabecera de cada uno o con los atajos. Arrastra los tres puntos entre paneles para cambiar el tamaño.
4. Abre el panel lateral (botón de la derecha en la barra de pestañas) para el Kit de IA, el Explorador, los Servidores o el Uso de IA.

Al cerrar Mooser se guardan tus espacios, pestañas y divisiones. Al abrirlo de nuevo, cada terminal vuelve a empezar en su carpeta.

### Atajos

| Acción | Windows | macOS |
|---|---|---|
| Paleta de comandos | `Ctrl+Shift+P` | `⌘⇧P` |
| Nuevo espacio | `Ctrl+Shift+N` | `⌘⇧N` |
| Nueva pestaña | `Ctrl+Shift+T` | `⌘T` |
| Dividir a la derecha | `Ctrl+Shift+D` | `⌘D` |
| Dividir hacia abajo | `Ctrl+Shift+E` | `⌘⇧D` |
| Cerrar panel | `Ctrl+Shift+W` | `⌘W` |
| Ampliar panel | `Ctrl+Shift+Z` | `⌘⇧Enter` |
| Panel lateral | `Ctrl+Shift+J` | `⌘J` |
| Plegar barra lateral | `Ctrl+Shift+B` | `⌘B` |
| Ir al espacio 1…9 | `Alt+1…9` | `⌥1…9` |
| Pestaña siguiente / anterior | `Ctrl+Tab` / `Ctrl+Shift+Tab` | igual |
| Moverse entre paneles | `Alt+flechas` | `⌥+flechas` |
| Copiar / pegar | `Ctrl+Shift+C` / `Ctrl+Shift+V` | `⌘C` / `⌘V` |
| Texto más grande / pequeño | `Ctrl+=` / `Ctrl+-` | `⌘+` / `⌘-` |

`Ctrl` sin `Shift` llega siempre al programa de la terminal (Ctrl+C, Ctrl+R…).

## Privacidad y seguridad

- **Contraseñas de servidores**: se guardan solo cifradas con el almacén seguro del sistema (DPAPI en Windows, el Llavero en macOS) mediante `safeStorage` de Electron. Cuando ssh pide la contraseña, un pequeño ayudante se la pide a Mooser por un canal local con un código de un solo uso; nunca queda en un archivo ni en una variable de entorno en claro.
- **Uso de Claude**: Mooser lee la sesión que Claude Code ya guarda en tu equipo y la envía solo a `api.anthropic.com` para consultar tu uso. No la guarda ni la renueva.
- **Kit de IA**: cambia solo la configuración de Claude Code en `~/.claude` (o a través de su propia CLI). Desactivar un skill o agente tuyo lo mueve a `~/.claude/skills-off` o `~/.claude/agents-off`; activarlo lo devuelve.
- Sin telemetría. Mooser no envía nada a ningún otro sitio.

## Cómo está hecho

| Parte | Dónde |
|---|---|
| Ventana, IPC | `src/main/main.js`, `src/main/preload.js` |
| Terminales y detección de agentes | `src/main/terminals.js` (node-pty) |
| Kit de IA | `src/main/kit.js` |
| Archivos | `src/main/files.js` |
| SSH y ayudante de contraseñas | `src/main/ssh.js` |
| Uso de Claude | `src/main/usage.js` |
| Interfaz | `src/renderer/` (HTML, CSS y JavaScript sin framework; [xterm.js](https://xtermjs.org) para las terminales) |
| Iconos de la app | `npm run icons` genera `build/icon.ico`, `build/icon.icns` y `assets/icon.png` desde `assets/logo.svg` |

El estado de un agente se deduce de lo que hace su terminal: el título que pone el programa, el comando que escribiste, si sigue imprimiendo (trabajando), si hace sonar la campana o hace una pregunta conocida (te necesita) o si se quedó quieto mientras mirabas otra cosa (terminó).

## Diferencias con otras herramientas

Mooser es un proyecto propio, escrito desde cero, inspirado en la idea de multiplexores de agentes como [Herdr](https://herdr.dev). No usa su código. A diferencia de herramientas con un servidor aparte, en Mooser las terminales viven mientras la app está abierta: al cerrarla terminan, y al abrirla vuelven a empezar en su carpeta.

## Licencia

[MIT](LICENSE)
