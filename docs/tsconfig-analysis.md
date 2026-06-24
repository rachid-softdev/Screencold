# Analyse de la configuration TypeScript — Screencold

> Généré le 24 juin 2026 — Audit basé sur les fichiers `tsconfig.json` du monorepo.

---

## Architecture des fichiers `tsconfig.json`

| Fichier | Étend la base | Strict | Rôle |
|---|---|---|---|
| `tsconfig.base.json` | — | `true` | Base partagée (packages, UI) |
| `screencold-web/tsconfig.json` | Non | `true` | Next.js (web) |
| `screencold-worker/tsconfig.json` | **Non** | **`false`** | Worker/API (Node.js) |
| `screencold-ui/tsconfig.json` | Oui | Hérité de base | Composants UI |
| `packages/db/tsconfig.json` | Oui | Hérité de base | ORM / base de données |
| `packages/types/tsconfig.json` | Oui | Hérité de base | Types partagés |

---

## Analyse détaillée de chaque option

### `strict` (Racine du mode strict)

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** ✅ |
| `screencold-web` | **Activé** ✅ |
| `screencold-worker` | **Désactivé ❌** |
| `screencold-ui` | Hérité (activé) ✅ |
| `packages/db` | Hérité (activé) ✅ |
| `packages/types` | Hérité (activé) ✅ |

**Ce qu'elle change** : Active le jeu complet de vérifications de sûreté TypeScript. Sans elle, le compilateur tolère des pratiques non sûres.

**Risque si désactivée** : Toutes les options de robustesse ci-dessous sont désactivées (sauf si listées explicitement). Le code devient permissif, les bugs de typage passent en production.

**Recommandation** : Essentielle pour toute application production.

---

### `noImplicitAny`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Interdit les types `any` implicites (paramètres de fonction non typés, variables déclarées sans type inféré).

**Risque si désactivée** : Un paramètre de fonction oublié devient `any` — aucune vérification de type n'est appliquée. Les appels peuvent passer n'importe quelle valeur sans erreur.

**Exemple de bug évité** :
```ts
// Sans noImplicitAny, ceci compile sans erreur
function multiply(a, b) {
  return a * b; // a et b sont implicitement any
}
multiply("hello", {}); // ✅ NaN silencieux en production

// Avec noImplicitAny, erreur : parameter 'a' implicitly has an 'any' type
```

---

### `strictNullChecks`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : `null` et `undefined` ne sont plus assignables à tous les types. Une variable de type `string` ne peut pas contenir `null` sans déclaration explicite (`string | null`).

**Risque si désactivée** : La cause #1 de plantage en production JavaScript : `Cannot read properties of null/undefined`.

**Exemple de bug évité** :
```ts
// Sans strictNullChecks, ceci compile
function getLength(s: string) {
  return s.length;
}
getLength(null); // 💥 Cannot read properties of null

// Avec strictNullChecks, erreur : Argument of type 'null' is not assignable to parameter of type 'string'
```

---

### `strictFunctionTypes`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Vérifie la contravariance des paramètres de fonction. Sans elle, les types de fonctions sont bivariants (trop permissifs).

**Risque si désactivée** : Permet de passer un callback qui écrase des données sans erreur de compilation.

**Exemple de bug évité** :
```ts
type AnimalFn = (animal: Animal) => void;
type DogFn = (dog: Dog) => void; // Dog extends Animal

const fn: AnimalFn = (dog: Dog) => {
  dog.woof(); // Suppose que c'est un chien, mais l'appelant peut passer un Animal sans woof()
};
```

---

### `strictBindCallApply`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Vérifie les types des arguments passés à `.bind()`, `.call()`, `.apply()`.

**Risque si désactivée** : Les trois méthodes sont typées comme `any`, permettant d'appeler des fonctions avec des arguments de type incorrect.

