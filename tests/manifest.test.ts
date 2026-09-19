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

  test("content.css prevents scroll container corruption and preserves pill button interaction", () => {
    const cssContent = fs.readFileSync("dist/content.css", "utf8");

    // 1. html, body への overflow-x: hidden / overflow: hidden によるスクロールコンテナ二重化・仮想リスト破壊の防止
    assert.equal(
      /html\[data-xcuic-enabled="true"\][^\{]*body[^\{]*\{[^}]*overflow(-x)?\s*:\s*hidden/i.test(cssContent),
      false,
      "content.css must not set overflow-x: hidden on body, which creates nested scroll containers and breaks X virtual scroll",
    );

    // 2. 100vw の使用によるスクロールバー幅超過・横スクロール発生の防止
    assert.equal(
      cssContent.includes("100vw"),
      false,
      "content.css must not use 100vw, which exceeds available width when vertical scrollbar is present",
    );

    // 3. .xcuic-primary-column > div のような広範セレクタによるピルボタン・固定ヘッダー全幅化の防止
    assert.equal(
      cssContent.includes(".xcuic-primary-column > div"),
      false,
      "content.css must not target .xcuic-primary-column > div directly as it corrupts pill button wrappers",
    );

    // 4. ピルボタン (data-testid=pillLabel) のクリック操作性保護
    assert.ok(
      cssContent.includes('[data-testid="pillLabel"]'),
      "content.css should include protection rules for pill notification buttons",
    );

    // 5. ツイート内部のメディア・行/列構造に対する上書きの非適用
    //    （X が inline style で決める画像サイズを上書きするとサムネイルが幅 0 になる）
    const forbiddenPatterns = [
      "tweetPhoto",
      "xcuic-media-wrapper",
      "504px",
      "object-fit",
      ".xcuic-tweet-content",
      ".xcuic-tweet-row",
      ".xcuic-avatar-column",
    ];
    for (const pattern of forbiddenPatterns) {
      assert.equal(
        cssContent.includes(pattern),
        false,
        `content.css must not contain "${pattern}"; X が inline style で決める画像サイズを上書きするとサムネイルが幅 0 になる`,
      );
    }

    // 6. アバター要素に対する width: auto などの強制破壊スタイルの非適用
    assert.equal(
      /UserAvatar[^}]*width\s*:\s*auto/i.test(cssContent),
      false,
      "content.css must not set width: auto on avatars, which collapses avatar dimensions and causes blackout",
    );

    // 7. メインラッパーで space-between を使用しないこと（ズームアウト時のサイドバー吹き飛び防止）
    assert.equal(
      /xcuic-main-wrapper[^}]*justify-content\s*:\s*space-between/i.test(cssContent),
      false,
      "content.css must not use space-between on main-wrapper, which forces sidebar to drift away from timeline on zoom-out",
    );

    // 8. header[role="banner"] に margin-left: auto などの破壊的スタイルをあてず、X本来の左吸着Flexboxを維持すること
    assert.equal(
      /header\[role="banner"\][^\{]*\{[^}]*margin-left\s*:\s*auto/i.test(cssContent),
      false,
      "content.css must not set margin-left: auto on header, which breaks X standard responsive navigation and causes drifting",
    );

    // 9. ツイート下部アクションバー (div[role=group]) の全幅化ルールが存在すること
    assert.ok(
      /article\[data-testid="tweet"\]\s+div\[role="group"\]/i.test(cssContent),
      "content.css should expand tweet action bar to eliminate right-side whitespace gap",
    );

    // 10. アバターの 40px 厳格保護ルールが存在すること（巨大化・ブラックアウト防止）
    assert.ok(
      /UserAvatar[^}]*width\s*:\s*40px\s*!important/i.test(cssContent),
      "content.css must strictly lock avatar dimensions to 40px to prevent distortion and content squashing",
    );

    // 11. wide / compact モードに基づく相対レイアウト制御が存在すること
    assert.ok(
      cssContent.includes('[data-xcuic-layout="wide"]'),
      "content.css should apply expanded widths only under wide layout",
    );
    assert.ok(
      cssContent.includes('[data-xcuic-layout="compact"]'),
      "content.css should respect compact layout for zoom-in responsive safety",
    );

    // 12. 左ナビ (header[role=banner]) は伸長せず左端に固定し、幅は X のナビ列の内容幅に任せること
    //     （固定 px 幅を与えると X の列幅 275px/88px と食い違い、ナビが主カラムに重なる）
    assert.ok(
      /header\[role="banner"\][^\{]*\{[^}]*flex\s*:\s*0 0 auto\s*!important/i.test(cssContent),
      "content.css must set flex: 0 0 auto on header so it docks left without growing",
    );
    assert.equal(
      /header\[role="banner"\][^\{]*\{[^}]*width\s*:\s*\d+px/i.test(cssContent),
      false,
      "content.css must not force a fixed pixel width on header; X's own nav column width must decide it",
    );

    // 13. ズームイン時・狭画面時 (max-width: 1000px) にサイドバーを非表示にするルールが存在すること
    assert.ok(
      /@media\s*\(max-width:\s*1000px\)[^\{]*\{[^}]*sidebarColumn[^}]*display\s*:\s*none\s*!important/i.test(cssContent),
      "content.css must hide sidebarColumn at max-width: 1000px to prevent layout crashing on zoom-in",
    );

    // 14. スレッド連結線（リプライアバター下の2px縦線）の保護ルールが存在すること（巨大グレー四角化防止）
    assert.ok(
      /article\[data-testid="tweet"\]\s*:is\(div,\s*span\)\[style\*="width:\s*2px"\]/i.test(cssContent),
      "content.css must protect thread connecting line with 2px width lock to prevent giant grey rectangle bug",
    );

    // 15. アバター直下のスレッド連結線に誤爆する無差別兄弟セレクタ (div:has(...) ~ div / + div) が存在しないこと
    assert.equal(
      /UserAvatar[^}]*~ div/i.test(cssContent),
      false,
      "content.css must not use UserAvatar ~ div selector which corrupts thread connecting lines",
    );
    assert.equal(
      /UserAvatar[^}]*\+ div/i.test(cssContent),
      false,
      "content.css must not use UserAvatar + div selector which corrupts thread connecting lines",
    );

    // 16. アバターの上部固定 (align-self: flex-start) ルールが存在すること（垂直中央浮遊防止）
    assert.ok(
      /UserAvatar[^}]*align-self\s*:\s*flex-start\s*!important/i.test(cssContent),
      "content.css must lock avatars to align-self: flex-start to prevent vertical centering bug",
    );

    // 17. --xcuic-max-timeline が出現しないこと
    assert.equal(
      cssContent.includes("--xcuic-max-timeline"),
      false,
      "content.css must not contain --xcuic-max-timeline",
    );
  });
}
