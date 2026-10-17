---
name: BikeVault
description: Garáž, komponenty a servis kol na jednom místě, data v soukromém Google Disku.
colors:
  navy: "#1c3a63"
  navy-deep: "#152c4c"
  navy-tint: "#eef2f7"
  canvas: "#f4f5f6"
  surface: "#ffffff"
  fill: "#e8e9eb"
  hairline: "#d3d6da"
  ink: "#0f1113"
  ink-body: "#2a2d32"
  ink-secondary: "#5c6168"
  shell: "#0f1113"
  danger-rose: "#e11d48"
  done-emerald: "#047857"
  due-amber: "#b45309"
typography:
  kpi:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.25
    fontFeature: "tnum"
  page-title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  section:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.navy-deep}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.lg}"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 14px"
  segment-active:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  chip:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: BikeVault

## Overview

**Creative North Star: „Servisní knížka"**

BikeVault je servisní knížka garáže. Tmavý rám aplikace (hlavička a postranní panel) je dílna, světlé karty jsou stránky knížky: na první pohled je vidět stav kola, kilometry a co je potřeba udělat. Barva hlásí jen akci a stav, všechno ostatní je klidná neutrální šedá. Rozhraní je husté, protože uživatel pracuje se seznamy komponent a servisních záznamů, ale řád drží karty, zarovnání a tabulková čísla.

Aplikace má jen světlý vzhled; tmavý je pouze rám (shell).

**Key Characteristics:**
- Čísla (kilometry, ceny, intervaly) jsou hlavní obsah: tabulkové číslice, KPI 24px extrabold.
- Navy jedná, růžová varuje před ztrátou, smaragd hlásí hotovo, jantar hlásí blížící se servis. Nic jiného nemá barvu.
- Ploché karty s 16px zaoblením, žádné vnořené karty.
- Pevná spodní hranice textu 12px.
- Každý opakovaný prvek má jeden recept (CSS třída).

## Colors

Jedna neutrální škála (`slate`, chladně neutrální, přepsaná v `tailwind.config.ts`), jedna akční (`navy`) a tři významové (`rose`, `emerald`, `amber`).

### Primary
- **Navy** (`navy-600`): primární tlačítka, vybraná volba segmentu, odkazy, fokus, kurzor a výběr textu.
- **Hluboká navy** (`navy-700`): hover primárního tlačítka a textových odkazů.
- **Navy nádech** (`navy-50`): informační panely a štítky, aktivní položka navigace.

### Secondary (význam)
- **Růžová** (`rose`): mazání, chyby, servis po termínu.
- **Smaragd** (`emerald`): hotovo, úspěch, příjem.
- **Jantar** (`amber`): servis se blíží, upozornění.

### Neutral
- **Plátno** (`slate-50`): pozadí obsahu, zapuštěné panely.
- **Povrch** (`white`): karty, dialogy, pole.
- **Výplň** (`slate-100`): hover, podklad segmentu, neutrální štítky.
- **Linka** (`slate-200`, v kartách `slate-200/80`, uvnitř karet `slate-100`): okraje a oddělovače.
- **Inkoust** (`slate-900`): nadpisy a hodnoty. **Text** (`slate-700`): běžný text a popisky polí. **Vedlejší inkoust** (`slate-500`): metadata, popisky.
- **Rám** (`slate-900` / `slate-800`): hlavička a postranní panel, text bílý a `white/70`.

### Named Rules
**The Closed Palette Rule.** V komponentách se používají jen rodiny `slate`, `navy`, `rose`, `emerald`, `amber` a `white`. Žádné `gray`, `red`, `purple`, `sky`… Hex barva v komponentě je chyba, s výjimkou log (Google, Strava). Tailwind na neexistující třídu neupozorní, proto se kontroluje grepem.

**The Meaning-Only Rule.** Barva vždy znamená akci nebo stav. Kategorie a typy (např. DIY vs. servis) se odlišují textem a neutrálním nebo navy štítkem, ne další barvou.

**The AA Rule.** Text na bílé má kontrast alespoň 4,5:1. Proto jsou smaragdové a jantarové texty v odstínu 700–800 (600 je jen pro ikony), růžové od 600.

## Typography

**Font:** Plus Jakarta Sans (`next/font`, proměnná `--font-sans`), fallback system-ui. Hierarchii nese řez a velikost, ne druhé písmo.

