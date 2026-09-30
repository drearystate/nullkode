# Original generated image library

This collection was created with the built-in imagegen tool for the platform's 18 original template themes. The individual prompts and intended subjects are recorded in `generated-image-prompts.json`.

- Optimized images: `public/media/generated/*.webp`.
- Editor thumbnails: `public/media/generated/thumbs/*.webp`.
- Full-resolution generated PNGs in this working checkout: `output/imagegen/*.png`.
- Catalog, descriptions, tags and exact template bindings: `src/lib/assets/generated-catalog.json`.
- Visual gallery: `public/media/generated/index.html`.

The collection contains 54 independently generated pictures. Fifty-one replace corresponding photo slots in the original templates; three extra workspace/writer still lifes are available in the image picker. Gallery thumbnails are resized copies, not additional generated pictures.

The images are fictional illustrative assets. Portraits do not document real staff or customers, and property/travel images do not document real listings or exact destinations. Operators should replace sample imagery and sample business content with their own material where factual representation matters.

Template registration applies exact URL mappings to the original templates' pages and module seed values. This also keeps product/listing photos consistent between a designed page and its seeded module. It does not rewrite previously created customer projects or change purchased theme assets. Existing original photos and their credit files are retained.

Both AI builders and the AI page editor also receive a relevant shortlist (three images for small-context models, up to six otherwise), without extra model calls.

Asset search returns tagged local images first, with an Originals filter for this collection alone. No random-image fallback is used. Configured external image services and the private installation's purchased stock library remain available in the general search.

The source release includes the optimized images, thumbnails, catalog and prompts. Full-resolution working PNGs are not required at runtime. To check the collection, run `pnpm exec tsx scripts/check-generated-images.ts`. To refresh actual template previews and check mobile overflow and broken images, run `pnpm exec tsx scripts/render-original-templates.ts`.

Validated on 2026-09-30: 54 unique WebP images and their thumbnails, 51 exact template assignments, and relevant image selection passed the asset checks. Browser checks passed for all 18 original templates and their 45 designed pages, plus gallery filtering and asset search. The optimized library including thumbnails occupies approximately 12 MB. Browser evidence is saved in `output/image-review/` in this working checkout.
