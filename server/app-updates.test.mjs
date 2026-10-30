import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAndroidRelease, configureAppUpdates, checkAppUpdates, getUpdateSnapshot, downloadAppUpdate } from "../src/lib/app-updates.ts";

const release = (code = 100010) => ({ tag_name: `android-${code}`, draft: false, prerelease: false, assets: [{ name: "Tiffy.apk", browser_download_url: `https://github.com/kwilliams3/Tiffy-ai/releases/download/android-${code}/Tiffy.apk` }] });
test("update metadata rejects downgrades, drafts, prereleases and unexpected downloads", () => {
  assert.equal(parseAndroidRelease(release(), 1).code, 100010);
  for (const data of [null, {}, { ...release(), draft: true }, { ...release(), prerelease: true }, { ...release(), tag_name: "v1.2.3" }, { ...release(), assets: [{ name: "Tiffy.apk", browser_download_url: "https://evil.example/Tiffy.apk" }] }]) assert.equal(parseAndroidRelease(data, 1), null);
  assert.equal(parseAndroidRelease(release(), 100010), null);
  assert.equal(parseAndroidRelease(release(), 100011), null);
});
test("checking updates reads the installed native version and opens only a published APK", async context => {
  const opened = [];
  configureAppUpdates({ version: async () => ({ code: 1, name: "1.0" }), open: async url => opened.push(url) });
  context.mock.method(globalThis, "fetch", async url => {
    assert.equal(url, "https://api.github.com/repos/kwilliams3/Tiffy-ai/releases/latest");
    return Response.json(release());
  });
  await checkAppUpdates(); assert.equal(getUpdateSnapshot().status, "available");
  await downloadAppUpdate(); assert.deepEqual(opened, [release().assets[0].browser_download_url]);
});
test("network failure stays retryable and missing releases do not offer a download", async context => {
  let opens = 0;
  configureAppUpdates({ version: async () => ({ code: 10, name: "1.1.10" }), open: async () => { opens++; } });
  context.mock.method(globalThis, "fetch", async () => { throw new Error("Offline"); });
  await checkAppUpdates(); assert.equal(getUpdateSnapshot().status, "error"); await downloadAppUpdate(); assert.equal(opens, 0);
  globalThis.fetch = async () => new Response("", { status: 404 });
  await checkAppUpdates(); assert.equal(getUpdateSnapshot().status, "current");
});
