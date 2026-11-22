"""
Even Realities G1, path-traced in Blender Cycles for the website: a luxury product shot, not a real-time render.

  blender -b --factory-startup --python tools/render/g1.py -- --shot hero --w 1920 --h 1080 --samples 256 --out out.png
  shots: hero (wide, glasses right of centre), square (centred; the turntable's first frame), linux (desktop in the
         lenses), macro (hinge and lens close up), studio (low and wide), turn (hero framing; --angle sets the turn),
         memory / memory-tall (a Vox Amelior memory in the lenses, for the film), spin (a seamless 360° turntable:
         --frames N renders frames --from..--to into --out as a folder; existing frames are skipped, so it resumes)

Real scale (metres), modelled from the G1's product photos: the square frame (G1 B), its rectangular lenses with
softened corners and a bottom edge that tapers toward the nose, squared metal hinge blocks,
flat temples that dip near the ear and end in battery pods with a touch panel. The lenses are coated optical glass
(thin-film AR coating), the frame satin gunmetal titanium, the hinges polished. The display is green text inside the
lenses. Lit like a studio product shot: a key softbox, strip lights for rim highlights, a black acrylic floor.
"""

import bpy
import bmesh
import math
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {"shot": "hero", "w": "1600", "h": "900", "samples": "96", "out": "/tmp/g1.png", "angle": "0", "hud": "", "hudscale": "1",
       "frames": "240", "from": "0", "to": "-1"}
for i in range(0, len(argv) - 1, 2):
    opt[argv[i].lstrip("-")] = argv[i + 1]
SHOT = opt["shot"]
W, H, SAMPLES = int(opt["w"]), int(opt["h"]), int(opt["samples"])

scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)


# ── Materials ─────────────────────────────────────────────────────────────────
def principled(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    for k, v in inputs.items():
        if k in bsdf.inputs:
            bsdf.inputs[k].default_value = v
    return m, bsdf


def with_grain(m, bsdf, lo, hi, scale=900.0):
    """Micro-variation in roughness: brushed metal is never perfectly even."""
    nt = m.node_tree
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = lo
    ramp.inputs["To Max"].default_value = hi
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])


frame_m, b = principled("Gunmetal titanium", **{"Base Color": (0.028, 0.03, 0.033, 1), "Metallic": 1.0, "Roughness": 0.24,
                                               "Anisotropic": 0.35, "Coat Weight": 0.25, "Coat Roughness": 0.08})
with_grain(frame_m, b, 0.2, 0.28)
hinge_m, b = principled("Polished titanium", **{"Base Color": (0.62, 0.62, 0.64, 1), "Metallic": 1.0, "Roughness": 0.12})
with_grain(hinge_m, b, 0.1, 0.16, 1400)
pod_m, b = principled("Pod", **{"Base Color": (0.03, 0.032, 0.035, 1), "Metallic": 0.85, "Roughness": 0.36, "Coat Weight": 0.12, "Coat Roughness": 0.25})
touch_m, _ = principled("Touch glass", **{"Base Color": (0.02, 0.022, 0.024, 1), "Roughness": 0.08, "Coat Weight": 1.0, "Coat Roughness": 0.02})
lens_m, _ = principled("Coated lens", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.0, "IOR": 1.52, "Transmission Weight": 1.0,
                                         "Thin Film Thickness": 290.0, "Thin Film IOR": 1.38})
pad_m, _ = principled("Silicone", **{"Base Color": (0.8, 0.82, 0.82, 1), "Roughness": 0.35, "Transmission Weight": 0.6,
                                     "Subsurface Weight": 0.3, "IOR": 1.41})
floor_m, _ = principled("Black acrylic", **{"Base Color": (0.003, 0.0035, 0.0035, 1), "Roughness": 0.035, "Specular IOR Level": 0.16})

