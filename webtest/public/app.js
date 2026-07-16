(function () {
  "use strict";

  var MAX_TOTAL_BYTES = 4 * 1024 * 1024;
  var injuryFiles = [];
  var docFiles = [];

  var $ = function (id) { return document.getElementById(id); };

  /* ===== Pain slider ===== */
  var pain = $("painScale");
  var painValue = $("painValue");
  function paintSlider() {
    var pct = (pain.value / 10) * 100;
    pain.style.background = "linear-gradient(to right, var(--red) " + pct + "%, var(--line) " + pct + "%)";
    painValue.textContent = pain.value;
  }
  pain.addEventListener("input", paintSlider);
  paintSlider();

  /* ===== Dropzones ===== */
  function wireDropzone(zoneId, inputId, listId, store, single) {
    var zone = $(zoneId);
    var input = $(inputId);
    var list = $(listId);

    function render() {
      list.innerHTML = "";
      store.forEach(function (f, i) {
        var li = document.createElement("li");
        var name = document.createElement("span");
        name.textContent = f.name;
        var size = document.createElement("span");
        size.className = "file-size";
        size.textContent = (f.size / 1024).toFixed(0) + " KB";
        var rm = document.createElement("button");
        rm.type = "button";
        rm.textContent = "remove";
        rm.setAttribute("aria-label", "Remove " + f.name);
        rm.addEventListener("click", function () {
          store.splice(i, 1);
          render();
          checkSize();
          updateRail();
        });
        li.appendChild(name);
        li.appendChild(size);
        li.appendChild(rm);
        list.appendChild(li);
      });
    }

    function addFiles(fileList) {
      var arr = Array.prototype.slice.call(fileList);
      if (single) { store.length = 0; arr = arr.slice(0, 1); }
      arr.forEach(function (f) { store.push(f); });
      render();
      checkSize();
      updateRail();
    }

    zone.addEventListener("click", function () { input.click(); });
    zone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    input.addEventListener("change", function () { addFiles(input.files); input.value = ""; });
    ["dragover", "dragenter"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add("drag"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove("drag"); });
    });
    zone.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) addFiles(e.dataTransfer.files);
    });
  }

  wireDropzone("injuryDrop", "injuryImage", "injuryFileList", injuryFiles, true);
  wireDropzone("docsDrop", "docsInput", "docsFileList", docFiles, false);

  function totalBytes() {
    return injuryFiles.concat(docFiles).reduce(function (s, f) { return s + f.size; }, 0);
  }

  function checkSize() {
    var hint = $("sizeHint");
    if (totalBytes() > MAX_TOTAL_BYTES) {
      hint.textContent = "Total uploads exceed 4 MB. Remove or compress a file before analyzing.";
      hint.classList.add("error");
      return false;
    }
    hint.textContent = "Attachments are sent securely for analysis. Keep total uploads under 4 MB.";
    hint.classList.remove("error");
    return true;
  }

  /* ===== Checkpoint rail ===== */
  function sectionComplete(name) {
    if (name === "profile") {
      return !!($("age").value || $("height").value || $("weight").value || $("activityLevel").value);
    }
    if (name === "injury") {
      return !!($("injuryLocation").value || $("injuryDescription").value || injuryFiles.length);
    }
    if (name === "records") return docFiles.length > 0;
    if (name === "notes") return !!$("additionalNotes").value;
    return false;
  }

  function updateRail() {
    var names = ["profile", "injury", "records", "notes"];
    var done = 0;
    names.forEach(function (n) {
      var st = document.querySelector('.station[data-station="' + n + '"]');
      if (sectionComplete(n)) { st.classList.add("done"); done += 1; }
      else { st.classList.remove("done"); }
    });
    var fill = $("railFill");
    var pct = (done / names.length) * 100;
    if (window.matchMedia("(max-width: 980px)").matches) {
      fill.style.width = pct + "%";
      fill.style.height = "100%";
    } else {
      fill.style.height = pct + "%";
      fill.style.width = "100%";
    }
  }

  document.querySelectorAll("input, select, textarea").forEach(function (el) {
    el.addEventListener("input", updateRail);
    el.addEventListener("change", updateRail);
  });
  window.addEventListener("resize", updateRail);
  updateRail();

  /* Active section highlight on scroll */
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var name = entry.target.getAttribute("data-section");
      var st = document.querySelector('.station[data-station="' + name + '"]');
      if (entry.isIntersecting) st.classList.add("active");
      else st.classList.remove("active");
    });
  }, { rootMargin: "-30% 0px -50% 0px" });
  document.querySelectorAll(".card[data-section]").forEach(function (s) { observer.observe(s); });

  /* ===== File encoding ===== */
  function readAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1]); };
      r.onerror = function () { reject(new Error("Could not read " + file.name)); };
      r.readAsDataURL(file);
    });
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(new Error("Could not read " + file.name)); };
      r.readAsText(file);
    });
  }

  /* ===== Pipeline UI ===== */
  function setStep(step, state) {
    var el = document.querySelector('.pipe-step[data-step="' + step + '"]');
    el.classList.remove("running", "done");
    if (state) el.classList.add(state);
  }

  /* ===== Submit ===== */
  var btn = $("analyzeBtn");
  btn.addEventListener("click", async function () {
    if (!checkSize()) return;

    var hasAnything = sectionComplete("profile") || sectionComplete("injury") ||
      sectionComplete("records") || sectionComplete("notes");
    if (!hasAnything) {
      var hint = $("sizeHint");
      hint.textContent = "Add at least some profile or injury information before analyzing.";
      hint.classList.add("error");
      return;
    }

    btn.disabled = true;
    btn.querySelector(".cta-text").textContent = "Analyzing...";
    var results = $("results");
    results.classList.add("hidden");
    results.innerHTML = "";
    var pipeline = $("pipeline");
    pipeline.classList.remove("hidden");
    setStep("note", "running"); setStep("profile", null); setStep("strategy", null);
    pipeline.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      // Pool inputs and encode files
      var textDocuments = [];
      var binaryFiles = [];

      for (var i = 0; i < docFiles.length; i++) {
        var f = docFiles[i];
        if (f.type === "text/plain" || /\.txt$/i.test(f.name)) {
          textDocuments.push({ name: f.name, content: await readAsText(f) });
        } else {
          binaryFiles.push({ name: f.name, mimeType: f.type || "application/pdf", data: await readAsBase64(f) });
        }
      }
      for (var j = 0; j < injuryFiles.length; j++) {
        var img = injuryFiles[j];
        binaryFiles.push({ name: "injury_" + img.name, mimeType: img.type, data: await readAsBase64(img) });
      }

      var payload = {
        userProfile: {
          age: $("age").value,
          sex: $("sex").value,
          height: $("height").value,
          weight: $("weight").value,
          activityLevel: $("activityLevel").value,
          conditions: $("conditions").value,
          implants: $("implants").value,
          medications: $("medications").value
        },
        injuryProfile: {
          location: $("injuryLocation").value,
          onset: $("injuryOnset").value,
          painScale: pain.value,
          description: $("injuryDescription").value
        },
        additionalNotes: $("additionalNotes").value,
        textDocuments: textDocuments,
        files: binaryFiles
      };

      setStep("note", "done");
      setStep("profile", "running");

      var profileRes = await fetch("/api/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var profileData = await profileRes.json();
      if (!profileRes.ok) throw new Error(profileData.error || "Profile analysis failed");

      setStep("profile", "done");
      setStep("strategy", "running");

      var strategyRes = await fetch("/api/analyze-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: profileData.sessionId, profile: profileData.profile })
      });
      var strategyData = await strategyRes.json();
      if (!strategyRes.ok) throw new Error(strategyData.error || "Strategy analysis failed");

      setStep("strategy", "done");
      renderResults(profileData.profile, strategyData.strategy);
    } catch (err) {
      results.innerHTML = "";
      var box = document.createElement("div");
      box.className = "result-error";
      box.textContent = "Analysis failed: " + err.message + ". Check that the backend is configured and try again.";
      results.appendChild(box);
      results.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.querySelector(".cta-text").textContent = "Analyze and recommend";
    }
  });

  /* ===== Results rendering ===== */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderResults(profile, strategy) {
    var results = $("results");
    results.innerHTML = "";

    var recommended = strategy.therapy_recommended === true;
    var verdict = el("div", "verdict" + (recommended ? "" : " negative"));
    var vTitle = recommended ? "Therapy recommended" : "Therapy not recommended yet";
    if (strategy.clinician_referral_needed === true) vTitle = "See a clinician first";
    verdict.appendChild(el("h3", null, vTitle));
    verdict.appendChild(el("p", null, strategy.verdict_summary || strategy.referral_reason || ""));
    if (strategy.clinician_referral_needed === true && strategy.referral_reason && strategy.verdict_summary) {
      verdict.appendChild(el("p", null, strategy.referral_reason));
    }
    results.appendChild(verdict);

    // SmartHeal protocol
    var proto = strategy.smartheal_protocol;
    if (proto && proto.applicable === true && Array.isArray(proto.sessions) && proto.sessions.length) {
      var pc = el("div", "protocol-card");
      pc.appendChild(el("h4", null, "SmartHeal protocol"));
      proto.sessions.forEach(function (s) {
        var sess = el("div", "session");
        sess.appendChild(el("div", "session-mode", s.mode || "Mode"));
        var params = el("div", "params");
        function addParam(label, value) {
          if (value == null || value === "" || value === "null") return;
          var p = el("span", "param");
          var b = el("b", null, label + " ");
          p.appendChild(b);
          p.appendChild(document.createTextNode(String(value)));
          params.appendChild(p);
        }
        addParam("TYPE", s.output_type);
        addParam("INTENSITY", s.intensity);
        addParam("DURATION", s.duration_minutes != null ? s.duration_minutes + " min" : null);
        addParam("FREQUENCY", s.frequency);
        addParam("PLACEMENT", s.placement);
        sess.appendChild(params);
        if (s.clinical_rationale) sess.appendChild(el("p", "session-why", s.clinical_rationale));
        pc.appendChild(sess);
      });
      results.appendChild(pc);
    }

    // Recommended therapies
    if (Array.isArray(strategy.recommended_therapies) && strategy.recommended_therapies.length) {
      var tc = el("div", "result-card");
      tc.appendChild(el("h4", null, "Recommended therapies"));
      strategy.recommended_therapies.forEach(function (t, i) {
        var item = el("div", "therapy-item");
        item.appendChild(el("span", "therapy-rank", String(t.rank || i + 1).padStart(2, "0")));
        var body = el("div");
        var name = el("span", "therapy-name", t.name || "Therapy");
        body.appendChild(name);
        var tag = el("span", "tag " + (t.smartheal_compatible ? "sh" : "alt"),
          t.smartheal_compatible ? "SMARTHEAL" : "OTHER EQUIPMENT");
        body.appendChild(tag);
        if (t.clinical_rationale) body.appendChild(el("p", "therapy-why", t.clinical_rationale));
        if (t.safety_notes) body.appendChild(el("p", "therapy-safety", t.safety_notes));
        item.appendChild(body);
        tc.appendChild(item);
      });
      results.appendChild(tc);
    }

    // Equipment guidance for non-SmartHeal therapies
    if (Array.isArray(strategy.equipment_guidance) && strategy.equipment_guidance.length) {
      var ec = el("div", "result-card");
      ec.appendChild(el("h4", null, "With your own equipment"));
      strategy.equipment_guidance.forEach(function (g) {
        var item = el("div", "equip-item");
        item.appendChild(el("div", "therapy-name", g.therapy || "Therapy"));
        if (g.equipment) {
          var l1 = el("p", "equip-line");
          l1.appendChild(el("b", null, "Use: "));
          l1.appendChild(document.createTextNode(g.equipment));
          item.appendChild(l1);
        }
        if (g.how_to) {
          var l2 = el("p", "equip-line");
          l2.appendChild(el("b", null, "How: "));
          l2.appendChild(document.createTextNode(g.how_to));
          item.appendChild(l2);
        }
        if (g.cautions) item.appendChild(el("p", "therapy-safety", g.cautions));
        ec.appendChild(item);
      });
      results.appendChild(ec);
    }

    // Extracted profile, collapsed
    var det = el("details", "profile-json");
    var sum = el("summary", null, "Extracted clinical profile");
    det.appendChild(sum);
    var pre = el("pre", null, JSON.stringify(profile, null, 2));
    det.appendChild(pre);
    results.appendChild(det);

    if (strategy.disclaimer) results.appendChild(el("p", "disclaimer", strategy.disclaimer));

    results.classList.remove("hidden");
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
})();
