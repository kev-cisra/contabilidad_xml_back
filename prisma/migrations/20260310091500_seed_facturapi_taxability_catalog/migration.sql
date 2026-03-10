INSERT INTO "facturapiTaxabilityCatalog" ("uuid", "code", "description", "createdAt", "updatedAt", "deletedAt")
VALUES
  ('a6505a0b-28d5-4f2a-a2ca-62af4c8b7401', '01', 'No objeto de impuesto.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('7b0f7f7a-2640-487f-b5bc-70d2f7e2e2b8', '02', 'Si objeto de impuesto.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('9d0a65c5-8c14-4341-801f-1fd9d76a07d5', '03', 'Si objeto de impuesto, pero no obligado a desglose.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('80f3af7b-67b4-4f20-884a-d4e4f563aa31', '04', 'Si objeto de impuesto, y no causa impuesto.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('67e2f0f6-78f2-4ef8-9f8b-bba58a4854b7', '05', 'Si objeto de impuesto, IVA credito PODEBI.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('9e373a17-6e2a-42d8-afcc-6af8e44b59cb', '06', 'Si objeto de impuesto, no IVA trasladado.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('f00eb1ff-3d09-46f4-a58f-86a2986e6476', '07', 'No traslado de IVA, pero desglose de IEPS.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('2af22c30-f22d-4cbe-af15-57769e0db6ff', '08', 'No traslado de IVA sin desglose de IEPS.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("code")
DO UPDATE SET
  "description" = EXCLUDED."description",
  "deletedAt" = NULL,
  "updatedAt" = CURRENT_TIMESTAMP;