hud_m = bpy.data.materials.new("Display")
hud_m.use_nodes = True
nt = hud_m.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
em = nt.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (0.28, 1.0, 0.56, 1)
em.inputs["Strength"].default_value = 9.0
out = nt.nodes.new("ShaderNodeOutputMaterial")
nt.links.new(em.outputs[0], out.inputs[0])
dim_m = hud_m.copy()
dim_m.node_tree.nodes["Emission"].inputs["Strength"].default_value = 2.5


# ── Helpers ───────────────────────────────────────────────────────────────────
def link(obj, parent=None):
    scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def mesh_object(name, bm, mat, parent=None, smooth=True, sharp=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if smooth:
        me.shade_smooth()
    if sharp:
        me.set_sharp_from_angle(angle=sharp)
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    return link(ob, parent)


def rounded_box(name, sx, sy, sz, bevel, mat, parent=None, segments=4):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    ob = mesh_object(name, bm, mat, parent, smooth=True, sharp=0.6)
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width = bevel
    mod.segments = segments
    mod.harden_normals = True
    return ob


def superellipse(w, h, n=2.3, count=128, taper=0.0):
    """A rounded rectangle (n > 2 squares it off). taper narrows the bottom edge, as square frames do toward the nose."""
    pts = []
    for i in range(count):
        t = i / count * math.tau
        c, s = math.cos(t), math.sin(t)
        x, z = (w / 2) * math.copysign(abs(c) ** (2 / n), c), (h / 2) * math.copysign(abs(s) ** (2 / n), s)
        if z < 0:
            x *= 1 - taper * (-z / (h / 2)) ** 2
        pts.append((x, z))
    return pts


def outline_normals(pts):
    out = []
    n = len(pts)
    for i in range(n):
        ax, ay = pts[i - 1]
        bx, by = pts[(i + 1) % n]
        tx, ty = bx - ax, by - ay
        l = math.hypot(tx, ty) or 1
        out.append((ty / l, -tx / l))
    return out


# ── The glasses (x right, z up, front faces -y, temples run to +y) ───────────
G = bpy.data.objects.new("G1", None)
link(G)

LW, LH, GAP = 0.051, 0.039, 0.018
CX = LW / 2 + GAP / 2
outline = superellipse(LW, LH, n=3.9, taper=0.09)
normals = outline_normals(outline)

# Rim: a rounded-rectangle profile swept round each lens: flat front face, softened edges
r = 0.0011
o0, o1, y0, y1 = -0.0009, 0.0031, -0.0022, 0.0022
profile = []
for (cx, cy, a0, a1) in [(o1 - r, y0 + r, -90, 0), (o1 - r, y1 - r, 0, 90), (o0 + r, y1 - r, 90, 180), (o0 + r, y0 + r, 180, 270)]:
    for k in range(6):
        a = math.radians(a0 + (a1 - a0) * k / 5)
        profile.append((cx + r * math.cos(a), cy + r * math.sin(a)))

for side in (-1, 1):
    bm = bmesh.new()
    rings = []
    for (px, pz), (nx, nz) in zip(outline, normals):
        ring = []
        for (d, depth) in profile:
            ring.append(bm.verts.new((side * CX + px + nx * d, depth, pz + nz * d)))
        rings.append(ring)
    m = len(profile)
    for i in range(len(rings)):
        a, b2 = rings[i], rings[(i + 1) % len(rings)]
        for j in range(m):
            bm.faces.new((a[j], a[(j + 1) % m], b2[(j + 1) % m], b2[j]))
    mesh_object(f"Rim {side}", bm, frame_m, G)

    # Lens: a gently domed disc, solidified to real thickness
    bm = bmesh.new()
    centre = bm.verts.new((side * CX, -0.0012, 0))
    RINGS = 14
    grid = []
    for k in range(1, RINGS + 1):
        f = k / RINGS
        row = []
        for (px, pz) in outline:
            x, z = px * f * 0.985, pz * f * 0.985
            dome = -0.0012 * (1 - f * f)
            row.append(bm.verts.new((side * CX + x, dome, z)))
        grid.append(row)
    n = len(outline)
    for i in range(n):
        bm.faces.new((centre, grid[0][i], grid[0][(i + 1) % n]))
    for k in range(RINGS - 1):
        for i in range(n):
            bm.faces.new((grid[k][i], grid[k + 1][i], grid[k + 1][(i + 1) % n], grid[k][(i + 1) % n]))
    lens = mesh_object(f"Lens {side}", bm, lens_m, G)
    sol = lens.modifiers.new("Thickness", "SOLIDIFY")
    sol.thickness = 0.0019
    sol.offset = 0

    # Nose pad on a fine metal arm behind the bridge
    pad = rounded_box(f"Pad {side}", 0.0022, 0.0034, 0.0072, 0.001, pad_m, G, segments=5)
    pad.location = (side * (GAP / 2 + 0.0015), 0.0085, -0.006)
    pad.rotation_euler = (0, math.radians(side * -18), 0)
    arm = rounded_box(f"Pad arm {side}", 0.0009, 0.007, 0.0009, 0.0003, hinge_m, G, segments=2)
    arm.location = (side * (GAP / 2 + 0.0006), 0.005, -0.002)

# Bridge: a fine arched bar between the rims
bridge = bpy.data.curves.new("Bridge", "CURVE")
bridge.dimensions = "3D"
bridge.bevel_depth = 0.0016
bridge.bevel_resolution = 6
sp = bridge.splines.new("BEZIER")
sp.bezier_points.add(2)
pts = [(-GAP / 2 - 0.0012, 0, LH * 0.13), (0, -0.0008, LH * 0.26), (GAP / 2 + 0.0012, 0, LH * 0.13)]
for bp, p in zip(sp.bezier_points, pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = "AUTO"
bob = bpy.data.objects.new("Bridge", bridge)
bob.data.materials.append(frame_m)
link(bob, G)

# Hinges, temples, the dip and the battery pods
ARM_Z = LH * 0.27
for side in (-1, 1):
    hx = side * (CX + LW / 2 + 0.0034)
    hinge = rounded_box(f"Hinge {side}", 0.0062, 0.016, 0.0085, 0.0011, hinge_m, G)
    hinge.location = (hx, 0.005, ARM_Z)
    screw = bpy.data.meshes.new("screw")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0011, radius2=0.0011, depth=0.0006)
    screwo = mesh_object(f"Screw {side}", bm, frame_m, G)
    screwo.location = (hx, 0.009, ARM_Z + 0.0045)

    L1 = 0.095
    temple = rounded_box(f"Temple {side}", 0.0021, L1, 0.0056, 0.0008, frame_m, G)
    temple.location = (hx, 0.012 + L1 / 2, ARM_Z)

    dip = bpy.data.objects.new(f"Dip {side}", None)
    link(dip, G)
    dip.location = (hx, 0.012 + L1, ARM_Z)
    dip.rotation_euler = (math.radians(-13), 0, 0)
    d = rounded_box(f"Dip arm {side}", 0.0021, 0.02, 0.0056, 0.0008, frame_m, dip)
    d.location = (0, 0.01, 0)
    pod = bpy.data.objects.new(f"Pod pivot {side}", None)
    link(pod, dip)
    pod.location = (0, 0.02, 0)
    pod.rotation_euler = (math.radians(-12), 0, 0)
    body = rounded_box(f"Pod {side}", 0.0068, 0.034, 0.0125, 0.0028, pod_m, pod, segments=6)
    body.location = (0, 0.017, -0.003)
    panel = rounded_box(f"Touch {side}", 0.0006, 0.024, 0.0075, 0.00025, touch_m, pod, segments=3)
    panel.location = (side * 0.0034, 0.017, -0.003)

# The display: green text inside both lenses, readable from the front, and a faint outline of the waveguide
LINES = {
    "hero": ["Claude Code", "> make a kitchen timer", "Done. 3 tests pass."],
    "square": ["Claude Code", "> make a kitchen timer", "Done. 3 tests pass."],
    "spin": ["Claude Code", "> make a kitchen timer", "Done. 3 tests pass."],
    "memory": ["Marcus · Sam's BBQ", "Twins. Teaches chem.", "Owes you $20"],
    "memory-tall": ["Marcus · Sam's BBQ", "Twins. Teaches chem.", "Owes you $20"],
    "turn": ["Claude Code", "> make a kitchen timer", "Done. 3 tests pass."],
    "macro": ["Claude · 4 of 5 done", "tests passing", "Mom: call tonight?"],
    "studio": ["Made with Claude Code", "on a phone, in Termux", "No laptops harmed."],
    "linux": None,
}.get(SHOT)
if opt["hud"]:
    LINES = opt["hud"].split("|")
NO_HUD = opt["hud"] == "none"  # clear lenses; the films draw the display on top (see the QUAD lines below)


def hud_text(body, x, z, size, mat, parent):
    cu = bpy.data.curves.new("HUD text", "FONT")
    cu.body = body
    cu.size = size
    cu.align_x = "LEFT"
    ob = bpy.data.objects.new("HUD text", cu)
    ob.data.materials.append(mat)
    link(ob, parent)
    ob.location = (x, -0.0003, z)
    ob.rotation_euler = (math.radians(90), 0, 0)
    return ob


def hud_rect(x, z, w, h, mat, parent, t=0.00012):
    """A thin outlined rectangle (four bars)."""
    for (cx, cz, sw, sh) in [(x + w / 2, z, w, t), (x + w / 2, z - h, w, t), (x, z - h / 2, t, h), (x + w, z - h / 2, t, h)]:
        bm = bmesh.new()
        bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
        for v in bm.verts:
            v.co = Vector((cx + v.co.x * sw, -0.0003, cz + v.co.y * sh))
        mesh_object("HUD line", bm, mat, parent, smooth=False)


HS = float(opt["hudscale"])
for side in (() if NO_HUD else (-1, 1)):
    x0 = side * CX - LW * 0.36
    if LINES:
        for k, line in enumerate(LINES):
            hud_text(line, x0, LH * 0.16 - k * 0.0036 * HS, (0.0027 if k else 0.003) * HS, hud_m if k != 1 else dim_m, G)
    else:
        # A small Linux desktop: the panel, a terminal window and its lines
        hud_rect(x0, LH * 0.2, LW * 0.66, LH * 0.5, dim_m, G)
        hud_rect(x0, LH * 0.2, LW * 0.66, 0.0024, hud_m, G)
        hud_text("Applications        9:41", x0 + 0.0008, LH * 0.2 - 0.0018, 0.0016, hud_m, G)
        hud_rect(x0 + 0.003, LH * 0.2 - 0.0045, LW * 0.5, LH * 0.3, hud_m, G)
        for k, line in enumerate(["~ $ claude", "> make a timer", "Done."]):
            hud_text(line, x0 + 0.0045, LH * 0.2 - 0.0075 - k * 0.0028, 0.0019, hud_m if k != 1 else dim_m, G)

# ── The stack (shot "stack", --layers "TOP|...|BOTTOM"): the glasses rest on floating plates of smoked glass, one
# per layer of what makes them work, each named in green on its front edge
LAYERS = [x for x in opt.get("layers", "").split("|") if x] if SHOT == "stack" else []
PLATE_W, PLATE_D, PLATE_T, PLATE_GAP, PLATE_Y = 0.2, 0.19, 0.005, 0.03, 0.065
STACK_H = len(LAYERS) * PLATE_GAP
if LAYERS:
    plate_m, _ = principled("Smoked glass", **{"Base Color": (0.005, 0.007, 0.007, 1), "Roughness": 0.24, "Coat Weight": 0.7,
                                                "Coat Roughness": 0.06, "Specular IOR Level": 0.3})
    label_m = hud_m.copy()
    label_m.node_tree.nodes["Emission"].inputs["Strength"].default_value = 5.0
    for i, name in enumerate(LAYERS):
        top = -0.034 - i * PLATE_GAP
        rounded_box(f"Plate {i}", PLATE_W, PLATE_D, PLATE_T, 0.0016, plate_m, G).location = (0, PLATE_Y, top - PLATE_T / 2)
        front = PLATE_Y - PLATE_D / 2
        # A line of light along the front and right edges
        rounded_box("Edge", PLATE_W - 0.012, 0.0011, 0.0006, 0.0002, dim_m, G).location = (0, front + 0.0035, top + 0.0002)
        rounded_box("Edge", 0.0011, PLATE_D - 0.012, 0.0006, 0.0002, dim_m, G).location = (PLATE_W / 2 - 0.0035, PLATE_Y, top + 0.0002)
        cu = bpy.data.curves.new("Layer", "FONT")
        cu.body = f"{i + 1:02d}   {name}"
        cu.size = 0.0088
        cu.space_character = 1.12
        ob = bpy.data.objects.new("Layer", cu)
        ob.data.materials.append(label_m)
        link(ob, G)
        ob.location = (-PLATE_W / 2 + 0.008, front + 0.007, top + 0.0003)

# ── Studio ────────────────────────────────────────────────────────────────────
FLOOR_Z = -0.034 - STACK_H
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=2.0)
floor = mesh_object("Floor", bm, floor_m, smooth=False)
floor.location = (0, 0, FLOOR_Z)