### Hierarchy
- **KPI** (800, 24px, tabulkové číslice): hlavní čísla na kartách (kilometry, náklady, počty).
- **Page title** (700, 20px, `<h1>`): název obrazovky v `PageHeader` nebo hlavičce detailu. Jeden `<h1>` na stránku.
- **Section** (700, 16px, `<h2>`): nadpisy sekcí obrazovky mimo karty (Po termínu, Servisní plány…) a hlavička podstránky detailu kola.
- **Title** (700, 14px): nadpis uvnitř karty (záhlaví karty, název kola, komponenty, plánu). Úroveň `<h2>`/`<h3>` podle struktury, velikost vždy 14px.
- **Body** (500, 12px): data, řádky, popisy. Pole mají 14px (na telefonu 16px kvůli iOS).
- **Label** (`section-label`: 700, 12px, velká písmena, `tracking-wider`, `slate-500`): popisky KPI a skupin.

### Named Rules
**The 12px Floor Rule.** Žádný text není menší než 12px (`text-xs`), ani štítky a metadata. `text-[10px]` a `text-[11px]` se nepoužívají; méně důležité se odlišuje barvou a řezem.

## Layout

Postranní panel 256px vlevo (na mobilu vysouvací zásuvka, otevírá ji „Více“ ve spodní liště), hlavička 64px, na mobilu spodní lišta 56px, obsah s okrajem 16px (mobil) / 24px. Rám respektuje bezpečné okraje (`env(safe-area-inset-*)`: výřez, home indikátor) a výška aplikace je `h-dvh`, ne `100vh`. Rytmus na 4px kroku: uvnitř karet 8–12px, mezi kartami 16–24px. Karty mají vnitřní okraj 16px (mobil) / 20px. Zlomy: 640px (sm), 768px (md, objeví se postranní panel), 1024px (lg).

## Elevation & Depth

Hloubka je tonální: bílé karty na světlém plátně s vlasovou linkou a stínem `shadow-sm`. Výraznější stín mají jen plovoucí vrstvy: nabídky a toasty `shadow-lg`, dialogy `shadow-xl` nad ztmavením `slate-900/40`.

## Shapes

Karty, dialogy a nabídky 16px (`rounded-2xl`); tlačítka, pole, panely a podklad segmentu 12px (`rounded-xl`); ikonová tlačítka a volba segmentu 8px (`rounded-lg`); štítky 6px (`rounded-md`); avatary a tečky plně kulaté. Žádné barevné levé pruhy.

## Components

Každý opakovaný prvek má jeden recept jako třídu v `src/app/globals.css` (`@layer components`). Nové místo použije třídu, nevymýšlí vlastní kombinaci; místo použití doplňuje jen rozložení (šířka, flex, grid, okraje) přes `cn()`.

### Buttons
- **Primary (`btn-primary`):** navy, bílý text 12px bold, výška 32px, na mobilu 44px. Jedna hlavní akce na obrazovku nebo dialog.
- **Danger (`btn-danger`):** stejný recept v růžové, jen pro nevratnou akci v potvrzovacím dialogu.
- **Secondary (`btn-secondary`):** bílý povrch s linkou, text `slate-700`, hover navy. Zrušit, Upravit, Export, akce na kartách.
- **Secondary danger (`btn-secondary btn-secondary-danger`):** vstup do mazání nebo odpojení; červené až při najetí.
- **Shell (`btn-shell`):** vedlejší akce na tmavém rámu (přihlášení, synchronizace).
- **Text (`btn-text`, `btn-text-danger`):** nejtišší úroveň, vypadá jako odkaz („Zobrazit vše“, „Zrušit filtr“).
- **Icon (`btn-icon`, `btn-icon-danger`):** ikona 16px bez rámečku, 32px plocha, na mobilu 44px; vždy `aria-label`.
- **Size (`btn-sm`):** menší výška 28px pro husté řádky; na mobilu zůstává 44px.
- **Disabled:** šedé (`slate-200`), ne průhledné.

### Fields
- **`field`** pro `input`, `select`, `textarea`: bílý povrch, linka, 12px zaoblení, 14px text, fokus navy okraj a aura; chyba přes `aria-invalid="true"` růžovým okrajem.
- **`field-label`**: 12px semibold `slate-700`, 4px nad polem.
- **`field field-sm`**: kompaktní pole pro přejmenování přímo v řádku seznamu.
- **Jednotka v poli** (km, h, Kč): `absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none`.

### Choice cards
- **`option-card`**: `label` obalující radio/checkbox s popisem; vybraná volba (`:has(:checked)`) má navy nádech a navy okraj, `option-card-danger` pro destruktivní volbu (růžová). Rozložení obsahu (`items-start` / `items-center`) doplňuje místo.

