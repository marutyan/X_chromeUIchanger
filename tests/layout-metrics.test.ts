declare function require(name: string): any;

namespace LayoutMetricsTests {
  const assert = require("node:assert/strict");
  const test = require("node:test");

  test("既定設定（サイドバーあり・ヘッダー未計測）における境界値判定", () => {
    // 減算幅 = サイドバーフォールバック350px + GAP30px = 380px
    // 未拡張時(currentlyWide=false)のしきい値は利用可能幅610px（画面幅990px）
    assert.equal(Xcuic.resolveLayoutMode(500), "compact");
    assert.equal(Xcuic.resolveLayoutMode(800), "compact");
    assert.equal(Xcuic.resolveLayoutMode(989), "compact");
    assert.equal(Xcuic.resolveLayoutMode(990), "wide");
    assert.equal(Xcuic.resolveLayoutMode(1200), "wide");
  });

  test("ヒステリシスによる痙攣防止: 境界付近の wide/compact 判定の維持", () => {
    // wide状態(currentlyWide=true)では利用可能幅590px未満（画面幅970px未満）になるまでwideを維持
    assert.equal(Xcuic.resolveLayoutMode(980, { currentlyWide: true }), "wide");
    assert.equal(Xcuic.resolveLayoutMode(970, { currentlyWide: true }), "wide");
    assert.equal(Xcuic.resolveLayoutMode(969, { currentlyWide: true }), "compact");

    // compact状態(currentlyWide=false)では利用可能幅610px（画面幅990px）に達するまでcompactを維持
    assert.equal(Xcuic.resolveLayoutMode(970, { currentlyWide: false }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(980, { currentlyWide: false }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(989, { currentlyWide: false }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(990, { currentlyWide: false }), "wide");
  });

  test("サイドバーなし（hasSidebar: false）における境界値判定とヒステリシス", () => {
    // ヘッダー未計測、サイドバーなしの減算幅は0px
    // compact状態からの遷移（しきい値 610px）
    assert.equal(Xcuic.resolveLayoutMode(609, { hasSidebar: false, currentlyWide: false }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(610, { hasSidebar: false, currentlyWide: false }), "wide");

    // wide状態からの遷移（しきい値 590px）
    assert.equal(Xcuic.resolveLayoutMode(590, { hasSidebar: false, currentlyWide: true }), "wide");
    assert.equal(Xcuic.resolveLayoutMode(589, { hasSidebar: false, currentlyWide: true }), "compact");
  });

  test("ヘッダー実測幅あり・サイドバー実測幅ありにおける境界値判定", () => {
    // headerWidthPx=260 (+PADDING 20px = 280px), sidebarWidthPx=300 (+GAP 30px = 330px), 合計減算610px
    // compact状態: 画面幅 1219px (利用可能 609px) -> compact, 1220px (利用可能 610px) -> wide
    assert.equal(
      Xcuic.resolveLayoutMode(1219, {
        headerWidthPx: 260,
        sidebarWidthPx: 300,
        hasSidebar: true,
        currentlyWide: false,
      }),
      "compact",
    );
    assert.equal(
      Xcuic.resolveLayoutMode(1220, {
        headerWidthPx: 260,
        sidebarWidthPx: 300,
        hasSidebar: true,
        currentlyWide: false,
      }),
      "wide",
    );

    // wide状態: 画面幅 1200px (利用可能 590px) -> wide, 1199px (利用可能 589px) -> compact
    assert.equal(
      Xcuic.resolveLayoutMode(1200, {
        headerWidthPx: 260,
        sidebarWidthPx: 300,
        hasSidebar: true,
        currentlyWide: true,
      }),
      "wide",
    );
    assert.equal(
      Xcuic.resolveLayoutMode(1199, {
        headerWidthPx: 260,
        sidebarWidthPx: 300,
        hasSidebar: true,
        currentlyWide: true,
      }),
      "compact",
    );
  });

  test("ヘッダー実測幅あり・サイドバーなしにおける境界値判定", () => {
    // headerWidthPx=100 (+PADDING 20px = 120px), サイドバーなし, 合計減算120px
    // compact状態: 画面幅 729px (利用可能 609px) -> compact, 730px (利用可能 610px) -> wide
    assert.equal(
      Xcuic.resolveLayoutMode(729, {
        headerWidthPx: 100,
        hasSidebar: false,
        currentlyWide: false,
      }),
      "compact",
    );
    assert.equal(
      Xcuic.resolveLayoutMode(730, {
        headerWidthPx: 100,
        hasSidebar: false,
        currentlyWide: false,
      }),
      "wide",
    );

    // wide状態: 画面幅 710px (利用可能 590px) -> wide, 709px (利用可能 589px) -> compact
    assert.equal(
      Xcuic.resolveLayoutMode(710, {
        headerWidthPx: 100,
        hasSidebar: false,
        currentlyWide: true,
      }),
      "wide",
    );
    assert.equal(
      Xcuic.resolveLayoutMode(709, {
        headerWidthPx: 100,
        hasSidebar: false,
        currentlyWide: true,
      }),
      "compact",
    );
  });

  test("不正な入力（NaN, 負数, 0, Infinity）に対するフェイルセーフ動作", () => {
    assert.equal(Xcuic.resolveLayoutMode(Number.NaN), "compact");
    assert.equal(Xcuic.resolveLayoutMode(Number.NaN, { currentlyWide: true }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(-500), "compact");
    assert.equal(Xcuic.resolveLayoutMode(-500, { currentlyWide: true }), "compact");
    assert.equal(Xcuic.resolveLayoutMode(0), "compact");
    assert.equal(Xcuic.resolveLayoutMode(Infinity), "compact");
    assert.equal(Xcuic.resolveLayoutMode(-Infinity), "compact");
  });
}
