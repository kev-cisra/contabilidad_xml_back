import assert from "node:assert/strict";
import test from "node:test";
import {
  ModuleCode,
  SubscriptionStatus,
  canCreateUser,
  canIssueCfdi,
  moduleDecision,
  permissionDecision,
  subscriptionDecision,
  type AbilityContext,
} from "@contabilidad/shared-rules";

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

function buildAbility(overrides?: Partial<AbilityContext>): AbilityContext {
  return {
    tenant: {
      id: "1",
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionExpiresAt: futureDate,
      userLimit: 2,
    },
    tenantModules: [
      { code: ModuleCode.facturacion, isEnabled: true, expiresAt: futureDate },
      { code: ModuleCode.import_xml, isEnabled: true, expiresAt: futureDate },
    ],
    user: {
      id: "10",
      empresaId: "1",
      isOwner: false,
      isActive: true,
    },
    roles: [
      {
        role: { id: "role_staff", name: "STAFF" },
        permissions: [{ permission: "facturacion.read" }],
      },
    ],
    userModules: [ModuleCode.facturacion],
    ...overrides,
  };
}

test("subscriptionDecision permite tenant activo y no vencido", () => {
  const decision = subscriptionDecision({
    id: "1",
    subscriptionStatus: SubscriptionStatus.active,
    subscriptionExpiresAt: futureDate,
    userLimit: 2,
  });

  assert.equal(decision.ok, true);
});

test("subscriptionDecision bloquea tenant vencido", () => {
  const decision = subscriptionDecision({
    id: "1",
    subscriptionStatus: SubscriptionStatus.trial,
    subscriptionExpiresAt: pastDate,
    userLimit: 2,
  });

  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "SUBSCRIPTION_INACTIVE");
  }
});

test("moduleDecision bloquea modulo no asignado al usuario", () => {
  const ability = buildAbility({ userModules: [] });
  const decision = moduleDecision(ability, ModuleCode.facturacion);

  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "MODULE_NOT_ASSIGNED");
  }
});

test("moduleDecision permite owner aunque no tenga userModules", () => {
  const ability = buildAbility({
    user: {
      id: "10",
      empresaId: "1",
      isOwner: true,
      isActive: true,
    },
    userModules: [],
  });

  const decision = moduleDecision(ability, ModuleCode.facturacion);
  assert.equal(decision.ok, true);
});

test("permissionDecision bloquea cuando falta permiso", () => {
  const ability = buildAbility({
    roles: [{ role: { id: "role_none", name: "NONE" }, permissions: [] }],
  });

  const decision = permissionDecision(ability, "facturacion.download");
  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "FORBIDDEN");
  }
});

test("permissionDecision permite owner bypass de permisos", () => {
  const ability = buildAbility({
    user: {
      id: "10",
      empresaId: "1",
      isOwner: true,
      isActive: true,
    },
    roles: [{ role: { id: "role_none", name: "NONE" }, permissions: [] }],
  });

  const decision = permissionDecision(ability, "facturacion.cancel_invoice");
  assert.equal(decision.ok, true);
});

test("canCreateUser falla al llegar al limite", () => {
  const decision = canCreateUser(
    {
      id: "1",
      subscriptionStatus: SubscriptionStatus.active,
      subscriptionExpiresAt: futureDate,
      userLimit: 2,
    },
    2
  );

  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "USER_LIMIT_REACHED");
  }
});

test("canIssueCfdi en test requiere org y api key", () => {
  const decision = canIssueCfdi({
    env: "test",
    hasOrganization: true,
    hasCustomer: true,
    hasApiKey: true,
    hasCertificate: false,
    organizationStatus: null,
  });

  assert.equal(decision.ok, true);
});

test("canIssueCfdi requiere cliente de Facturapi", () => {
  const decision = canIssueCfdi({
    env: "test",
    hasOrganization: true,
    hasCustomer: false,
    hasApiKey: true,
    hasCertificate: false,
    organizationStatus: null,
  });

  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "NO_CUSTOMER");
  }
});

test("canIssueCfdi en live requiere CSD", () => {
  const decision = canIssueCfdi({
    env: "live",
    hasOrganization: true,
    hasCustomer: true,
    hasApiKey: true,
    hasCertificate: false,
    organizationStatus: "active",
  });

  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(decision.code, "NO_CSD");
  }
});
