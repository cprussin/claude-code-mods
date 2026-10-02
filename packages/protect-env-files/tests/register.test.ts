import { describe, expect, test } from "claude-code/testing";

describe("protect-env-files", () => {
  test("denies an edit to a .env file", async ($, on) => {
    on("tool.call", () => ({ result: "edited" }));
    const ran = await $.tool.call({
      file_path: "/repo/.env.local",
      new_string: "b",
      old_string: "a",
      tool: "Edit",
    });
    expect(ran).toEqual({
      deny: "protect-env-files: /repo/.env.local is protected.",
    });
  });

  test("lets an edit to any other file through", async ($, on) => {
    on("tool.call", () => ({ result: "edited" }));
    const ran = await $.tool.call({
      file_path: "/repo/environment.ts",
      new_string: "b",
      old_string: "a",
      tool: "Edit",
    });
    expect(ran.deny).toBeUndefined();
  });
});