world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0012, 0.0016, 0.0016, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0


def area(name, size, size_y, loc, energy, color=(1, 1, 1), target=(0, 0.02, 0), spread=180):
    li = bpy.data.lights.new(name, "AREA")
    li.spread = math.radians(spread)
    li.shape = "RECTANGLE"
    li.size, li.size_y = size, size_y
    li.energy = energy
    li.color = color
    ob = bpy.data.objects.new(name, li)
    link(ob)
    ob.location = loc
    d = Vector(target) - Vector(loc)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    return ob


area("Key", 0.32, 0.18, (0.32, -0.36, 0.34), 75, (1.0, 0.96, 0.92), spread=38)
area("Rim left", 0.025, 0.5, (-0.34, 0.22, 0.12), 80, (0.82, 0.94, 1.0))
area("Rim right", 0.025, 0.5, (0.36, 0.26, 0.1), 60, (0.82, 0.94, 1.0))
area("Top strip", 0.5, 0.03, (0.0, 0.0, 0.34), 32, (1, 1, 1))
area("Front strip", 0.03, 0.4, (-0.05, -0.45, 0.1), 18, (1, 1, 1))
area("Fill", 0.5, 0.5, (-0.4, -0.5, 0.08), 4, (0.9, 0.95, 1.0), spread=40)
if LAYERS:  # the plates are black glass: a dim lamp and a rim of their own pick out their edges, nothing more
    area("Stack key", 0.3, 0.3, (0.34, -0.42, -0.02), 3, (1.0, 0.97, 0.94), target=(0, 0.06, -0.034 - STACK_H / 2), spread=60)
    area("Stack rim", 0.02, 0.4, (0.36, 0.4, -0.034 - STACK_H / 2), 18, (0.82, 0.94, 1.0), target=(0, 0.06, -0.034 - STACK_H / 2))

