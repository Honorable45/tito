-- Many-to-many category/brand assignments
CREATE TABLE "_BrandToCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "_BrandToCategory_AB_unique" ON "_BrandToCategory"("A", "B");
CREATE INDEX "_BrandToCategory_B_index" ON "_BrandToCategory"("B");

ALTER TABLE "_BrandToCategory" ADD CONSTRAINT "_BrandToCategory_A_fkey"
FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_BrandToCategory" ADD CONSTRAINT "_BrandToCategory_B_fkey"
FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing product choices as category/brand assignments.
INSERT INTO "_BrandToCategory" ("A", "B")
SELECT DISTINCT p."brandId", p."categoryId"
FROM "Product" p
WHERE p."brandId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Default assignments for the three main category groups.
INSERT INTO "_BrandToCategory" ("A", "B")
SELECT b."id", c."id"
FROM "Brand" b
CROSS JOIN "Category" c
WHERE c."slug" IN ('smartphones', 'accessoires-telephoniques')
  AND b."slug" IN ('apple', 'samsung', 'xiaomi', 'redmi', 'tecno', 'infinix')
ON CONFLICT DO NOTHING;

INSERT INTO "_BrandToCategory" ("A", "B")
SELECT b."id", c."id"
FROM "Brand" b
CROSS JOIN "Category" c
WHERE c."slug" IN ('ordinateurs-portables', 'ordinateurs-de-bureau', 'accessoires-informatiques', 'ecrans-et-moniteurs', 'peripheriques')
  AND b."slug" IN ('apple', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'lg', 'sony')
ON CONFLICT DO NOTHING;

INSERT INTO "_BrandToCategory" ("A", "B")
SELECT b."id", c."id"
FROM "Brand" b
CROSS JOIN "Category" c
WHERE c."slug" = 'televiseurs'
  AND b."slug" IN ('samsung', 'lg', 'tcl', 'sony')
ON CONFLICT DO NOTHING;
