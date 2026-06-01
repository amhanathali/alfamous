const fs = require("fs");
const path = "Fondements_civiques_societe_kabyle.html";
let s = fs.readFileSync(path, "utf8");
const m = s.match(/<div class="ddf-content">([\s\S]*)<\/div>\s*<\/div>\s*<script>/);
if (!m) throw new Error("parse fail");
const inner = m[1]
  .replace(/class="ddf-lang" data-lang-block="fr"/g, 'class="ddf-lang ddf-lang-fr"')
  .replace(/class="ddf-lang ddf-rtl" data-lang-block="ar"/g, 'class="ddf-lang ddf-lang-ar ddf-rtl"')
  .replace(/class="ddf-lang" data-lang-block="kab"/g, 'class="ddf-lang ddf-lang-kab"')
  .replace(/class="ddf-lang" data-lang-block="en"/g, 'class="ddf-lang ddf-lang-en"')
  .replace(/class="ddf-lang" data-lang-block="es"/g, 'class="ddf-lang ddf-lang-es"');

const style = `
<style>
/* Article Blogger — préfixe #ddfKabBlogger pour limiter l’impact sur le thème */
#ddfKabBlogger.ddf-article{
  font-family: Arial, Helvetica, sans-serif;
  color:#111827;
  background:#f6f7fb;
  padding:18px;
  border-radius:14px;
  border:1px solid #e5e7eb;
  max-width:100%;
}
#ddfKabBlogger *{ box-sizing:border-box; }
#ddfKabBlogger > input.ddf-radio{
  position:absolute !important;
  left:-9999px !important;
  width:1px !important;
  height:1px !important;
  opacity:0 !important;
  margin:0 !important;
}
#ddfKabBlogger .ddf-header{
  background:#ffffff;
  border:1px solid #e5e7eb;
  border-radius:14px;
  padding:16px;
  margin-bottom:14px;
}
#ddfKabBlogger .ddf-title{ margin:0 0 6px 0; font-size: 26px; line-height: 1.25; }
#ddfKabBlogger .ddf-subtitle{ margin:0 0 8px 0; color:#4b5563; font-size: 15px; line-height: 1.55; }
#ddfKabBlogger .ddf-langbar{ display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; align-items:center; }
#ddfKabBlogger .ddf-btn{
  border:1px solid #d1d5db; background:#ffffff; color:#111827;
  border-radius:10px; padding:8px 10px; font-weight:700; cursor:pointer; font-size:14px;
  display:inline-block; margin:0; font-family:inherit;
}
#ddfKabBlogger .ddf-btn:hover{ background:#f3f4f6; }
#ddfKabBlogger .ddf-content{
  background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; padding:16px;
}
#ddfKabBlogger .ddf-content > .ddf-lang{ display:none !important; }
#ddfKabBlogger #ddfKab-fr:checked ~ .ddf-content > .ddf-lang-fr,
#ddfKabBlogger #ddfKab-ar:checked ~ .ddf-content > .ddf-lang-ar,
#ddfKabBlogger #ddfKab-kab:checked ~ .ddf-content > .ddf-lang-kab,
#ddfKabBlogger #ddfKab-en:checked ~ .ddf-content > .ddf-lang-en,
#ddfKabBlogger #ddfKab-es:checked ~ .ddf-content > .ddf-lang-es{
  display:block !important;
}
#ddfKabBlogger #ddfKab-fr:checked ~ .ddf-header .ddf-langbar label[for="ddfKab-fr"],
#ddfKabBlogger #ddfKab-ar:checked ~ .ddf-header .ddf-langbar label[for="ddfKab-ar"],
#ddfKabBlogger #ddfKab-kab:checked ~ .ddf-header .ddf-langbar label[for="ddfKab-kab"],
#ddfKabBlogger #ddfKab-en:checked ~ .ddf-header .ddf-langbar label[for="ddfKab-en"],
#ddfKabBlogger #ddfKab-es:checked ~ .ddf-header .ddf-langbar label[for="ddfKab-es"]{
  background:#111827; color:#ffffff; border-color:#111827;
}
#ddfKabBlogger h2{ margin:16px 0 10px; font-size: 18px; }
#ddfKabBlogger h3{ margin:14px 0 8px; font-size: 16px; }
#ddfKabBlogger p{ margin:0 0 10px; line-height:1.7; }
#ddfKabBlogger ul{ margin:0 0 10px; padding-left:18px; }
#ddfKabBlogger li{ margin:7px 0; }
#ddfKabBlogger .ddf-note{
  margin: 10px 0 14px; padding: 12px; background:#f9fafb;
  border:1px solid #e5e7eb; border-left:4px solid #111827; border-radius:12px;
}
#ddfKabBlogger .ddf-pill{
  display:inline-flex; align-items:center; gap:8px; padding:8px 10px;
  border:1px solid #e5e7eb; border-radius:999px; background:#f9fafb; font-weight:700; margin:0 8px 8px 0;
}
#ddfKabBlogger .ddf-badge{
  width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center;
  border-radius:8px; font-weight:900;
}
#ddfKabBlogger .ddf-ok{ background:#e7f7ee; border:1px solid #b7e6cc; }
#ddfKabBlogger .ddf-no{ background:#fde8e8; border:1px solid #f8b4b4; }
#ddfKabBlogger .ddf-rtl{
  direction: rtl; text-align: right; unicode-bidi: isolate;
  font-family: "Noto Naskh Arabic","Amiri","Scheherazade New",serif;
  font-size: 16px; line-height: 1.95;
}
#ddfKabBlogger .ddf-rtl ul{ padding-right:18px; padding-left:0; }
#ddfKabBlogger .ddf-rtl .ddf-note{ border-left:none; border-right:4px solid #111827; }
@media print{
  #ddfKabBlogger .ddf-langbar{ display:none !important; }
  #ddfKabBlogger.ddf-article{ background:#fff; border:none; padding:0; }
  #ddfKabBlogger .ddf-header, #ddfKabBlogger .ddf-content{ border:1px solid #ddd; }
}
</style>
`;