# Light linking: the lamps light only the glasses, so the black floor shows nothing but their reflection (no grey
# sheen of softboxes at a grazing angle, no horizon line)
glasses_coll = bpy.data.collections.new("Glasses")
scene.collection.children.link(glasses_coll)
plates_coll = bpy.data.collections.new("Plates")
scene.collection.children.link(plates_coll)
for ob in scene.objects:
    if ob.type in {"MESH", "CURVE", "FONT"} and ob.name != "Floor":
        (plates_coll if ob.name.startswith("Plate") else glasses_coll).objects.link(ob)
for ob in scene.objects:
    if ob.type == "LIGHT":
        ob.light_linking.receiver_collection = plates_coll if ob.name.startswith("Stack") else glasses_coll

# ── Camera, per shot ──────────────────────────────────────────────────────────
cam_data = bpy.data.cameras.new("Camera")
cam = bpy.data.objects.new("Camera", cam_data)
link(cam)
scene.camera = cam
cam_data.sensor_width = 36
focus = bpy.data.objects.new("Focus", None)
link(focus)
cam_data.dof.use_dof = True
cam_data.dof.focus_object = focus

turn = math.radians(float(opt["angle"]))
SHOTS = {
    # (glasses turn, camera position, look at, focal length, f-stop, focus point)
    "hero": (math.radians(-28) + turn, (0.04, -0.56, 0.085), (-0.04, 0.01, -0.004), 85, 3.2, (0.02, -0.02, 0)),
    "turn": (math.radians(-28) + turn, (0.04, -0.56, 0.085), (-0.04, 0.01, -0.004), 85, 3.2, (0.02, -0.02, 0)),
    "square": (math.radians(-26), (0.12, -0.46, 0.13), (0.0, 0.015, -0.006), 85, 4.0, (0.02, -0.02, 0)),
    "linux": (math.radians(-10), (0.065, -0.47, 0.055), (0.004, 0.01, 0.0), 100, 4.0, (0.0, -0.01, 0)),
    "macro": (math.radians(-48), (0.0, -0.2, 0.035), (0.03, -0.03, 0.0), 100, 2.8, (0.04, -0.036, 0.005)),
    "studio": (math.radians(-34), (0.14, -0.47, 0.022), (0.0, 0.02, -0.012), 70, 4.0, (0.015, -0.02, 0)),
}
# The turntable turns about the middle of the glasses (front to pods), so they stay centred all the way round;
# "square" is its first frame, so the still and the loop match.
PIV_Y = 0.07
SPIN = ((math.radians(-26), (0.0, -0.55, 0.112), (0.0, PIV_Y, -0.022), 85, 5.6, (0.0, PIV_Y - 0.03, 0)))
SHOTS["square"] = SHOTS["spin"] = SPIN
# memory: the glasses right of centre (the film's words take the left); memory-tall: close, low in the frame
SHOTS["lens"] = (math.radians(-12), (0.035, -0.4, 0.052), (0.0, 0.0, -0.016), 85, 5.6, (0.02, -0.006, 0))
SHOTS["memory"] = (math.radians(-14), (0.03, -0.53, 0.074), (-0.036, 0.0, -0.002), 85, 5.6, (0.02, -0.006, 0))
SHOTS["memory-tall"] = (math.radians(-14), (0.03, -0.36, 0.068), (0.0, 0.0, 0.022), 85, 5.6, (0.02, -0.006, 0))
# The home page cards (square): desk, a Linux desktop in the lenses, face on; quiz, the low studio angle, closer
SHOTS["desk"] = (math.radians(-10), (0.05, -0.46, 0.052), (-0.006, 0.01, -0.006), 100, 4.0, (0.0, -0.01, 0))
SHOTS["quiz"] = (math.radians(-34), (0.105, -0.4, 0.017), (-0.014, 0.02, -0.012), 85, 4.0, (0.015, -0.02, 0))
# The stack, from above and to the right, so every plate's front edge shows
ZC = -0.034 - STACK_H * 0.42
SHOTS["stack"] = (math.radians(-20), (0.3, -0.61, ZC + 0.32), (0.0, 0.05, ZC), 70, 8.0, (0.0, -0.02, ZC + 0.03))
g_turn, cam_loc, look, focal, fstop, focus_at = SHOTS[SHOT]
if SHOT in ("square", "spin"):
    pivot = bpy.data.objects.new("Turntable", None)
    link(pivot)
    pivot.location = (0, PIV_Y, 0)
    G.parent = pivot
    G.location = (0, -PIV_Y, 0)
    G.rotation_euler = (0, 0, 0)
    pivot.rotation_euler = (0, 0, g_turn)
