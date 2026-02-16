const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the entire monorepo so changes in packages/ are picked up
config.watchFolders = [monorepoRoot];

// Tell Metro where to look for node_modules (mobile first, then root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Prevent Metro from walking up the tree and finding root's React 18
config.resolver.disableHierarchicalLookup = true;

// Map every package from both node_modules directories.
// Mobile takes priority (React 19, RN 0.81) over root (React 18).
function scanNodeModules(dir) {
  const modules = {};
  if (!fs.existsSync(dir)) return modules;
  for (const entry of fs.readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const fullPath = path.join(dir, entry);
    if (entry.startsWith("@")) {
      if (fs.statSync(fullPath).isDirectory()) {
        for (const scoped of fs.readdirSync(fullPath)) {
          modules[`${entry}/${scoped}`] = path.join(fullPath, scoped);
        }
      }
    } else {
      modules[entry] = fullPath;
    }
  }
  return modules;
}

const rootModules = scanNodeModules(path.resolve(monorepoRoot, "node_modules"));
const mobileModules = scanNodeModules(path.resolve(projectRoot, "node_modules"));

// Root first, then mobile overrides — so mobile's React 19 wins
config.resolver.extraNodeModules = new Proxy(
  { ...rootModules, ...mobileModules },
  {
    get: (target, name) => {
      if (typeof name !== "string") return target[name];
      if (name in target) return target[name];
      // Fallback: try to find in mobile node_modules, then root
      const mobilePath = path.join(projectRoot, "node_modules", name);
      if (fs.existsSync(mobilePath)) return mobilePath;
      const rootPath = path.join(monorepoRoot, "node_modules", name);
      if (fs.existsSync(rootPath)) return rootPath;
      return undefined;
    },
  }
);

module.exports = withNativeWind(config, { input: "./global.css" });