**Exemple de bug évité** :
```ts
function greet(name: string, age: number) {
  return `${name} is ${age}`;
}
greet.call(null, 42, "hello"); // ✅ compile sans erreur si désactivé, provoque un bug silencieux
```

---

### `strictPropertyInitialization`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Les propriétés de classe déclarées sans valeur par défaut ou sans initialisation dans le constructeur génèrent une erreur (sauf si optionnelles `?` ou `undefined`).

**Risque si désactivée** : Accès à des propriétés non initialisées → `undefined` en runtime.

**Exemple de bug évité** :
```ts
class User {
  name: string; // Pas initialisé
}
const u = new User();
console.log(u.name.length); // 💥 Cannot read properties of undefined
```

---

### `noImplicitThis`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) |
| `screencold-web` | Activé via `strict: true` |
| `screencold-worker` | **Hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Lève une erreur quand `this` est utilisé dans un contexte où son type ne peut pas être inféré.

**Risque si désactivée** : Accès à `this` non typé dans des callbacks ou des fonctions standalone, menant à des bugs de contexte difficiles à tracer.

**Exemple de bug évité** :
```ts
function log() {
  console.log(this.name); // 'this' implicitly has type 'any'
}
```

---

### `alwaysStrict`

| Projet | État |
|---|---|
| `tsconfig.base.json` | Hérité de `strict: true` → **Activé** ✅ |
| `screencold-web` | Activé via `strict: true` ✅ |
| `screencold-worker` | **Non défini → hérité de `strict: false` → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité via `strict: true`) |

**Ce qu'elle change** : Émet `"use strict"` pour tous les fichiers JS générés et interdit certaines constructions dangereuses (variables non déclarées, `with`, `arguments.callee`, etc.).

**Risque si désactivée** : Silent errors, affectation à des variables globales par accident, comportements JavaScript dangereux autorisés.

---

### `useUnknownInCatchVariables`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Non défini → désactivé ❌** |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| `screencold-ui` | Non défini → désactivé ❌ |
| `packages/db` | Non défini → désactivé ❌ |
| `packages/types` | Non défini → désactivé ❌ |

**Ce qu'elle change** : La variable catch passe de `any` à `unknown`, forçant un traitement explicite avant utilisation.

**Risque si désactivée** : Accès aveugle à `error.message` sans vérification que c'est un objet Error, menant à des erreurs secondaires dans les blocs catch.

**Exemple de bug évité** :
```ts
try {
  JSON.parse("invalid");
} catch (e) {
  console.log(e.message); // ✅ sans l'option : risque si JSON.parse lance autre chose qu'Error
  // Avec l'option : erreur → 'e' is of type 'unknown'
  // Solution : if (e instanceof Error) ...
}
```

---

### `exactOptionalPropertyTypes`

| Projet | État |
|---|---|
| **Tous les projets** | **Désactivé** (`false` explicite dans la base) ❌ |

**Ce qu'elle change** : Quand une propriété est optionnelle (`prop?: string`), `undefined` peut être assigné mais `prop: undefined` explicite est interdit. L'absence et la présence explicite de `undefined` deviennent distinctes.

**Risque si désactivée** : Les propriétés marquées `?` acceptent à la fois l'absence et `undefined` comme valeur explicite. Cela peut masquer des bugs où une propriété est intentionnellement définie à `undefined` puis lue comme "non définie".

**Exemple de bug évité** :
```ts
interface Config {
  theme?: string;
}
const c: Config = { theme: undefined }; // ✅ compile si désactivé
// Avec exactOptionalPropertyTypes : erreur
// Empêche de confondre "pas défini" et "défini à undefined"
```

**Note** : Option difficile à adopter sur un codebase existant. Nécessite `Exact<Type>` utilitaires et adaptations. Recommandée pour les nouveaux projets uniquement.

---

### `noUncheckedIndexedAccess`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Non défini → désactivé ❌** |
| `screencold-worker` | **Non défini → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité) |

