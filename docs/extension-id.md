# Development Extension ID

The manifest includes a development key that ensures a consistent extension ID across all development environments.

## Extension ID

**Development Extension ID:** `ilbdfopheobpiibenhmnkeiifnbfebjn`

## Benefits

- **Same ID on all developer machines** - No more random IDs when loading unpacked
- **Settings persist** - Extension storage survives reloads and reinstalls
- **Consistent debugging** - Share extension URLs with other developers
- **Cross-device development** - Same ID on laptop and desktop
- **Keyboard shortcuts work properly** - No more conflicts from Chrome sync (see below)

## Keyboard Shortcut Syncing

Without a consistent extension ID, Chrome's keyboard shortcut sync causes conflicts:

- Different IDs on different machines = different extensions to Chrome
- When laptop registers Alt+G for ID #1, it syncs to your Google account
- Desktop with ID #2 tries to use Alt+G but Chrome says "ID #1 owns that"
- Shortcuts mysteriously become unset when switching between devices
- Even reloading the extension can lose shortcuts if the ID changes

The development key ensures the same ID everywhere, preventing these conflicts. Chrome recognizes it as the same extension across all devices, so Alt+G stays registered properly.

## How It Works

The `manifest.json` includes a `"key"` field with a public RSA key. Chrome uses this key to derive a consistent extension ID instead of generating a random one.

## Chrome Web Store

This key is **automatically ignored** by the Chrome Web Store when publishing. The published extension will have a different ID assigned by Google. This means:

- Development version can coexist with store version
- No conflicts between dev and production
- Safe to commit the key to version control

## Generating a New Development Key

If you need to generate a new development key (for a fork or different project):

```bash
# Generate a new key and output just the public key in the format Chrome expects
openssl genrsa 2048 2>/dev/null | openssl rsa -pubout -outform DER 2>/dev/null | openssl base64 -A
```

This command:
1. Generates a 2048-bit RSA private key (in memory only)
2. Extracts the public key from it
3. Outputs the public key in base64 format suitable for manifest.json

Copy the output and add it to manifest.json:

```json
{
  "key": "MIIBIjANBgk...(paste the generated key here)...",
  ...
}
```

## Technical Notes

- The private key is never saved to disk and cannot be recovered
- Only the public key is needed for a consistent extension ID
- The ID is deterministically derived from the public key
- Anyone using the same manifest will get the same extension ID