# goldentrex.github.io

Personal academic website of **Victor Gaya** — Research Fellow at the National
University of Singapore, working on deep learning for optical and SAR remote sensing.

Static site (plain HTML/CSS/JS), served by GitHub Pages at
<https://goldentrex.github.io>.

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | Home — bio, current position, latest publication |
| `publications.html` | Publication list (chronological / by type toggle, BibTeX) |
| `education.html` | Education & experience timeline |
| `contact.html` | Contact details and profile links |
| `style.css` | Design system, light/dark theming |
| `header.js` | Active nav link, theme toggle, footer year |
| `publications.js` | Publications sort toggle + BibTeX copy |

## Editing

- Add a publication: copy an `<article class="pub-item" data-type="…" data-year="…">`
  block in `publications.html`. `data-type` is `journal`, `conference` or `thesis`.
  To show a **Code** link, add another `<a class="pub-action" …>` in `.pub-actions`.
- Theme, fonts and colours are CSS custom properties at the top of `style.css`.
