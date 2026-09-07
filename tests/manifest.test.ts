declare function require(name: string): any;

namespace ManifestTests {
  const assert = require("node:assert/strict");
  const fs = require("node:fs");
  const test = require("node:test");

  interface Manifest {
    manifest_version: number;
    name?: string;
    version?: string;
    description?: string;
    permissions?: string[];
    action?: {
      default_title?: string;
      default_popup?: string;
    };
    content_scripts?: Array<{
      matches?: string[];
      js?: string[];
      css?: string[];
      run_at?: string;
    }>;
  }

  test("manifest uses MV3, limits permissions to storage, and matches X and Twitter hosts", () => {
    const manifest = JSON.parse(
      fs.readFileSync("dist/manifest.json", "utf8"),
    ) as Manifest;

    assert.equal(manifest.manifest_version, 3);
    assert.deepEqual(manifest.permissions, ["storage"]);

    const contentScript = manifest.content_scripts?.[0];
    assert.ok(contentScript !== undefined, "content_scripts should contain at least one entry");
    if (!contentScript) {
      return;
    }

    assert.deepEqual(contentScript.matches, [
      "https://x.com/*",
      "https://twitter.com/*",
    ]);
    assert.deepEqual(contentScript.js, ["content.js"]);
    assert.deepEqual(contentScript.css, ["content.css"]);
    assert.equal(contentScript.run_at, "document_idle");
  });
}