**Ce qu'elle change** : Toute propriété accédée via un index de tableau (`arr[0]`) ou signature d'index (`obj[key]`) retourne `T | undefined` au lieu de `T`.

**Risque si désactivée** : Accès à des éléments de tableau hors limites ou des propriétés d'objet inexistantes sans vérification.

**Exemple de bug évité** :
```ts
const arr: string[] = ["a", "b"];
const first = arr[0]; // string | undefined avec l'option, string sans
first.toUpperCase(); // 💥 si arr est vide, runtime crash
```

---

### `noImplicitOverride`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| `screencold-ui` | Hérité ✅ |
| `packages/db` | Hérité ✅ |
| `packages/types` | Hérité ✅ |

**Ce qu'elle change** : Exige le mot-clé `override` quand une méthode de classe en remplace une autre.

**Risque si désactivée** : Renommer ou supprimer une méthode parente ne déclenche pas d'erreur sur la méthode "override" orpheline dans la classe enfant.

**Exemple de bug évité** :
```ts
class Base {
  save() { /* ... */ }
}
class Child extends Base {
  // Sans noImplicitOverride, on peut écrire "sav" au lieu de "save"
  // → la méthode parente n'est jamais appelée
  sav() { /* override mal orthographié, jamais appelé */ }
}
```

---

### `noPropertyAccessFromIndexSignature`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Non défini → désactivé ❌** |
| `screencold-worker` | **Non défini → désactivé ❌** |
| `screencold-ui` | Hérité ✅ |
| `packages/db` | Hérité ✅ |
| `packages/types` | Hérité ✅ |

**Ce qu'elle change** : L'accès par point (`obj.prop`) sur un type avec signature d'index est interdit. Seul l'accès par crochet (`obj["prop"]`) est autorisé.

**Risque si désactivée** : Accès à des propriétés qui n'existent pas dans le type avec la syntaxe point, accepté à tort.

**Exemple de bug évité** :
```ts
interface Dict {
  [key: string]: string;
}
const d: Dict = {};
// Sans l'option : les deux sont autorisés
d.foo;       // ✅ erreur subtile : "foo" n'est pas déclaré dans le type
d["foo"];    // ✅ correct
// Avec l'option : d.foo → erreur
```

---

### `allowUnusedLabels`

| Projet | État |
|---|---|
| **Tous** | **Non défini → `false` par défaut ✅** |

**Ce qu'elle change** : `false` par défaut dans TypeScript, interdit les labels (`label:`) inutilisés.

**Risque si activée** : Code mort avec labels inutiles non signalé. Peu probable d'être activé.

**Recommandation** : Laisser à `false` (par défaut).

---

### `allowUnreachableCode`

| Projet | État |
|---|---|
| **Tous** | **Non défini → `undefined` par défaut (avertissement ⚠️)** |

**Ce qu'elle change** : Par défaut, TypeScript émet un avertissement (pas une erreur) pour le code inaccessible après `return`, `throw`, etc.

**Risque** : Code mort potentiel ignoré.

**Recommandation** : Mettre à `false` explicitement pour que le code inaccessible soit une erreur.

---

### `noFallthroughCasesInSwitch`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité) |

**Ce qu'elle change** : Interdit les `case` qui tombent dans le suivant sans `break` ou `return`.

**Risque si désactivée** : Oubli de `break` dans un switch → exécution de multiples blocs, bugs subtils.

**Exemple de bug évité** :
```ts
switch (status) {
  case "active":
    doSomething();
    // Oubli du break → exécute aussi le code de "inactive"
  case "inactive":
    doSomethingElse();
}
```

---

### `noImplicitReturns`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité) |

**Ce qu'elle change** : Tous les chemins d'une fonction doivent retourner une valeur explicitement si le type de retour n'est pas `void`.

**Risque si désactivée** : Fonction déclarée retournant `string` qui oublie de retourner dans un chemin → `undefined` en runtime.

