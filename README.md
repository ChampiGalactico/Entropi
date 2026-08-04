# Vida

Aplicación de organización personal construida con Tauri, React y TypeScript.

## Desarrollo con recarga automática

Desde PowerShell, en la carpeta del proyecto:

```powershell
cd C:\Projects\life-planner
npm install
npm run tauri dev
```

Tauri abrirá la aplicación de escritorio. Los cambios en `src/` se actualizan automáticamente;
los cambios en Rust o en la configuración de Tauri pueden requerir una recompilación automática
un poco más lenta. Mantén esa terminal abierta mientras trabajas.

Para probar solamente la interfaz en el navegador, sin SQLite ni APIs nativas:

```powershell
npm run dev
```

Abre `http://localhost:1420`. Para probar operaciones reales de la base de datos usa siempre
`npm run tauri dev`.

La primera ejecución requiere Node.js LTS, Rust y las dependencias de compilación de Tauri para
Windows. Después de instalarlas, `npm install` solo es necesario cuando cambian las dependencias.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
