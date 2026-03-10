import fs from "node:fs";
import path from "node:path";

const ROUTES_DIR = path.resolve(process.cwd(), "src/routes");

const routeDefinitionRegex = /\b\w+Router\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;
const manifestRegex =
  /\{\s*method:\s*"(GET|POST|PUT|DELETE|PATCH)"\s*,\s*path:\s*"([^"]+)"\s*,\s*public:\s*(true|false)\s*,\s*policies:\s*\[([^\]]*)\]/g;

function normalizeRouteKey(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath}`;
}

function parseRouteDefinitions(fileContent: string): Set<string> {
  const found = new Set<string>();
  for (const match of fileContent.matchAll(routeDefinitionRegex)) {
    const method = match[1];
    const routePath = match[2];
    found.add(normalizeRouteKey(method, routePath));
  }
  return found;
}

type ManifestEntry = {
  key: string;
  isPublic: boolean;
  policies: string[];
};

function parseManifest(fileContent: string): ManifestEntry[] {
  const entries: ManifestEntry[] = [];
  for (const match of fileContent.matchAll(manifestRegex)) {
    const method = match[1];
    const routePath = match[2];
    const isPublic = match[3] === "true";
    const policiesRaw = match[4].trim();

    const policies = policiesRaw
      ? policiesRaw
          .split(",")
          .map((p) => p.trim())
          .map((p) => p.replace(/^"/, "").replace(/"$/, ""))
          .filter(Boolean)
      : [];

    entries.push({
      key: normalizeRouteKey(method, routePath),
      isPublic,
      policies,
    });
  }
  return entries;
}

function main() {
  if (!fs.existsSync(ROUTES_DIR)) {
    console.error("No existe src/routes para validar policies.");
    process.exit(1);
  }

  const routeFiles = fs
    .readdirSync(ROUTES_DIR)
    .filter((file) => file.endsWith(".routes.ts"))
    .map((file) => path.join(ROUTES_DIR, file));

  const errors: string[] = [];

  for (const routeFile of routeFiles) {
    const content = fs.readFileSync(routeFile, "utf8");

    const declaredRoutes = parseRouteDefinitions(content);
    const manifestEntries = parseManifest(content);

    if (manifestEntries.length === 0) {
      errors.push(`${routeFile}: falta routePolicies o no tiene formato valido.`);
      continue;
    }

    const manifestKeys = new Set(manifestEntries.map((entry) => entry.key));

    for (const routeKey of declaredRoutes) {
      if (!manifestKeys.has(routeKey)) {
        errors.push(`${routeFile}: ruta sin metadata en routePolicies -> ${routeKey}`);
      }
    }

    for (const manifestEntry of manifestEntries) {
      if (!declaredRoutes.has(manifestEntry.key)) {
        errors.push(`${routeFile}: metadata sin ruta real -> ${manifestEntry.key}`);
      }

      if (!manifestEntry.isPublic && manifestEntry.policies.length === 0) {
        errors.push(`${routeFile}: ruta protegida sin policies -> ${manifestEntry.key}`);
      }

      if (!manifestEntry.isPublic && !manifestEntry.policies.includes("requireAuth")) {
        errors.push(`${routeFile}: ruta protegida sin requireAuth -> ${manifestEntry.key}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error("Validacion de policies fallida:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Policies validadas correctamente en ${routeFiles.length} archivo(s).`);
}

main();