const header = `<!--
  Fondements civiques — version ARTICLE BLOGGER (HTML + CSS, sans JavaScript)
  - Blogger : Nouvel article → mode HTML (<>)
  - Coller tout le contenu ci-dessous. Titre de l’article à saisir dans l’interface Blogger.
  - Choix de langue : radios + labels (compatible si Blogger supprime les <script>)
  - Si votre thème retire les <style> des billets, ajoutez le bloc <style>…</style> dans
    Mise en page → Modifier le HTML du thème (une fois), ou utilisez un gadget HTML.
-->

`;

const body = `<div class="ddf-article" id="ddfKabBlogger">
<input class="ddf-radio" type="radio" name="ddfKabLangBlogger" id="ddfKab-fr" checked="checked" />
<input class="ddf-radio" type="radio" name="ddfKabLangBlogger" id="ddfKab-ar" />
<input class="ddf-radio" type="radio" name="ddfKabLangBlogger" id="ddfKab-kab" />
<input class="ddf-radio" type="radio" name="ddfKabLangBlogger" id="ddfKab-en" />
<input class="ddf-radio" type="radio" name="ddfKabLangBlogger" id="ddfKab-es" />
<div class="ddf-header">
  <h1 class="ddf-title">Fondements civiques de la société kabyle</h1>
  <p class="ddf-subtitle">Neutralité active — texte multilingue (choisir une langue ci-dessous).</p>
  <div class="ddf-langbar" role="radiogroup" aria-label="Langue">
    <label class="ddf-btn" for="ddfKab-fr">Français</label>
    <label class="ddf-btn" for="ddfKab-ar">العربية</label>
    <label class="ddf-btn" for="ddfKab-kab">Kabyle</label>
    <label class="ddf-btn" for="ddfKab-en">English</label>
    <label class="ddf-btn" for="ddfKab-es">Español</label>
  </div>
</div>
<div class="ddf-content">${inner}</div>
</div>
`;

fs.writeFileSync("Fondements_civiques_societe_kabyle_BLOGGER.html", header + style + body, "utf8");
console.log("Wrote Fondements_civiques_societe_kabyle_BLOGGER.html");
