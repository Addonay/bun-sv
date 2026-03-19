# Electrobun Release Guide

## Quick Start

### Development Build
```bash
bun run build:canary
```

### Production Release
```bash
bun run build:stable
```

## Build Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `bun run build:canary` | Development build | `artifacts/canary-*` |
| `bun run build:stable` | Production release | `artifacts/stable-*` |
| `bun run build:beta` | Beta release | `artifacts/beta-*` |
| `bun run build:win` | Windows only | `artifacts/stable-win-*` |
| `bun run build:mac` | macOS only | `artifacts/stable-mac-*` |
| `bun run build:linux` | Linux only | `artifacts/stable-linux-*` |
| `bun run build:all` | All platforms | `artifacts/stable-*` |

## Release Process

### 1. Prepare for Release
```bash
# Update version in electrobun.config.ts
# Update version in package.json

# Run quality checks
bun run check
```

### 2. Build for All Platforms
```bash
# Build for current platform
bun run build:stable

# Or build for all platforms (requires CI/CD setup)
bun run build:all
```

### 3. Test the Build
```bash
# Test the built application
./artifacts/stable-win-x64-svelte-app-stable.exe  # Windows
./artifacts/stable-macos-arm64-svelte-app-stable.app  # macOS
./artifacts/stable-linux-x64-svelte-app-stable  # Linux
```

## Artifacts Location

Built applications are created in the `artifacts/` directory:

### Windows
- `stable-win-x64-svelte-app-Setup-stable.zip` - Installer
- `stable-win-x64-svelte-app-stable.tar.zst` - Portable app

### macOS
- `stable-macos-arm64-svelte-app-stable.dmg` - Disk image
- `stable-macos-arm64-svelte-app-stable.app.tar.zst` - App bundle

### Linux
- `stable-linux-x64-svelte-appSetup-stable.tar.gz` - Installer
- `stable-linux-x64-svelte-app-stable.tar.zst` - App bundle

## Code Signing (Optional)

### Windows
1. Get a code signing certificate from a CA (DigiCert, Sectigo, etc.)
2. Add to `electrobun.config.ts`:
```typescript
win: {
  bundleCEF: false,
  codeSign: {
    certificateFile: "./path/to/certificate.p12",
    certificatePassword: "your-password",
  },
},
```

### macOS
1. Enroll in Apple Developer Program
2. Add to `electrobun.config.ts`:
```typescript
mac: {
  bundleCEF: false,
  codeSign: {
    identity: "Developer ID Application: Your Name",
    teamId: "YOUR_TEAM_ID",
  },
  notarize: {
    appleId: "your.apple.id@example.com",
    teamId: "YOUR_TEAM_ID",
    password: "@keychain:AC_PASSWORD",
  },
},
```

## Distribution

### GitHub Releases
1. Create a new release on GitHub
2. Upload artifacts from the `artifacts/` directory
3. Update update URLs in `electrobun.config.ts`

### Auto-updates
Configure the update URL in `electrobun.config.ts`:
```typescript
update: {
  url: "https://your-domain.com/updates",
  checkInterval: 24,
},
```

## CI/CD Setup

### GitHub Actions Example
```yaml
name: Build and Release
on:
  push:
    tags:
      - 'v*'
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run build:stable
      - uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: artifacts/
```

## Version Management

Update versions in both files:
- `package.json` - `"version": "1.0.0"`
- `electrobun.config.ts` - `version: "1.0.0"`

## Troubleshooting

### Build Fails
- Check all dependencies are installed: `bun install`
- Verify TypeScript compilation: `svelte-check`
- Check file permissions on output directory

### Large Bundle Size
- Ensure `bundleCEF: false` if not using CEF
- Check for unnecessary dependencies in `src/bun/index.ts`
- Use `external` in build config for large native modules

### Code Signing Issues
- Verify certificate paths and passwords
- Ensure certificate is valid and not expired
- Check code signing identity is correctly configured
