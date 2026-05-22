const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const ytbScrape = require("../../src/utils/ytb-scrape");

describe("scheduler/ytb-scrape", () => {
  it("parseYoutubeLivePage detects live markers and videoId", () => {
    const html = `
      "isLive":true
      "videoId":"dQw4w9WgXcQ"
      "viewCount":{"videoViewCountRenderer":{"viewCount":{"runs":[{"text":"1,234"}]}}
    `;
    const result = ytbScrape.parseYoutubeLivePage(html);
    assert.equal(result.isLive, true);
    assert.equal(result.videoId, "dQw4w9WgXcQ");
    assert.equal(result.viewers, 1234);
  });

  it("parseYoutubeLivePage returns off when no live markers", () => {
    const result = ytbScrape.parseYoutubeLivePage("<html></html>");
    assert.equal(result.isLive, false);
    assert.equal(result.videoId, null);
  });

  it("parseYouTubeNumber strips separators", () => {
    assert.equal(ytbScrape.parseYouTubeNumber("1,234"), 1234);
    assert.equal(ytbScrape.parseYouTubeNumber("12.345"), 12345);
  });

  it("buildLivePageUrl requires UC channel id", () => {
    assert.throws(() => ytbScrape.buildLivePageUrl("invalid"), /UC/);
    assert.equal(
      ytbScrape.buildLivePageUrl("UCxxxxxxxxxxxxxxxxxxxxxx"),
      "https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx/live",
    );
  });
});