**Exemple de bug évité** :
```ts
function getPrice(hasDiscount: boolean): number {
  if (hasDiscount) {
    return 10;
  }
  // Pas de return ici → retourne undefined, mais le type promet number
}
```

---

### `noUnusedLocals`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité) |

**Ce qu'elle change** : Erreur sur les variables locales déclarées mais jamais utilisées.

**Risque si désactivée** : Code mort, refactoring incomplet, variables fantômes.

---

### `noUnusedParameters`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Non défini → désactivé ❌** |
| Autres (base) | Activé ✅ (hérité) |

**Ce qu'elle change** : Erreur sur les paramètres de fonction déclarés mais jamais utilisés.

**Risque si désactivée** : Paramètres passés mais ignorés sans intention claire.

---

### `isolatedModules`

| Projet | État |
|---|---|
| `tsconfig.base.json` | **Activé** (`true`, explicit) ✅ |
| `screencold-web` | **Activé** (`true`, explicit) ✅ |
| `screencold-worker` | **Activé** (`true`, explicit) ✅ |
| Autres (base) | Activé ✅ |

**Ce qu'elle change** : Assure que chaque fichier peut être transpilé indépendamment (nécessaire pour Babel, esbuild, SWC, Next.js).

**Risque si désactivée** : Utilisation de constructions TypeScript non supportées par les transpileurs modernes (`const enum`, `namespace`, etc.).

**Recommandation** : Essentielle pour les projets utilisant Next.js (SWC), esbuild, ou Vite.

---

### `verbatimModuleSyntax`

| Projet | État |
|---|---|
| **Tous** | **Non défini → désactivé ❌** |

**Ce qu'elle change** : Les imports/exports de types doivent utiliser `import type` / `export type`. TypeScript ne supprime pas automatiquement les imports qui ne sont utilisés que comme types.

**Risque si désactivée** : Les imports non utilisés comme valeurs peuvent être supprimés silencieusement, causant des bugs avec les import side-effect et les re-exports. Moins de clarté sur l'intention.

**Recommandation** : Fortement recommandé pour les projets ESM modernes. Obligatoire avec les isolateModules + émetteurs modernes.

**Exemple de bug évité** :
```ts
// Sans verbatimModuleSyntax : TypeScript supprime silencieusement
import { SomeType } from "./module";
// Si SomeType n'est utilisé que comme type, l'import disparaît à l'émission

// Avec verbatimModuleSyntax : erreur, il faut écrire
import type { SomeType } from "./module";
```

---

### `moduleDetection`

| Projet | État |
|---|---|
| **Tous** | **Non défini → `auto` par défaut ⚠️** |

**Ce qu'elle change** : Détermine comment TypeScript détecte si un fichier est un module (a son propre scope). En mode `auto`, détection par `import`/`export`. En mode `force`, tous les fichiers sont considérés comme des modules.

**Risque** : En mode `auto`, un fichier sans `import`/`export` est considéré comme un script global. Cela peut causer des conflits de noms entre fichiers.

**Recommandation** : Mettre à `force` pour garantir l'isolation de chaque fichier.

---

### `skipLibCheck`

| Projet | État |
|---|---|
| `tsconfig.base.json` | Non défini → `false` ✅ |
| `screencold-web` | **Activé** (`true`) ✅ (recommandé Next.js) |
| `screencold-worker` | **Activé** (`true`) ✅ |
| `screencold-ui` | Non défini → hérité → `false` |
| `packages/db` | Non défini → hérité → `false` |
| `packages/types` | Non défini → hérité → `false` |

**Ce qu'elle change** : Skip la vérification de type dans les fichiers `.d.ts` des dépendances (`node_modules`).

**Risque si désactivée** : Les erreurs de type dans les dépendances tierces bloquent la compilation. Temps de compilation plus long.

**Recommandation** : Recommandé pour les projets application (web, worker) pour des raisons de DX et de performance. Peut rester `false` dans les packages de bibliothèque (packages/types, packages/db).

