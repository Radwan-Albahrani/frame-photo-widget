# ux-araby

A skill for writing, editing, localizing, and auditing Arabic UX microcopy: buttons, labels, errors, success messages, empty states, forms, onboarding, tooltips, modals, notifications, headings, help text, and terminology systems.

It targets **فصحى مبسطة**, clear and natural Modern Standard Arabic that reads like it was written for a product, not translated from English. It works to remove **عرنجية** (English-shaped Arabic), literal translation, over-formality, and verbosity, while keeping the copy correct in grammar, spelling, hamza, plurals, prepositions, and numerals.

## What it does

- **Create, edit, localize, and audit** Arabic interface text.
- Apply four quality standards in order: **هادف** (purposeful), **موجز** (concise), **طبيعي** (natural), **واضح** (clear).
- Catch common anti-patterns (`تم + مصدر`, `قم بـ`, `الخاص بك`, filler, structural and semantic calques) and propose the lightest native fix.
- Decide **register** and **gender strategy** consistently across a product.
- Handle production realities: placeholders and ICU plurals, RTL and mixed text, numerals, currency, and dates.

## Repository layout

```
ux-araby/
├── SKILL.md                              entry point: workflow, rules, patterns, examples, checklist
├── README.md                            this file
├── LICENSE                              MIT
├── package.json                         npm metadata
└── references/
    ├── anti-patterns.md                  كاشف العرنجي: the anti-pattern checklist
    ├── arabic-grammar-guide.md           grammar, spelling, morphology, punctuation
    └── arabic-huroof-reference.md        preposition and particle meanings, and verb government
```

`SKILL.md` is the entry point. The reference files are loaded on demand; `SKILL.md` says when to read each one, so the working context stays small.

## Usage

This is an Agent Skill. An AI assistant reads `SKILL.md` first and consults the reference files when a task calls for them. Place the `ux-araby/` folder wherever your assistant loads skills from.

## Install

This package ships documentation only (the SKILL files), so installing just places them in `node_modules/`; there is no code to run. Point your assistant's skill loader at the installed folder.

Install straight from GitHub, no npm registry needed:

```bash
npm install github:AbadLife/ux-araby
```

Or, once it is published to npm:

```bash
npm install ux-araby
```

Either way the files land in `node_modules/ux-araby/` (`SKILL.md` plus `references/`).

## Sources

Built on أحمد الغامدي (*العرنجية*), الحسن بن قاسم المرادي (*الجنى الداني في حروف المعاني*), العيوني (*الصرف الصغير*), and مصطفى جواد (*قل ولا تقل*).

## Credits

Created by the Abad team (فريق أبـد), [abad.life](https://abad.life).

## License

[MIT](LICENSE) © Abad team.