else:
    G.rotation_euler = (0, 0, g_turn)
    G.location = (0, 0, 0)
cam.location = cam_loc
cam.rotation_euler = (Vector(look) - Vector(cam_loc)).to_track_quat("-Z", "Y").to_euler()
cam_data.lens = focal
cam_data.dof.aperture_fstop = fstop
focus.location = focus_at

# ── Render ────────────────────────────────────────────────────────────────────
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = SAMPLES
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.015
scene.cycles.max_bounces = 10
scene.cycles.transmission_bounces = 12
scene.cycles.glossy_bounces = 8
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 1.0
scene.cycles.sample_clamp_indirect = 2.0
scene.cycles.sample_clamp_direct = 12.0
scene.cycles.adaptive_threshold = 0.01
try:
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception as error:  # no OIDN in this build: render clean with more samples instead
    print("DENOISER unavailable:", error)
    scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100

# Where each lens's display sits in the picture, in pixels (top-left, top-right, bottom-right, bottom-left), so a
# film can lay crisp, animated text over the lens with a CSS matrix3d
from bpy_extras.object_utils import world_to_camera_view
bpy.context.view_layer.update()
for side in (-1, 1):
    corners = []
    for (fx, fz) in ((-0.4, 0.32), (0.4, 0.32), (0.4, -0.32), (-0.4, -0.32)):
        co = G.matrix_world @ Vector((side * CX + fx * LW, -0.0003, fz * LH))
        u = world_to_camera_view(scene, cam, co)
        corners.append(f"{u.x * W:.1f},{(1 - u.y) * H:.1f}")
    print("QUAD", side, " ".join(corners))