---

## Problème critique : `screencold-worker/tsconfig.json`

Ce fichier **ne remplace PAS la configuration de base**. Extraits clés :

```json
{
  "compilerOptions": {
    "strict": false,
    "skipLibCheck": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "removeComments": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": false
  },
  "include": ["src/**/*", "lib/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Problèmes identifiés

1. **`strict: false`** — Toutes les vérifications de sûreté sont désactivées :
   - `noImplicitAny` désactivé
   - `strictNullChecks` désactivé
   - `strictFunctionTypes` désactivé
   - `strictBindCallApply` désactivé
   - `strictPropertyInitialization` désactivé
   - `noImplicitThis` désactivé
   - `alwaysStrict` désactivé
2. **N'étend PAS `tsconfig.base.json`** — Ne bénéficie d'aucune option de la base
3. **Options de sûreté manquantes** : `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`
4. **`allowJs: true` + `checkJs: false`** — Les fichiers JS sont inclus mais pas vérifiés

### Impact

Ce worker (qui semble être le backend API Node.js) fonctionne avec une sécurité TypeScript quasi inexistante. Tous les bugs évitables listés dans cette analyse peuvent se produire dans ce package.

---

## Note de robustesse globale

| Projet | Note / 10 | Justification |
|---|---|---|
| `tsconfig.base.json` | **9/10** | Excellent, manque `useUnknownInCatchVariables`, `verbatimModuleSyntax`, `moduleDetection: force` |
| `screencold-ui` | **9/10** | Hérite de la base, parfait |
| `packages/db` | **9/10** | Hérite de la base, parfait |
| `packages/types` | **9/10** | Hérite de la base, parfait |
| `screencold-web` | **8/10** | Strict activé mais manque plusieurs options fines (`noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) |
| `screencold-worker` | **2/10** | `strict: false`, n'étend pas la base, aucune option de sûreté |

**Note globale du projet** : **6/10** — Pénalisé lourdement par le worker.

---

## Version améliorée complète

