// Run with: node download-electron.mjs
import { downloadArtifact } from '@electron/get'
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const electronPkg = require('./node_modules/electron/package.json')
const version = electronPkg.version

console.log(`Downloading Electron v${version} for win32-x64...`)

try {
  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: 'win32',
    arch: 'x64',
  })

  console.log(`Downloaded to: ${zipPath}`)

  // Extract the zip
  const { default: extract } = await import('extract-zip')
  const distPath = join(__dirname, 'node_modules', 'electron', 'dist')
  if (!existsSync(distPath)) mkdirSync(distPath, { recursive: true })

  await extract(zipPath, { dir: distPath })

  // Write path.txt
  writeFileSync(
    join(__dirname, 'node_modules', 'electron', 'path.txt'),
    'dist/electron.exe'
  )

  console.log('✓ Electron installed successfully!')
  console.log('Now run: npm run dev')
} catch (err) {
  console.error('Download failed:', err.message)
  console.log('\nAlternative: Run this command to install the binary directly:')
  console.log('  cd node_modules/electron && node install.js')
}
