/*
 * Saves a file a page made in the browser (a blob: link, such as a contact
 * card or a CSV). MainActivity runs this in the page with the link's address,
 * a one-time token and a size limit, only on the app's own addresses. It
 * reads the file and hands it to the app, which asks where to save it. The
 * file's name comes from the link's download attribute when there is one.
 */
(function (url, token, maxBytes) {
  var bridge = window.NativeFiles;
  if (!bridge) return;
  function fail(why) {
    try { bridge.failed(token, String(why || "")); } catch (e) { /* the app is gone */ }
  }
  var name = "";
  try {
    var links = document.querySelectorAll("a[download]");
    for (var i = 0; i < links.length; i++) {
      if (links[i].href === url) { name = links[i].getAttribute("download") || ""; break; }
    }
  } catch (e) { /* no name, the app picks one */ }
  fetch(url)
    .then(function (response) { return response.blob(); })
    .then(function (blob) {
      if (blob.size > maxBytes) { fail("too-big"); return; }
      var reader = new FileReader();
      reader.onload = function () { bridge.save(token, String(reader.result), name, blob.type || ""); };
      reader.onerror = function () { fail("read"); };
      reader.readAsDataURL(blob);
    })
    .catch(function () { fail("fetch"); });
})
