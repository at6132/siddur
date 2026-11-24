import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !path.extname(specifier) &&
    context.parentURL
  ) {
    let parentPath = new URL(context.parentURL).pathname;
    if (/^\/[A-Za-z]:/.test(parentPath)) parentPath = parentPath.slice(1);
    const parentDir = path.dirname(decodeURIComponent(parentPath));
    for (const ext of ['.ts', '.tsx', '.js', '.mjs']) {
      const candidate = path.resolve(parentDir, specifier + ext);
      if (fs.existsSync(candidate)) {
        return {
          shortCircuit: true,
          url: pathToFileURL(candidate).href,
          format: ext === '.ts' || ext === '.tsx' ? 'module' : undefined,
        };
      }
    }
  }
  return nextResolve(specifier, context);
}