scene.render.film_transparent = False
scene.view_settings.view_transform = "AgX"
for look_name in ("AgX - Punchy", "AgX - Medium High Contrast", "Punchy"):
    try:
        scene.view_settings.look = look_name
        break
    except Exception:
        pass
scene.view_settings.exposure = 0.3
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "16"
scene.render.filepath = opt["out"]
scene.render.threads_mode = "FIXED"
scene.render.threads = 7
if SHOT == "spin":
    # Video frames: fewer bounces than the stills (enough for two lens surfaces) and softer glossy paths, so a
    # moderate sample count comes out clean
    scene.cycles.max_bounces = 6
    scene.cycles.transmission_bounces = 6
    scene.cycles.glossy_bounces = 4
    scene.cycles.blur_glossy = 1.6
    scene.cycles.sample_clamp_indirect = 1.0
    # One full turn over N frames, keyed linearly from the hero angle, so frame N would equal frame 0: a seamless loop
    N = int(opt["frames"])
    pivot.rotation_euler = (0, 0, g_turn)
    pivot.keyframe_insert("rotation_euler", index=2, frame=0)
    pivot.rotation_euler = (0, 0, g_turn - math.tau)
    pivot.keyframe_insert("rotation_euler", index=2, frame=N)
    for fc in getattr(pivot.animation_data.action, "fcurves", []):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"
    try:  # Blender 5 keeps the curves in layered actions
        for layer in pivot.animation_data.action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for kp in fc.keyframe_points:
                            kp.interpolation = "LINEAR"
    except AttributeError:
        pass
    scene.render.fps = 24
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.5
    scene.render.use_persistent_data = True
    scene.render.use_overwrite = False
    scene.render.use_placeholder = True
    scene.render.image_settings.color_depth = "8"
    scene.frame_start = int(opt["from"])
    scene.frame_end = int(opt["to"]) if int(opt["to"]) >= 0 else N - 1
    scene.render.filepath = opt["out"].rstrip("/") + "/f####"
    bpy.ops.render.render(animation=True)
else:
    bpy.ops.render.render(write_still=True)
print("RENDERED", opt["out"])
