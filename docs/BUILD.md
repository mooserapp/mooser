# Crear los instaladores

Mooser se empaqueta con [electron-builder](https://www.electron.build). Cada instalador se crea en su propio sistema (el de macOS en un Mac), o en GitHub Actions para los dos a la vez.

| Sistema | Comando | Resultado en `dist/` |
|---|---|---|
| Windows | `npm run dist:win` | `Mooser-Setup-x.y.z-x64.exe` (instalador en español e inglés) |
| macOS | `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac` | `Mooser-x.y.z-mac-arm64.dmg`, `Mooser-x.y.z-mac-x64.dmg` y sus `.zip` |

Antes de cada versión, sube el número en `package.json` (`"version": "0.2.0"`).

## En macOS

### 1. Prepara el Mac (una sola vez)

Instala las herramientas de línea de comandos de Xcode (`xcode-select --install`) y Node.js 20 o más reciente ([nodejs.org](https://nodejs.org) o `brew install node`).

### 2. Descarga el código y pruébalo

```sh
git clone https://github.com/davechbga/mooser.git
cd mooser
npm ci
npm start
```

### 3. Genera los instaladores

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac
```

`CSC_IDENTITY_AUTO_DISCOVERY=false` evita que electron-builder firme con el primer certificado que encuentre en tu Llavero (un certificado "Apple Development" no sirve para repartir la app). Sin certificado, `scripts/after-pack.cjs` firma la app *ad hoc*: sin esa firma, un Mac con Apple Silicon diría que "Mooser está dañado". Tarda unos minutos. En `dist/` quedan:

- `Mooser-x.y.z-mac-arm64.dmg`: para Macs con Apple Silicon (M1, M2, M3, M4…).
- `Mooser-x.y.z-mac-x64.dmg`: para Macs con Intel.
- Los mismos en `.zip`, útiles para actualizaciones.

Ábrelos para probar la instalación: arrastra Mooser a **Aplicaciones**.

### 4. Firma y notarización (opcional, recomendado para publicar)

Sin firmar con Developer ID, macOS avisa al abrir la app y quien la descargue tiene que abrirla desde **Ajustes del Sistema, Privacidad y seguridad, Abrir igualmente**, o usar `xattr -dr com.apple.quarantine /Applications/Mooser.app`. Para que se abra sin avisos necesitas una cuenta de [Apple Developer](https://developer.apple.com/programs/) (99 USD al año):

1. En Xcode, en **Settings, Accounts, Manage Certificates**, crea un certificado **Developer ID Application**. Queda en tu Llavero.
2. Crea una contraseña de app para tu Apple ID en [appleid.apple.com](https://appleid.apple.com), en **Inicio de sesión y seguridad, Contraseñas de app**.
3. Busca tu **Team ID** en [developer.apple.com/account](https://developer.apple.com/account), en **Membership**.
4. Genera los instaladores con esas credenciales:
   ```sh
   export APPLE_ID="tu@correo.com"
   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
   export APPLE_TEAM_ID="ABCDE12345"
   npm run dist:mac
   ```
   electron-builder firma con el certificado del Llavero y envía la app a Apple para notarizarla. Los permisos que necesitan Electron y las terminales ya están en `build/entitlements.mac.plist`.

## En Windows

```powershell
npm ci
npm run dist:win
```

Para firmar el instalador (y que SmartScreen no avise) hace falta un certificado de firma de código. Con un archivo `.pfx`, define `CSC_LINK` (su ruta) y `CSC_KEY_PASSWORD` antes de `npm run dist:win`.

## En GitHub, los dos a la vez

El flujo `.github/workflows/release.yml` construye los instaladores de Windows y macOS en máquinas de GitHub y los adjunta a un **borrador de Release**:

```sh
# después de subir la versión en package.json y hacer commit
git tag v0.2.0
git push origin main --tags
```

O desde la pestaña **Actions**, en **Release**, con **Run workflow**. Cuando termine, revisa el borrador en **Releases**, edita las notas y pulsa **Publish**.

Para firmar y notarizar macOS en GitHub, añade estos secretos en **Settings, Secrets and variables, Actions**:

| Secreto | Qué es |
|---|---|
| `MAC_CERT_P12_BASE64` | tu certificado Developer ID exportado del Llavero como `.p12`, en base64 (`base64 -i cert.p12 \| pbcopy`) |
| `MAC_CERT_PASSWORD` | la contraseña con que exportaste el `.p12` |
| `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | como en el paso 4 de arriba |

## Si las terminales no arrancan en macOS

`posix_spawnp failed` significa que macOS no puede ejecutar `spawn-helper`, el programa de node-pty que lanza cada terminal (node-pty 1.1.0 lo publica sin permiso de ejecución). `npm install`/`npm ci` lo corrigen solos (`scripts/fix-pty.cjs`) y el empaquetado también (`scripts/after-pack.cjs`). Si lo ves, vuelve a instalar las dependencias:

```sh
rm -rf node_modules && npm ci
```

## Iconos

Si cambias `assets/logo.svg`, vuelve a generar los iconos:

```sh
npm run icons
```

Crea `build/icon.ico` (Windows), `build/icon.icns` (macOS), `build/icon.png` y `assets/icon.png`.
