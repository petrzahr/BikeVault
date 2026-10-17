---
name: BikeVault
description: Garáž, komponenty a servis kol na jednom místě, data v soukromém Google Disku.
colors:
  signal: "#cc7a00"
  signal-hover: "#db921c"
  signal-ink: "#8a4b00"
  signal-tint: "#fdf4e3"
  canvas: "#f4f5f6"
  surface: "#ffffff"
  fill: "#e8e9eb"
  hairline: "#d3d6da"
  hairline-strong: "#b3b8be"
  ink: "#0f1113"
  ink-body: "#2a2d32"
  ink-secondary: "#5c6168"
  shell: "#0f1113"
  danger-rose: "#e11d48"
  done-emerald: "#047857"
  due-steel: "#2b5ea7"
typography:
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 600
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  page-title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  section:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.35
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.08em"
    fontStretch: "80%"
rounded:
  sm: "2px"
  md: "2px"
  lg: "3px"
  xl: "3px"
  2xl: "4px"
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
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-body}"
    rounded: "{rounded.lg}"
    height: "32px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  segment-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
  chip:
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: BikeVault

## Overview

**Creative North Star: „Technický výkres"**

BikeVault je servisní knížka garáže, kreslená jako technický list: ploché pláty s vlasovými linkami, ostré hrany, čísla v neproporcionálním písmu jako na měřidle a jedna signální barva pro akci. Tmavý rám aplikace (hlavička, postranní panel, spodní lišta) je dílna, světlé pláty jsou výkresy. Rozhraní je husté, protože uživatel pracuje se seznamy komponent, servisních záznamů a nastavení odpružení; řád drží linky, zarovnání a tabulková čísla. Žádné textury, nýty, slzičkový plech ani dekorativní výstražné pruhy: industriálnost je v přesnosti, ne v kostýmu.

Aplikace má jen světlý vzhled; tmavý je pouze rám (shell).

**Key Characteristics:**
- Čísla (km, h, psi, bar, kliky, Kč) jsou hlavní obsah: `readout` v JetBrains Mono, popisky v zúženém Archivu velkými písmeny.
- Signální jantar jedná, růžová varuje před ztrátou a hlásí po termínu, ocelová modrá hlásí blížící se servis, smaragd hlásí hotovo. Nic jiného nemá barvu.
- Ploché pláty bez stínů, 4px zaoblení, žádné vnořené karty.
- Podpis: měřidlo servisního intervalu (pravítko se stupnicí, ryska limitu, ukazatel).
- Pevná spodní hranice textu 12px.
- Každý opakovaný prvek má jeden recept (CSS třída).

## Colors

Jedna neutrální škála (`slate`, chladně neutrální, přepsaná v `tailwind.config.ts`), jedna akční (`signal`, pálený jantar) a tři významové (`rose`, `emerald`, `steel`).

