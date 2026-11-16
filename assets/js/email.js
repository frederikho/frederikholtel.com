// Spam protection: email addresses are not in the HTML source.
// Each <a class="js-email" data-u="…" data-d="…"> holds the user and domain
// parts reversed; this script rebuilds the mailto link in the browser.
// Without JavaScript, the link text ("name [at] domain") stays readable.
(function () {
  var rev = function (s) {
    return s.split("").reverse().join("");
  };
  var links = document.querySelectorAll("a.js-email");
  for (var i = 0; i < links.length; i++) {
    var a = links[i];
    var addr = rev(a.getAttribute("data-u")) + "@" + rev(a.getAttribute("data-d"));
    a.setAttribute("href", "mailto:" + addr);
    var label = a.querySelector(".js-email-text") || (a.children.length ? null : a);
    if (label) label.textContent = addr;
  }
})();