### Cards
- **`card`**: bílý povrch, linka `slate-200/80`, 16px zaoblení, `shadow-sm`. Vnitřní okraj doplňuje místo (`p-4 sm:p-5`).
- **`card-header`**: záhlaví karty se seznamem, linka `slate-100` pod ním.

### Segmented controls
- **`segmented` + `segment`**: šedý podklad, volba 12px semibold; vybraná je navy s bílým textem. Stav nese ARIA atribut, ne třída: `aria-pressed` (filtr, přepínač), `aria-selected` (`role="tab"`), `aria-current="page"` (odkazy podsekcí kola). Barvu podle významu (výdaj/příjem) přidává místo utilitou `aria-pressed:bg-…`.

### Chips
- **`chip` + `chip-neutral` / `chip-navy` / `chip-emerald` / `chip-amber` / `chip-rose`**: 6px zaoblení, 12px semibold, bez rámečku, barva jen podle významu.

### Panels
- **`panel` + `panel-error` / `panel-warning` / `panel-info` / `panel-success` / `panel-neutral`**: 12px okraj a zaoblení, linka, 12px text. `panel-neutral` je šedý zapuštěný box (technický detail, souhrn, nastavení odpružení). Ikona vlevo (`flex items-start gap-2.5`) doplňuje místo. Chybová hláška ve formuláři má `role="alert"`. Toasty používají stejné panely se stínem `shadow-lg`.

### Page header
- **`PageHeader`** (`src/components/common/PageHeader.tsx`): karta s `<h1>` (20px), volitelným štítkem (`chip`), akcemi vpravo a řádkem pod nadpisem (`children`: záložky, filtry). Používají ji všechny seznamové obrazovky; detail kola a komponenty mají vlastní hlavičku se stejným `<h1>`. Titulek v tmavé hlavičce aplikace není nadpis (`<p>`).

### Mobile navigation
- **`MobileNav`** (`src/components/layout/MobileNav.tsx`): jen pod 768px, pevná spodní lišta v barvě rámu (`slate-900`, linka `white/10`). Pět stejných buněk ≥ 56px: Garáž, Komponenty, Servis, Finance a „Více“ (otevře zásuvku se Statistikami, Seznamy, Nastavením a rychlými akcemi). Ikona 20px v 48×28px poli, popisek 12px; aktivní má navy pole a bílý text, ostatní `white/60`. „Servis“ nese růžový odznak s počtem plánů po termínu. Položky a pravidlo aktivní sekce jsou sdílené se sidebarem (`navItems.ts`). Toasty na mobilu sedí nad lištou.

### Empty states
- **`empty-state`**: na střed, 32px nahoře a dole, 12px `slate-500`; volitelný nadpis 14px bold `slate-700`.

### Dialogs
- **`Modal`** (`src/components/common/Modal.tsx`): hlavička s názvem (`<h2>` 16px) a křížkem (`btn-icon`), posouvající se obsah, ztmavení `slate-900/40`. Pod 640px je to spodní panel (přes celou šířku, zaoblený jen nahoře, vyjede zdola, max. 85dvh, spodní okraj počítá s home indikátorem); od 640px vycentrovaný dialog. Akční lišta je `ModalFooter` (`modal-footer`): přilepená ke spodnímu okraji dialogu, Zrušit (`btn-secondary`) vlevo od hlavní akce, na telefonu pod sebou přes celou šířku s hlavní akcí nahoře. Průvodce s kroky (BikeModal) používá `ModalFooter className="sm:justify-between"`. Potvrzovací dialogy jdou přes `ConfirmationModal` / `useFeedback().confirm`, nikdy vlastní `fixed inset-0`.

## Do's and Don'ts

### Do:
- **Do** použij recept; přes `cn()` přidávej jen rozložení.
- **Do** drž text na 12px a výš, důležitost odlišuj řezem a barvou.
- **Do** dávej číslům tabulkové číslice.
- **Do** ikonovým tlačítkům `aria-label` a na mobilu 44px plochu.
- **Do** respektuj `prefers-reduced-motion`.

### Don't:
- **Don't** skládej vlastní třídy tlačítek, štítků, panelů a karet inline.
- **Don't** používej barvy mimo uzavřenou paletu ani hex v komponentách.
- **Don't** používej `text-[10px]` / `text-[11px]`.
- **Don't** vnořuj karty do karet.
- **Don't** přebíjej barvu nebo zaoblení receptu utilitou; potřebuješ-li variantu, přidej ji do receptu a do tohoto souboru.
