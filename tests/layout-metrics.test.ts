declare function require(name: string): any;

namespace LayoutMetricsTests {
  const assert = require("node:assert/strict");
  const test = require("node:test");

  test("compact判定: 幅がMIN_ACTIVE_WIDTH_PX(990)未満ではcompactがtrueになりタイムラインは最大600pxへクランプ", () => {
    const narrow = Xcuic.calculateLayoutMetrics(500);
    assert.equal(narrow.compact, true);
    assert.equal(narrow.mainWidthPx, 500);
    assert.equal(narrow.timelineWidthPx, 500);
    assert.equal(narrow.sidebarWidthPx, 350);
    assert.equal(narrow.canvasWidthPx, 500);

    const mid = Xcuic.calculateLayoutMetrics(800);
    assert.equal(mid.compact, true);
    assert.equal(mid.mainWidthPx, 800);
    assert.equal(mid.timelineWidthPx, 600);
    assert.equal(mid.sidebarWidthPx, 350);
    assert.equal(mid.canvasWidthPx, 800);

    const boundary = Xcuic.calculateLayoutMetrics(989);
    assert.equal(boundary.compact, true);
    assert.equal(boundary.mainWidthPx, 989);
    assert.equal(boundary.timelineWidthPx, 600);
    assert.equal(boundary.sidebarWidthPx, 350);
    assert.equal(boundary.canvasWidthPx, 989);
  });

  test("タイムライン幅の拡大: 990px以上でタイムラインが利用可能幅に応じて拡大", () => {
    // safeWidth = 990: available = 990 - 350 - 30 = 610 -> timelineWidthPx = 610
    const startWide = Xcuic.calculateLayoutMetrics(990);
    assert.equal(startWide.compact, false);
    assert.equal(startWide.mainWidthPx, 990);
    assert.equal(startWide.timelineWidthPx, 610);
    assert.equal(startWide.sidebarWidthPx, 350);
    assert.equal(startWide.canvasWidthPx, 990);

    // safeWidth = 1100: available = 1100 - 380 = 720
    const step1 = Xcuic.calculateLayoutMetrics(1100);
    assert.equal(step1.compact, false);
    assert.equal(step1.timelineWidthPx, 720);
    assert.equal(step1.canvasWidthPx, 1100);

    // safeWidth = 1200: available = 1200 - 380 = 820
    const step2 = Xcuic.calculateLayoutMetrics(1200);
    assert.equal(step2.compact, false);
    assert.equal(step2.timelineWidthPx, 820);
    assert.equal(step2.canvasWidthPx, 1200);

    // safeWidth = 1280: available = 1280 - 380 = 900 (MAX_TIMELINE_WIDTH_PX上限到達)
    const atMax = Xcuic.calculateLayoutMetrics(1280);
    assert.equal(atMax.compact, false);
    assert.equal(atMax.timelineWidthPx, 900);
    assert.equal(atMax.canvasWidthPx, 1280);
  });

  test("タイムライン幅のクランプ: 1280pxを超えてもタイムライン幅は最大900pxを維持", () => {
    // safeWidth = 1400: available = 1020 -> clamp to 900
    const wide1400 = Xcuic.calculateLayoutMetrics(1400);
    assert.equal(wide1400.compact, false);
    assert.equal(wide1400.timelineWidthPx, 900);
    assert.equal(wide1400.canvasWidthPx, 1280);

    // safeWidth = 1920: FHD
    const wideFHD = Xcuic.calculateLayoutMetrics(1920);
    assert.equal(wideFHD.compact, false);
    assert.equal(wideFHD.timelineWidthPx, 900);
    assert.equal(wideFHD.canvasWidthPx, 1280);

    // safeWidth = 2560: WQHD
    const wideWQHD = Xcuic.calculateLayoutMetrics(2560);
    assert.equal(wideWQHD.compact, false);
    assert.equal(wideWQHD.timelineWidthPx, 900);
    assert.equal(wideWQHD.canvasWidthPx, 1280);
  });

  test("サイドバー幅の維持: 任意の画面幅においてサイドバー幅350pxが常に維持される", () => {
    assert.equal(Xcuic.calculateLayoutMetrics(300).sidebarWidthPx, 350);
    assert.equal(Xcuic.calculateLayoutMetrics(700).sidebarWidthPx, 350);
    assert.equal(Xcuic.calculateLayoutMetrics(990).sidebarWidthPx, 350);
    assert.equal(Xcuic.calculateLayoutMetrics(1200).sidebarWidthPx, 350);
    assert.equal(Xcuic.calculateLayoutMetrics(1600).sidebarWidthPx, 350);
  });

  test("NaNおよび無効な入力に対するフェイルセーフ動作", () => {
    const nanMetrics = Xcuic.calculateLayoutMetrics(Number.NaN);
    assert.equal(nanMetrics.compact, true);
    assert.equal(nanMetrics.mainWidthPx, 0);
    assert.equal(nanMetrics.timelineWidthPx, 0);
    assert.equal(nanMetrics.sidebarWidthPx, 350);
    assert.equal(nanMetrics.canvasWidthPx, 0);

    const negMetrics = Xcuic.calculateLayoutMetrics(-500);
    assert.equal(negMetrics.compact, true);
    assert.equal(negMetrics.mainWidthPx, 0);
    assert.equal(negMetrics.timelineWidthPx, 0);
    assert.equal(negMetrics.sidebarWidthPx, 350);
    assert.equal(negMetrics.canvasWidthPx, 0);

    const infMetrics = Xcuic.calculateLayoutMetrics(Infinity);
    assert.equal(infMetrics.compact, true);
    assert.equal(infMetrics.mainWidthPx, 0);
    assert.equal(infMetrics.timelineWidthPx, 0);
    assert.equal(infMetrics.sidebarWidthPx, 350);
    assert.equal(infMetrics.canvasWidthPx, 0);
  });

  test("痙攣防止ヒステリシス: 境界付近(970-1010px)でのチャタリングを防止", () => {
    // wide状態のとき、980pxに一時的に縮んでも(スクロールバー等) compactに落ちない
    const wideAt980 = Xcuic.calculateLayoutMetrics(980, true);
    assert.equal(wideAt980.compact, false);

    // compact状態のとき、980pxではwideに突入しない
    const compactAt980 = Xcuic.calculateLayoutMetrics(980, false);
    assert.equal(compactAt980.compact, true);

    // 970px未満になったら確実にcompactへ移行する
    const enterCompact = Xcuic.calculateLayoutMetrics(960, true);
    assert.equal(enterCompact.compact, true);
  });
}