### Primary
- **Signál** (`signal-500`, #cc7a00): výplň primárních tlačítek a aktivní buňky spodní lišty, vždy s grafitovým textem (bílý by nesplnil AA). Logo v postranním panelu.
- **Signál světlejší** (`signal-400`): hover primárního tlačítka, ikona a značka aktivní položky na tmavém rámu.
- **Signálový inkoust** (`signal-600`–`800`): textové odkazy, ikony, fokus a kurzor na bílé (`signal-600` 4,9:1, `signal-700` 6,8:1).
- **Signálový nádech** (`signal-50`): informační panely, štítek `chip-signal`, vybraná volba `option-card`.

### Secondary (význam)
- **Růžová** (`rose`): mazání, chyby, servis po termínu (i přetažená část měřidla).
- **Ocelová modrá** (`steel`): servis se blíží, upozornění (`panel-warning`, `chip-steel`, varovná zóna měřidla). Je modrá záměrně, aby se nepletla s jantarovou akcí.
- **Smaragd** (`emerald`): hotovo, úspěch, příjem.

### Neutral
- **Plátno** (`slate-50`): pozadí obsahu, zapuštěné panely a podklad segmentu.
- **Povrch** (`white`): pláty (karty), dialogy, pole.
- **Výplň** (`slate-100`): neutrální štítky, dlaždice ikon.
- **Linka** (`slate-200` na plátech a uvnitř nich, `slate-300` u polí a sekundárních tlačítek, `slate-400` stupnice měřidla): okraje a oddělovače nesou hloubku místo stínů.
- **Inkoust** (`slate-900`): nadpisy, hodnoty, vybraný segment, výplň měřidla. **Text** (`slate-700`): běžný text a popisky polí. **Vedlejší inkoust** (`slate-500`): metadata, popisky, jednotky.
- **Rám** (`slate-900` / `slate-800`): hlavička, postranní panel a spodní lišta, text bílý a `white/70`.

### Named Rules
**The Closed Palette Rule.** V komponentách se používají jen rodiny `slate`, `signal`, `rose`, `emerald`, `steel` a `white`. Žádné `gray`, `red`, `amber`, `navy`, `sky`… Hex barva v komponentě je chyba, s výjimkou log: barevné „G“ Google a oficiální wordmark Strava (`StravaLogo`, jen v Nastavení). Ikona Stravy v hlavičce se barví z palety. Tailwind na neexistující třídu neupozorní, proto se kontroluje grepem.

**The Meaning-Only Rule.** Barva vždy znamená akci nebo stav. Kategorie a typy (např. DIY vs. servis, Strava vs. ruční zápis) se odlišují textem a neutrálním nebo `chip-signal` štítkem, ne další barvou.

**The AA Rule.** Text na bílé má kontrast alespoň 4,5:1. Proto je na jantarové výplni grafitový text, jantarový text je od `signal-600`, smaragdové a ocelové texty v odstínu 700–800 (600 je jen pro ikony a výplně), růžové od 600.

## Typography

**Písma:** Archivo (variabilní, osa šířky; `next/font`, proměnná `--font-sans`) pro rozhraní a JetBrains Mono (`--font-mono`, utilita `font-mono`) jen pro měřené hodnoty. Obě se hostují z vlastního buildu, žádná externí doména za běhu. Hierarchii nese řez, velikost a šířka, ne další písmo.

### Hierarchy
- **Readout** (`readout`: mono 600, tracking −0,02em; velikost dodává místo, KPI 24px, karty 18px, řádky 14px): hodnoty tachometru, motohodin, nákladů, tlaků. Jednotka může mít `readout-unit`.
- **Page title** (700, 20px, `<h1>`): název obrazovky v `PageHeader` nebo hlavičce detailu. Jeden `<h1>` na stránku.
- **Section** (700, 16px, `<h2>`): nadpisy sekcí obrazovky mimo karty a hlavička podstránky detailu kola.
- **Title** (700, 14px): nadpis uvnitř karty. Úroveň `<h2>`/`<h3>` podle struktury, velikost vždy 14px.
- **Body** (500, 12px): data, řádky, popisy. Pole mají 14px (na telefonu 16px kvůli iOS); číselná pole (`type="number"`, `inputmode="decimal|numeric"`) jsou automaticky mono.
- **Label** (`section-label`: 700, 12px, velká písmena, tracking 0,08em, šířka 80 %, `slate-500`): popisky hodnot a skupin, jako ražený štítek. Nikdy jako nadtitulek nad nadpisem.
- **Rám:** titulek v hlavičce a značka BikeVault jsou velkými písmeny v zúženém Archivu.

### Named Rules
**The 12px Floor Rule.** Žádný text není menší než 12px (`text-xs`), ani štítky a metadata. `text-[10px]` a `text-[11px]` se nepoužívají; méně důležité se odlišuje barvou a řezem.

**The Mono-Means-Measured Rule.** Mono písmo dostávají jen měřené nebo počítané hodnoty (km, h, psi, bar, %, kliky, Kč, roky, sériová čísla). Text, názvy a popisy nikdy.

## Layout

Postranní panel 256px vlevo (na mobilu vysouvací zásuvka, otevírá ji „Více“ ve spodní liště), hlavička 64px, na mobilu spodní lišta 56px, obsah s okrajem 16px (mobil) / 24px. Rám respektuje bezpečné okraje (`env(safe-area-inset-*)`) a výška aplikace je `h-dvh`, ne `100vh`. Rytmus na 4px kroku: uvnitř karet 8–12px, mezi kartami 16–24px. Karty mají vnitřní okraj 16px (mobil) / 20px. Zlomy: 640px (sm), 768px (md, objeví se postranní panel), 1024px (lg).

## Elevation & Depth

Hloubka je lineární, ne stínová: bílé pláty na světlém plátně s vlasovou linkou `slate-200`, žádný `shadow-sm` na kartách, tlačítkách ani polích. Hover karty ztmaví linku (`slate-400`). Stín mají jen plovoucí vrstvy: nabídky a toasty `shadow-lg`, dialogy `shadow-xl` nad ztmavením `slate-900/40`.

## Shapes

Ostré hrany technického výkresu. Celá škála zaoblení je přepsaná v `tailwind.config.ts`, takže existující utility ji následují: `rounded-2xl` = 4px (karty, dialogy, nabídky), `rounded-xl` / `rounded-lg` = 3px (tlačítka, pole, panely, segment), `rounded-md` / `rounded-sm` = 2px (štítky, volba segmentu). Plně kulaté zůstávají jen avatary, tečky a odznaky. Žádné barevné levé pruhy.

## Components

Každý opakovaný prvek má jeden recept jako třídu v `src/app/globals.css` (`@layer components`). Nové místo použije třídu, nevymýšlí vlastní kombinaci; místo použití doplňuje jen rozložení (šířka, flex, grid, okraje) přes `cn()`.

### Buttons
- **Primary (`btn-primary`):** jantarová výplň `signal-500`, linka `signal-600`, grafitový text 12px bold, výška 32px, na mobilu 44px. Hover světlejší `signal-400`. Jedna hlavní akce na obrazovku nebo dialog.
- **Danger (`btn-danger`):** stejný recept v růžové s bílým textem, jen pro nevratnou akci v potvrzovacím dialogu.
- **Secondary (`btn-secondary`):** bílý povrch s linkou `slate-300`, text `slate-700`, hover obtáhne linku i text grafitem. Zrušit, Upravit, Export, akce na kartách, „Detail kola“.
- **Secondary danger (`btn-secondary btn-secondary-danger`):** vstup do mazání nebo odpojení; červené až při najetí.
- **Shell (`btn-shell`):** vedlejší akce na tmavém rámu (Přidat komponentu, řazení kol): průhledné s linkou `white/20`.
- **Header (`btn-header`):** stavové prvky Strava a Google Disk v hlavičce: kompaktní obrys rámu (3px, linka `white/20`), výška 28px, na mobilu 44px. Připojená Strava je vyplněná signálovým jantarem s grafitovým textem, nepřipojená má jantarovou ikonu. Disk nese barevné logo Google a stavovou ikonu, chyba tónuje prvek růžově. Nepoužívá se jinde.
- **Text (`btn-text`, `btn-text-danger`):** nejtišší úroveň, vypadá jako odkaz (`signal-700`).
- **Icon (`btn-icon`, `btn-icon-danger`):** ikona 16px bez rámečku, při najetí obtažená linkou; 32px plocha, na mobilu 44px; vždy `aria-label`.
- **Size (`btn-sm`):** menší výška 28px pro husté řádky; na mobilu zůstává 44px.
- **Disabled:** šedé (`slate-200`), ne průhledné.

### Fields
- **`field`** pro `input`, `select`, `textarea`: bílý povrch, linka `slate-300`, 3px zaoblení, 14px text, fokus jantarový okraj `signal-600` a aura; chyba přes `aria-invalid="true"` růžovým okrajem. Číselná pole mono.
- **`field-label`**: 12px semibold `slate-700`, 4px nad polem.
- **`field field-sm`**: kompaktní pole pro přejmenování přímo v řádku seznamu.
- **Jednotka v poli** (km, h, Kč): `absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none`.

### Choice cards
- **`option-card`**: `label` obalující radio/checkbox s popisem; vybraná volba (`:has(:checked)`) má jantarový nádech a okraj `signal-600`, `option-card-danger` pro destruktivní volbu (růžová).

### Cards
- **`card`** (plát): bílý povrch, linka `slate-200`, 4px zaoblení, bez stínu. Vnitřní okraj doplňuje místo (`p-4 sm:p-5`).
- **`card-header`**: záhlaví karty se seznamem, linka `slate-200` pod ním.

### Readouts
- **`readout`** (+ `readout-unit`): měřená hodnota v mono. KPI pás garáže, statistik a financí, tachometr a motohodiny na kartě kola, čisté náklady, stav v postranním panelu.

### Interval gauge (signature)
- **`IntervalGauge`** (`src/components/common/IntervalGauge.tsx`, geometrie `src/lib/domain/intervalGauge.ts`, recepty `gauge-*`): pravítko servisního intervalu na kartě kola. Stupnice s ryskami po 10 % a 2 %, grafitová výplň do začátku varovné zóny, ocelová ve varovné zóně (obtažená i před dosažením), růžová za limitem; ryska limitu a trojúhelníkový ukazatel aktuálního stavu. Pod ním `0 km … použito / interval · +přetažení` v mono. Ukazuje km nebo hodiny podle toho, co je blíž limitu; plány jen v měsících měřidlo nemají. Je čistě vizuální (`role="img"` s popisem); stav v textu nese štítek vedle.

### Setup sheet
- **Nastavení kola** (`src/app/bikes/[id]/setup/SetupClient.tsx`, díly v `src/components/setup/SetupParts.tsx`): pořadí pláště → vidlice → tlumič (v terénu se nejčastěji kontrolují pláště). Každá část je `SetupSheet` (plát se záhlavím: díl, namontovaná komponenta, štítek se zdvihem nebo směsí).
- **`ReadoutField`** (`field field-readout`): velká editovatelná hodnota v mono 24px s jednotkou uvnitř pole a druhou hodnotou pod ním (psi pod bary, SAG v mm). Dvě vedle sebe v `ReadoutRow` dělené linkou.
- **`SagRuler`**: SAG na pravítku zdvihu, stejné recepty jako měřidlo intervalu (`gauge-*`); bez zdvihu nebo SAG se nezobrazí.
- **`ClickStepper`** (`stepper`): kliky od zavřeno jako − / hodnota / +, hodnota zůstává editovatelná, nikdy pod 0; prázdná hodnota se změní jen stiskem. Na mobilu 44px.
- Ukládací lišta je na telefonu přilepená nad spodní navigací.

### Segmented controls
- **`segmented` + `segment`**: zapuštěný podklad `slate-50` s linkou, volba 12px semibold; vybraná je grafitová (`slate-900`) s bílým textem. Stav nese ARIA atribut: `aria-pressed`, `aria-selected` (`role="tab"`), `aria-current="page"` (odkazy podsekcí kola). Barvu podle významu (výdaj/příjem) přidává místo utilitou `aria-pressed:bg-…`.

### Chips
- **`chip` + `chip-neutral` / `chip-signal` / `chip-emerald` / `chip-steel` / `chip-rose`**: 2px zaoblení, 12px semibold, bez rámečku, barva jen podle významu. Štítky přes fotku kola jsou bílé s linkou, rok mono.

### Panels
- **`panel` + `panel-error` / `panel-warning` / `panel-info` / `panel-success` / `panel-neutral`**: 12px okraj, 3px zaoblení, linka, 12px text. Varování je ocelové, informace jantarově tónovaná. `panel-neutral` je šedý zapuštěný box. Ikona vlevo (`flex items-start gap-2.5`) doplňuje místo. Chybová hláška ve formuláři má `role="alert"`. Toasty používají stejné panely se stínem `shadow-lg`.

### Page header
- **`PageHeader`** (`src/components/common/PageHeader.tsx`): plát s `<h1>` (20px), volitelným štítkem (`chip`), akcemi vpravo a řádkem pod nadpisem (`children`: záložky, filtry). Používají ji všechny seznamové obrazovky; detail kola a komponenty mají vlastní hlavičku se stejným `<h1>`. Titulek v tmavé hlavičce aplikace není nadpis (`<p>`, velká písmena, zúžený) a je to vždy popisek aktivní položky navigace (`navItems.ts`); slogan „Vaše kola pod absolutní kontrolou“ patří jen pod logo v postranním panelu.

### Sidebar
- **`Sidebar`** (`src/components/layout/Sidebar.tsx`): logo je jantarová dlaždice s grafitovou ikonou a značka BIKEVAULT velkými písmeny. Aktivní položka navigace: podklad `white/10`, ikona `signal-400` a malý jantarový čtverec vpravo (jako ryska nastavení na číselníku). Stavový plát dole má hodnoty v mono.

### Settings sections
- **`SettingsSection`** (`src/app/settings/page.tsx`): Nastavení je jedna posouvaná stránka bez `PageHeader` (`<h1>` je `sr-only`, název nese hlavička aplikace). Každá sekce je `card` se záhlavím: ikona 20px v dlaždici `slate-100`/`slate-500` (jen Mazání dat má `rose-50`/`rose-600`), `<h2>` 16px, popis 12px `slate-500`, akce vpravo, linka pod záhlavím. Řádek uvnitř: text vlevo (`<h3>` 14px bold + popis), tlačítko vpravo; na telefonu pod sebou.
- **Obsah stránky** (`SettingsOutline`): od 1280px (xl) přilepený sloupec 13rem vpravo, `section-label` „Na této stránce“, aktivní sekce `signal-50`/`signal-700` (`aria-current="location"`).

### Mobile navigation
- **`MobileNav`** (`src/components/layout/MobileNav.tsx`): jen pod 768px, pevná spodní lišta v barvě rámu (`slate-900`, linka `white/10`). Pět stejných buněk ≥ 56px: Garáž, Komponenty, Servis, Finance a „Více“. Ikona 20px v 48×28px poli, popisek 12px; aktivní má jantarové pole `signal-500` s grafitovou ikonou a bílý popisek, ostatní `white/60`. „Servis“ nese růžový odznak s počtem plánů po termínu. Položky a pravidlo aktivní sekce jsou sdílené se sidebarem (`navItems.ts`). Toasty na mobilu sedí nad lištou.

### Empty states
- **`empty-state`**: na střed, 32px nahoře a dole, 12px `slate-500`; volitelný nadpis 14px bold `slate-700`.

### Dialogs
- **`Modal`** (`src/components/common/Modal.tsx`): hlavička s názvem (`<h2>` 16px) a křížkem (`btn-icon`), posouvající se obsah, ztmavení `slate-900/40`. Pod 640px je to spodní panel (přes celou šířku, zaoblený jen nahoře, vyjede zdola, max. 85dvh, spodní okraj počítá s home indikátorem); od 640px vycentrovaný dialog. Akční lišta je `ModalFooter` (`modal-footer`): přilepená ke spodnímu okraji dialogu, Zrušit (`btn-secondary`) vlevo od hlavní akce, na telefonu pod sebou přes celou šířku s hlavní akcí nahoře. Průvodce s kroky (BikeModal) používá `ModalFooter className="sm:justify-between"`. Potvrzovací dialogy jdou přes `ConfirmationModal` / `useFeedback().confirm`, nikdy vlastní `fixed inset-0`.

## Do's and Don'ts

### Do:
- **Do** použij recept; přes `cn()` přidávej jen rozložení.
- **Do** dávej měřeným hodnotám `readout` / mono, popiskům `section-label`.
- **Do** drž text na 12px a výš, důležitost odlišuj řezem, šířkou a barvou.
- **Do** na jantarovou výplň piš grafitem, ne bílou.
- **Do** ikonovým tlačítkům `aria-label` a na mobilu 44px plochu.
- **Do** respektuj `prefers-reduced-motion`.

### Don't:
- **Don't** skládej vlastní třídy tlačítek, štítků, panelů a karet inline.
- **Don't** používej barvy mimo uzavřenou paletu ani hex v komponentách (kromě log).
- **Don't** přidávej stíny plátům ani tlačítkům; hloubku nese linka.
- **Don't** používej mono pro text nebo jako „technický“ kostým.
- **Don't** přidávej industriální dekor (textury, nýty, výstražné pruhy, šablonové písmo).
- **Don't** používej `text-[10px]` / `text-[11px]`.
- **Don't** vnořuj karty do karet.
- **Don't** přebíjej barvu nebo zaoblení receptu utilitou; potřebuješ-li variantu, přidej ji do receptu a do tohoto souboru.
