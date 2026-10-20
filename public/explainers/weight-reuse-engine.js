/** One cartridge cradle, four token sleds. Batch size changes; the weight bank stays shared. */
const {
  Cam, clamp, disposer, facing, fit, hull, mk, open, pointer, poly, prism, proj,
  put, register, ringAt, rings, rrect, seg, solid, tdone, tset, tval, tween, unproj,
} = HL;

function mount({ stage, svg, read }, value) {
  const bag = disposer(), C = Cam(45, 0.5, 1.64);
  // Fit the fully engaged bank and the outer rail stops, including the feet.
  fit(C, [[-59, -48, 0], [-59, 48, 0], [100, -48, 0], [100, 48, 0],
    [-53, -40, 72], [-53, 40, 72]], 200, 166);
  const P = proj(C), front = facing(C), g = mk("g", {}, svg);
  let reach = value, active = -1;
  const rows = [-36, -12, 12, 36], parked = [61, 72, 57, 78];
  const bankLift = tween(0), plates = [], sleds = [];
  let lastLift = NaN;

  function block(parent, x0, y0, x1, y1, z0, z1, radius = 3) {
    const body = solid(parent), [ring, inner] = rings(x0, y0, x1, y1, radius, 0.8);
    put(body, prism(P, front, ring, inner, z0, z1));
    return body;
  }

  // Low shoes and a rounded socket bed hold the plates, rather than a floating stack.
  block(g, -57, -44, -8, -33, 0, 5, 4);
  block(g, -57, 33, -8, 44, 0, 5, 4);
  block(g, -59, -48, -6, 48, 4, 10, 6);
  const bank = mk("g", {}, g);
  const side = (q) => q.nu + 0.82 * q.nv > 0;
  for (let i = 0; i < 3; i++) {
    const x = -53 + i * 17, bottom = 12, top = 65 - i * 7;
    const grp = mk("g", {}, bank), body = solid(grp);
    const outline = rrect(-40, bottom, 40, top, 5, 7);
    const inner = rrect(-39, bottom + 1, 39, top - 1, 4, 7);
    const grip = mk("path", { class: "nf lo" }, grp);
    const contacts = mk("path", { class: "nf lo" }, grp);
    const Q = (y, z, t) => P(x + t, y, z);
    // These projected rest hulls never follow the moving cartridges.
    const hit = hull(ringAt(Q, outline, 0).concat(ringAt(Q, outline, 4)));
    plates.push({ x, top, outline, inner, body, grip, contacts, hit });
  }

  // A single transverse feed spine meets every rail, with a rounded socket at each lane.
  block(g, -10, -46, 2, 46, 8, 19, 4);
  rows.forEach((y) => block(g, -3, y - 7, 6, y + 7, 10, 14, 3));

  rows.forEach((y, i) => {
    const lane = mk("g", {}, g);
    block(lane, 3, y - 8, 100, y + 8, 5, 10, 5);
    // A recessed runner and a raised end stop make this a physical slide channel.
    mk("path", { d: poly(ringAt(P, rrect(8, y - 3, 94, y + 3, 3, 7), 10)), class: "nf lo" }, lane);
    block(lane, 92, y - 8, 100, y + 8, 10, 15, 3);
    const body = solid(lane), grip = mk("path", { class: "nf lo" }, lane);
    sleds.push({ y, i, body, grip, x: tween(parked[i]), last: NaN });
  });

  function drawBank(lift) {
    plates.forEach((p) => {
      const Q = (y, z, t) => P(p.x + t, y, z + lift);
      put(p.body, prism(Q, side, p.outline, p.inner, 0, 4));
      // A recessed pull slot and two connector grooves belong to each cartridge.
      p.grip.setAttribute("d", poly(rrect(-25, p.top - 14, 23, p.top - 8, 3, 7)
        .map((q) => Q(q.u, q.v, 4))));
      p.contacts.setAttribute("d", [-23, 18].map((y) => seg(Q(y, 15, 4), Q(y + 5, 15, 4))).join(""));
    });
  }

  function drawSled(s, x) {
    const [ring, inner] = rings(x - 9, s.y - 6.5, x + 9, s.y + 6.5, 6, 0.8);
    put(s.body, prism(P, front, ring, inner, 11, 18));
    // A short, recessed finger grip across the token sled's crown.
    s.grip.setAttribute("d", open(ringAt(P, rrect(x - 2, s.y - 3, x + 2, s.y + 3, 1.8, 5), 18)));
  }

  const B = register(stage, (_dt, now) => {
    const lift = tval(bankLift, now);
    let moving = !tdone(bankLift, now);
    if (lift !== lastLift) { drawBank(lift); lastLift = lift; }
    sleds.forEach((s) => {
      const x = tval(s.x, now);
      if (x !== s.last) { drawSled(s, x); s.last = x; }
      if (!tdone(s.x, now)) moving = true;
    });
    return moving;
  });
  bag.add(B.unregister);

  function targets(from) {
    const now = performance.now();
    tset(bankLift, active < 0 ? 0 : clamp(reach / 7, 0, 6.2), now, 0);
    sleds.forEach((s, i) => {
      const x = active > i ? clamp(56 - reach, 13, 48) : parked[i];
      tset(s.x, x, now, Math.abs(i - from) * 45);
    });
    B.wake();
  }

  function choose(a) {
    if (a === active) return;
    const from = Math.max(0, (a > 0 ? a : active) - 1);
    active = a;
    // One accent transfers from the bank at rest to the chosen row's sled.
    plates.forEach((p, i) => p.body.sil.classList.toggle("hi", a <= 0 && i === 2));
    sleds.forEach((s, i) => s.body.sil.classList.toggle("hi", a === i + 1));
    read.textContent = a < 0 ? "rest" : a === 0 ? "weights" : `${a} ${a === 1 ? "row" : "rows"}`;
    targets(from);
  }

  function inside(p, polygon) {
    let yes = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
    }
    return yes;
  }

  function hit(p) {
    // Test each resting crown first, then the stationary channel at its own height.
    for (let i = 3; i >= 0; i--) {
      const q = unproj(C, p[0], p[1], 18);
      if (Math.abs(q[0] - parked[i]) <= 10 && Math.abs(q[1] - rows[i]) <= 7.5) return i + 1;
    }
    const q = unproj(C, p[0], p[1], 10);
    for (let i = 3; i >= 0; i--) {
      if (q[0] >= 1 && q[0] <= 102 && Math.abs(q[1] - rows[i]) <= 9) return i + 1;
    }
    return plates.some((p0) => inside(p, p0.hit)) ? 0 : -1;
  }

  plates[2].body.sil.classList.add("hi");
  read.textContent = "rest";
  bag.add(pointer(stage, { move: (p) => choose(hit(p)), leave: () => choose(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: (v) => { reach = clamp(v, 8, 43); targets(Math.max(0, active - 1)); }, destroy: bag.dispose };
}

hairline({
  name: "weight-reuse-engine",
  means: "One slotted weight bank feeds four token rails; touch a rail to bring that many token rows to the same weights.",
  rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  range: [8, 28, 43],
  tour: [[150, 135], [289, 190], [225, 242], null],
  mount,
});
