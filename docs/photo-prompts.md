# Photo prompt sheet — AI-generated cut photos

In plain words: the licensed photo sites don't have good pictures of every cut. These prompts produce a consistent
set in the marble-and-timber style. Generate them in the image tool you use, keep the file names below, drop the
files into `public/catalog/products/`. AI images must be shown with a small "illustration" label — that label is not
built yet, so add it before the first AI image goes live.

## House style (paste before every prompt)

> Overhead-to-45° food photograph of a single raw kosher cut on a pale grey Carrara marble slab with a thin walnut
> board edge at one side. Soft north-facing daylight from the left, gentle shadows, no props except a pinch of coarse
> salt. Natural colour, crisp fat and grain detail, shallow depth of field, 4:5 portrait, no text, no logos, no
> hands, no packaging, no pork, no dairy, no cooked food.

## The missing five (first priority)

| File | Prompt (after the house style) |
|---|---|
| `soup-bones-chicken.jpg` | Raw chicken backs and necks, pale pink with some skin, loosely piled for stock. |
| `turkey-wings.jpg` | Two large raw turkey wings, skin on, jointed into drumette and flat. |
| `lamb-neck.jpg` | Five raw lamb neck slices, cross-cut with the round bone in the centre, rosy meat, white fat rim. |
| `merguez.jpg` | A coil of thin raw merguez sausages made of beef and lamb, deep red with paprika, natural lamb casing. |
| `pesach-bundle.jpg` | A raw assortment on marble: a whole chicken, a piece of brisket, beef shoulder cubes and ground beef in a small bowl, a sheet of matzah at the edge. |

## Second photos per cut (gallery)

For each product, a second image with the same light: `<slug>-2.jpg` showing the cut sliced across the grain (steaks,
roasts) or portioned (poultry). Start with the best sellers: entrecote, beef-fillet, asado, pargiyot, chicken-breast,
aged-entrecote-28.

## Check before publishing

- It must look like the product named — ask a butcher if unsure.
- Nothing that reads as pork (pale pink loin with a thick rind), no visible branding, no cooked food.
- Keep the licence terms of the tool you used; note the tool in `public/catalog/CREDITS.json` with `"ai": true`.
