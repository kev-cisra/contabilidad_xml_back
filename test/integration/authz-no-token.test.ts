import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../../src/app";

test("GET /emisores sin token responde 401 UNAUTHORIZED", async () => {
  const response = await request(app).get("/emisores");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "UNAUTHORIZED");
});

test("GET /auth/me/ability sin token responde 401 UNAUTHORIZED", async () => {
  const response = await request(app).get("/auth/me/ability");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "UNAUTHORIZED");
});

test("DELETE /emisores/:emisorUuid sin token responde 401 UNAUTHORIZED", async () => {
  const response = await request(app).delete("/emisores/emisor-demo");

  assert.equal(response.status, 401);
  assert.equal(response.body.code, "UNAUTHORIZED");
});