### `tsconfig.base.json` (amélioré)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "removeComments": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "useUnknownInCatchVariables": true,
    "exactOptionalPropertyTypes": false,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "moduleDetection": "force",

    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "exclude": ["node_modules", "dist", ".next", "coverage", ".turbo"]
}
```

### `screencold-worker/tsconfig.json` (corrigé)

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `screencold-web/tsconfig.json` (amélioré)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },

    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitOverride": true,
    "useUnknownInCatchVariables": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "allowUnreachableCode": false,
    "moduleDetection": "force"
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Classification des problèmes par gravité

### 🔴 Critique

| # | Problème | Projet | Action |
|---|---|---|---|
| C1 | `strict: false` dans le worker | `screencold-worker` | Passer à `strict: true` (ou étendre la base) |
| C2 | Worker n'étend pas `tsconfig.base.json` | `screencold-worker` | Ajouter `"extends": "../tsconfig.base.json"` |

### 🟠 Important

| # | Problème | Projet | Action |
|---|---|---|---|
| I1 | `useUnknownInCatchVariables` absent de la base | packages, UI, worker | Ajouter `true` dans la base |
| I2 | `verbatimModuleSyntax` absent partout | Tous | Ajouter `true` pour la sécurité ESM |
| I3 | `noUncheckedIndexedAccess` absent du web | `screencold-web` | Ajouter `true` |
| I4 | `noPropertyAccessFromIndexSignature` absent du web | `screencold-web` | Ajouter `true` |
| I5 | `moduleDetection` non configuré | Tous | Ajouter `"force"` dans la base |
| I6 | `allowUnreachableCode` non défini → simple warning | Tous | Mettre à `false` explicitement |

### 🔵 Amélioration

| # | Problème | Projet | Action |
|---|---|---|---|
| A1 | `exactOptionalPropertyTypes` désactivé partout | Tous | Activer si équipe prête à gérer la migration |
| A2 | `allowJs: true` + `checkJs: false` | worker, base | Sans `checkJs`, le JS est une faille dans la sécurité |
| A3 | Web ne devrait-il pas étendre la base ? | `screencold-web` | Possibilité d'étendre la base pour réduire la duplication |
| A4 | Next.js plugin `"name": "next"` sans `strictMode` dans la config | `screencold-web` | Vérifier que `next.config.js` a `reactStrictMode: true` |

---

## Compromis DX vs Sécurité

| Option | Impact DX | Impact Sécurité | Verdict |
|---|---|---|---|
| `strict: true` | ❌ Plus d'erreurs à la compilation | ✅ Élimine des classes entières de bugs | **À garder** |
| `noUnusedLocals/Parameters` | ❌ Peut ralentir le prototypage | ✅ Empêche code mort | **À garder** |
| `noUncheckedIndexedAccess` | ❌ Oblige des vérifications `undefined` | ✅ Évite les crashes d'accès tableau | **À garder** |
| `verbatimModuleSyntax` | ❌ Oblige `import type` explicite | ✅ Évite les suppressions d'imports silencieuses | **À garder** |
| `exactOptionalPropertyTypes` | ❌ Changement sémantique important | ✅ Précision sur optionals | **À activer si nouveau projet** |
| `skipLibCheck` | ✅ Compilation plus rapide | ❌ Masque les erreurs dans les libs | **Activé pour apps, pas pour libs** |
| `allowJs` | ✅ Migration progressive | ❌ Faille dans le système de type | **Checker JS ou migrer** |

---

## Actions prioritaires immédiates

### 1. 🔴 Fixer `screencold-worker` — URGENT

Remplacer le fichier par :

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "noEmit": false,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Risque** : Après cette modification, le worker pourrait ne plus compiler. Il faudra corriger les erreurs de type une par une. Commencer par activer `strict: true` progressivement en utilisant les commentaires `// @ts-expect-error` pour les cas complexes, ou activer option par option.

### 2. 🟠 Ajouter les options manquantes à la base

- `useUnknownInCatchVariables: true`
- `verbatimModuleSyntax: true`
- `moduleDetection: "force"`
- `allowUnreachableCode: false`

### 3. 🟠 Aligner `screencold-web` avec la base

Ajouter les options fines manquantes :
- `noUncheckedIndexedAccess: true`
- `noPropertyAccessFromIndexSignature: true`
- `moduleDetection: "force"`
- `allowUnreachableCode: false`

### 4. 🔵 Envisager l'unification

Faire étendre `screencold-web/tsconfig.json` de `tsconfig.base.json` pour éliminer la duplication et garantir la cohérence.

---

## Impact Next.js / React / Node.js

### Next.js (`screencold-web`)
- `isolatedModules: true` compatible ✅
- `jsx: "preserve"` correct pour Next.js (SWC gère la transformation JSX) ✅
- `skipLibCheck: true` recommandé Next.js ✅
- `verbatimModuleSyntax` compatible avec Next.js 🟢
- `noUncheckedIndexedAccess` : attention aux accès `searchParams.get()`, `headers.get()` — les valeurs peuvent être `null`, vérifier les chaînes de nullabilité

### React (`screencold-ui`)
- Mode strict compatible ✅
- `noUnusedParameters` peut être contraignant avec les callbacks React (ex: `onClick={(e) => ...}` où `e` n'est pas utilisé). Solution : préfixer avec `_` (`_e`).

### Node.js (`screencold-worker`)
- `strict: false` corrigera le plus gros problème
- `verbatimModuleSyntax` : nécessite que l'émetteur final (tsc, tsx, etc.) soit compatible ESM
- `moduleResolution: "bundler"` : compatible avec les runtimes modernes (Bun, Node >= 16 avec `--experimental-specifier-resolution`)
