import once from 'lodash-es/once';

import { Logger } from './logger';
import { Package, readPackageJson } from './package';
import { ProjectRoot } from './path';
import { exec } from './process';
import type { CommonPackageJsonContent, YarnWorkspaceItem } from './types';
import { PackageList, type PackageName } from './workspace.gen';

class CircularDependenciesError extends Error {
  constructor(public currentName: string) {
    super('Circular dependencies error');
  }
}

class ForbiddenPackageRefError extends Error {
  constructor(
    public currentName: string,
    public refName: string
  ) {
    super(
      `Public package cannot reference private package. Found '${refName}' in dependencies of '${currentName}'`
    );
  }
}

export class Workspace {
  static PackageNames: PackageName[] = PackageList.map(
    p => p.name
  ) as PackageName[];

  readonly packages: Package[];

  readonly packageJson: CommonPackageJsonContent;

  private readonly logger = new Logger('AFFiNE');

  readonly path = ProjectRoot;

  get version() {
    return this.packageJson.version;
  }

  get devDependencies() {
    return this.packageJson.devDependencies ?? {};
  }

  get dependencies() {
    return this.packageJson.dependencies ?? {};
  }

  get isTsProject() {
    return this.join('tsconfig.json').exists();
  }

  constructor(list: typeof PackageList = PackageList) {
    this.packageJson = readPackageJson(ProjectRoot);
    const packages = new Map<string, Package>();

    for (const meta of list) {
      try {
        const pkg = new Package(meta.name as PackageName, meta);
        // @ts-expect-error internal api
        pkg.workspace = this;
        packages.set(meta.location, pkg);
      } catch (e) {
        this.logger.error(e as Error);
      }
    }

    const building = new Set<string>();
    try {
      packages.forEach(pkg => this.buildDeps(pkg, packages, building));
    } catch (e) {
      if (e instanceof CircularDependenciesError) {
        const inProcessPackages = Array.from(building);
        console.log(inProcessPackages, e.currentName);
        const circle = inProcessPackages
          .slice(inProcessPackages.indexOf(e.currentName))
          .concat(e.currentName);
        this.logger.error(
          `Circular dependencies found: \n  ${circle.join(' -> ')}`
        );
        process.exit(1);
      }

      throw e;
    }

    this.packages = Array.from(packages.values());
  }

  tryGetPackage(name: PackageName) {
    return this.packages.find(p => p.name === name);
  }

  getPackage(name: PackageName) {
    const pkg = this.tryGetPackage(name);

    if (!pkg) {
      throw new Error(`Cannot find package with name '${name}'`);
    }

    return pkg;
  }

  join(...paths: string[]) {
    return this.path.join(...paths);
  }

  buildDeps(
    pkg: Package,
    packages: Map<string, Package>,
    building: Set<string>
  ) {
    if (pkg.deps.length) {
      return;
    }

    building.add(pkg.name);

    // @ts-expect-error workspace is the builder for package deps
    pkg.deps = pkg.workspaceDependencies
      .map(relativeDepPath => {
        const dep = packages.get(relativeDepPath);

        if (!dep) {
          this.logger.error(
            `Cannot find package at ${relativeDepPath}. While build dependencies of ${pkg.name}`
          );
          return null;
        }

        if (building.has(dep.name)) {
          throw new CircularDependenciesError(dep.name);
        }

        if (!pkg.packageJson.private && dep.packageJson.private) {
          throw new ForbiddenPackageRefError(pkg.name, dep.name);
        }

        this.buildDeps(dep, packages, building);
        return dep;
      })
      .filter(Boolean) as Package[];

    building.delete(pkg.name);
  }

  yarnList = once(() => {
    const output = exec('', 'yarn workspaces list -v --json', { silent: true });

    let packageList = JSON.parse(
      `[${output.trim().replace(/\r\n|\n/g, ',')}]`
    ) as YarnWorkspaceItem[];

    packageList.forEach(p => {
      p.location = p.location.replaceAll(/\\/g, '/');
      delete p['mismatchedWorkspaceDependencies'];
    });

    // ignore root package
    return packageList.filter(p => p.location !== '.');
  });

  forEach(callback: (pkg: Package) => void) {
    this.packages.forEach(callback);
  }
}

export { Package, type PackageName };
