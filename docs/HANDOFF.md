# Seguir desarrollando Mooser (traspaso)

Este archivo resume el estado del proyecto para retomarlo en otro equipo o con una sesión nueva de Claude Code. Al empezar una sesión, pídele: *"Lee docs/HANDOFF.md y AGENTS.md y continúa con lo pendiente"*.

## Empezar en el Mac

```sh
gh repo clone davechbga/mooser
cd mooser
npm ci          # instala y deja ejecutable el spawn-helper de node-pty
npm run dev     # la app con DevTools; al guardar algo en src/renderer la ventana se recarga
claude          # Claude Code, dentro de la carpeta del repo
```

Configura el autor de los commits en este clon (ver "Reglas del proyecto"):

```sh
git config user.name "David Chiriboga"
git config user.email "77027228+davechbga@users.noreply.github.com"
```

## Estado (versión 0.1.0)

Hecho y comprobado en Windows con capturas:
- Espacios, pestañas, paneles divididos con agarres de 3 puntos, barra lateral plegable con animación, paleta de comandos y atajos.
- Detección de agentes (trabajando, te necesita, terminó) con avisos de sonido y notificación.
- Panel lateral: Kit de IA (Claude Code), Explorador, Servidores SSH, Uso de IA.
- Configuración: idioma, cinco temas, acento, fondo, cristal, tamaños, terminal, avisos y agentes del botón +.
- Idiomas español e inglés (`src/renderer/js/i18n.js`).
- Carpeta `~/.mooser` (settings.json, custom.css, plugins) aplicada en vivo; las terminales sobreviven a una recarga de la ventana.
- Instalador de Windows (`npm run dist:win`), en español e inglés.

Sin comprobar todavía:
- **macOS en general**: terminales con zsh, botones de ventana (semáforo), atajos con ⌘, notificaciones, Llavero para las contraseñas SSH, uso de Claude leído del Llavero.
- **Servidores SSH contra un servidor real** (conexión con contraseña guardada y transferencia de archivos).
- **Botones del Kit de IA que usan la CLI de Claude**: encender, apagar, actualizar y desinstalar plugins; añadir y quitar MCP.
- **El flujo de GitHub Actions** (`.github/workflows/release.yml`).

## Pendiente

1. **Probar la app en el Mac** (`npm run dev`) y arreglar lo que falle, en especial lo de la lista anterior.
2. **Capturas de macOS**: `npm run screenshots` crea `docs/images/macos/*.png`. Añade en `README.md` y en `README.en.md` una sección "macOS" en "Capturas" / "Screenshots", igual que la de Windows.
3. **Instalador de macOS**: `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac` (sin firmar) o con las variables de Apple (firmado y notarizado; ver `docs/BUILD.md`). Prueba el `.dmg`.
4. **Publicar la versión 0.1.0**: en GitHub ya existe un **borrador de Release `v0.1.0`** con el instalador de Windows. Añade los de macOS y publícalo:
   ```sh
   gh release upload v0.1.0 dist/*.dmg dist/*.zip --clobber
   gh release edit v0.1.0 --draft=false
   ```
   Para versiones siguientes: sube `version` en `package.json`, crea el tag (`git tag v0.2.0 && git push --tags`) y el flujo de GitHub construye ambos instaladores.

## Reglas del proyecto (preferencias de David)

- **Commits**: autor `David Chiriboga <77027228+davechbga@users.noreply.github.com>`. **Sin** líneas `Co-Authored-By` ni ninguna atribución a Claude o a una IA, en commits, PRs, releases o documentación.
- **Repositorio privado** por ahora (`davechbga/mooser`).
- **Interfaz**: el texto se escribe en español en el código; cada texto nuevo lleva su traducción en `src/renderer/js/i18n.js` (en `EN` si es fijo, en `PATTERNS` si lleva números o nombres). El contenido del usuario (archivos, espacios, servidores, skills) va en elementos con `translate="no"`.
- **Nada de "Personalizar con Claude" en la interfaz ni en el README**. La personalización por archivos en `~/.mooser` y el skill `mooser` de Claude Code siguen funcionando sin mencionarse: el skill se instala y actualiza solo al arrancar si existe `~/.claude`, y no aparece en las listas ni en los contadores del Kit de IA.
- **Kit de IA**: sin interruptores en las filas de skills y agentes; solo "Activar" para los desactivados.
- **Estilo**: tema Cáustica (cristal azul profundo, acento `#a9b8ff`), animaciones suaves, iconos de una línea, nada genérico ni recargado.

## Dónde está cada cosa

Ver la tabla de `AGENTS.md`. Para revisar cambios de interfaz sin tocarla a mano: `npm run screenshots`, o `MOOSER_SHOT=<archivo.png> MOOSER_QUIT=1 npx electron .` (con `MOOSER_JS="..."` para hacer clics antes de la captura y `MOOSER_USER_DATA` / `MOOSER_HOME` para usar carpetas de prueba).
