"""
The book on the home page: a fold of glass screens on one polished hinge, path-traced in Blender Cycles.

  blender -b --factory-startup --python tools/render/book.py -- --tex DIR --w 1600 --h 1100 --samples 128 \
      --rest-samples 256 --frames 0-54 --out DIR            (a page-turn sequence, f0000.png …; resumes)
  blender … -- --tex DIR --still 0 --out file.png          (one frame)

Like a book whose pages are foldable phones. Every page is a slab of black glass with a screen in both faces and a
polished chrome edge; they all hang on one hinge. The book stands open in a shallow V and a page turns through the
front, edge on to the camera half way over. Four spreads, one per thing I've built: page N carries ui-N on its front
(the right-hand page) and media-N+1 on its back (the next left-hand page); the first left-hand page is media-0.
TURN frames a turn, so frames 0, TURN, 2·TURN and 3·TURN are the four spreads at rest.

The screens are photographs of tools/render/book-screens.html (tools/render/book-tex.mjs). The glass picks up long
soft reflections from two strip lights the camera never sees; the chrome edges catch a top strip and two coloured rims.
"""

import bpy
import bmesh
import json
import math
import os
import sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = {"tex": "", "w": "1600", "h": "1100", "samples": "128", "rest-samples": "", "out": "/tmp/book.png",
       "still": "", "frames": "0-54", "turn": "18", "quad": "", "emit": "1.15", "hole": ""}
for i in range(0, len(argv) - 1, 2):
    opt[argv[i].lstrip("-")] = argv[i + 1]
W, H = int(opt["w"]), int(opt["h"])
SAMPLES = int(opt["samples"])
REST_SAMPLES = int(opt["rest-samples"] or SAMPLES)
TURN = int(opt["turn"])
EMIT = float(opt["emit"])

scene = bpy.context.scene
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

# ── Dimensions (metres): a page is a little larger than a big phone ───────────
SCW = 0.134                     # screen width
SCH = SCW * 1390 / 1000         # screen height: the textures are 1000 × 1390
BZ = 0.005                      # bezel
SW, SH, PT = SCW + 2 * BZ, SCH + 2 * BZ, 0.0042   # slab width, height, thickness
R_SLAB, R_SCREEN = 0.012, 0.008
GAP0 = 0.0065                   # from the hinge axis to the slab's inner edge
XC = GAP0 + SW / 2              # the slab's centre, along the page
A = math.radians(26)            # how far each half of the V leans toward the camera
D = math.radians(3.8)           # each page deeper in a stack opens this much flatter
SP = PT + 0.0032                # and sits this much further back


# ── Materials ─────────────────────────────────────────────────────────────────
def principled(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    for k, v in inputs.items():
        bsdf.inputs[k].default_value = v
    return m, bsdf


chrome_m, _ = principled("Polished chrome", **{"Base Color": (0.62, 0.64, 0.68, 1), "Metallic": 1.0, "Roughness": 0.13})
rod_m, _ = principled("Hinge rod", **{"Base Color": (0.16, 0.17, 0.18, 1), "Metallic": 1.0, "Roughness": 0.22})
spine_m, _ = principled("Spine", **{"Base Color": (0.05, 0.055, 0.06, 1), "Metallic": 1.0, "Roughness": 0.18})
glass_m, _ = principled("Black glass", **{"Base Color": (0.003, 0.0035, 0.004, 1), "Roughness": 0.2, "Specular IOR Level": 0.0,
                                         "Coat Weight": 1.0, "Coat Roughness": 0.008, "Coat IOR": 1.5})
floor_m, _ = principled("Black acrylic", **{"Base Color": (0.002, 0.0024, 0.0026, 1), "Roughness": 0.1, "Specular IOR Level": 0.22})
backdrop_m, _bd = principled("Backdrop", **{"Base Color": (0.022, 0.024, 0.027, 1), "Roughness": 1.0, "Specular IOR Level": 0.0,
                                            "Emission Color": (0.5, 0.85, 0.8, 1)})


def backdrop_grid(m, bsdf, cells=26.0, line=0.035, strength=0.05):
    """A faint lit grid on the backdrop, strongest behind the book and gone by the edges."""
    nt = m.node_tree
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])

    def node(op, a, b=None, c=None):
        n = nt.nodes.new("ShaderNodeMath")
        n.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                nt.links.new(v, n.inputs[i])
        return n.outputs[0]

    def lines(coord, scale):
        f = node("FRACT", node("MULTIPLY", coord, scale))
        return node("LESS_THAN", f, line)

    gx, gz = lines(sep.outputs["X"], cells * 2), lines(sep.outputs["Z"], cells)
    grid = node("MAXIMUM", gx, gz)
    # falloff: 1 at the middle, 0 at the edges, in both directions
    fx = node("SUBTRACT", 1.0, node("POWER", node("MULTIPLY_ADD", sep.outputs["X"], 2.0, -1.0), 2.0))
    fz = node("SUBTRACT", 1.0, node("POWER", node("MULTIPLY_ADD", sep.outputs["Z"], 2.0, -1.0), 2.0))
    fade = node("POWER", node("MULTIPLY", fx, fz), 3.0)
    nt.links.new(node("MULTIPLY", node("MULTIPLY", grid, fade), strength), bsdf.inputs["Emission Strength"])


backdrop_grid(backdrop_m, _bd)


def screen_mat(name):
    """A lit screen under a glass coat: the picture glows, the coat carries a sharp reflection on top."""
    m, bsdf = principled(name, **{"Base Color": (0, 0, 0, 1), "Roughness": 0.2, "Specular IOR Level": 0.0,
                                  "Coat Weight": 1.0, "Coat Roughness": 0.008, "Coat IOR": 1.5, "Emission Strength": EMIT})
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(os.path.join(opt["tex"], name + ".png"))
    tex.interpolation = "Cubic"
    m.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
    return m


def sheen_mat(name, strength, color):
    """An emitter for reflections only: brightest down its middle, falling off to nothing at the sides."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    # f(x) = (1 - (2x - 1)²)², a soft bell across the strip
    m1 = nt.nodes.new("ShaderNodeMath"); m1.operation = "MULTIPLY_ADD"; m1.inputs[1].default_value = 2; m1.inputs[2].default_value = -1
    nt.links.new(sep.outputs["X"], m1.inputs[0])
    m2 = nt.nodes.new("ShaderNodeMath"); m2.operation = "POWER"; m2.inputs[1].default_value = 2
    nt.links.new(m1.outputs[0], m2.inputs[0])
    m3 = nt.nodes.new("ShaderNodeMath"); m3.operation = "SUBTRACT"; m3.inputs[0].default_value = 1
    nt.links.new(m2.outputs[0], m3.inputs[1])
    m4 = nt.nodes.new("ShaderNodeMath"); m4.operation = "POWER"; m4.inputs[1].default_value = 2
    nt.links.new(m3.outputs[0], m4.inputs[0])
    # and a gentler fall-off along it, (1 - (2y - 1)²), so the reflection fades out at both ends
    l1 = nt.nodes.new("ShaderNodeMath"); l1.operation = "MULTIPLY_ADD"; l1.inputs[1].default_value = 2; l1.inputs[2].default_value = -1
    nt.links.new(sep.outputs["Y"], l1.inputs[0])
    l2 = nt.nodes.new("ShaderNodeMath"); l2.operation = "POWER"; l2.inputs[1].default_value = 2
    nt.links.new(l1.outputs[0], l2.inputs[0])
    l3 = nt.nodes.new("ShaderNodeMath"); l3.operation = "SUBTRACT"; l3.inputs[0].default_value = 1
    nt.links.new(l2.outputs[0], l3.inputs[1])
    lm = nt.nodes.new("ShaderNodeMath"); lm.operation = "MULTIPLY"
    nt.links.new(m4.outputs[0], lm.inputs[0])
    nt.links.new(l3.outputs[0], lm.inputs[1])
    m5 = nt.nodes.new("ShaderNodeMath"); m5.operation = "MULTIPLY"; m5.inputs[1].default_value = strength
    nt.links.new(lm.outputs[0], m5.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    nt.links.new(m5.outputs[0], em.inputs["Strength"])
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


# ── Helpers ───────────────────────────────────────────────────────────────────
book_coll = bpy.data.collections.new("Book")
scene.collection.children.link(book_coll)
set_coll = bpy.data.collections.new("Set")
scene.collection.children.link(set_coll)


def link(obj, parent=None, coll=None):
    (coll or book_coll).objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def to_object(name, bm, mats, parent=None, coll=None, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in mats:
        me.materials.append(m)
    if smooth:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(34))
    return link(bpy.data.objects.new(name, me), parent, coll)


def rrect(w, h, r, seg=10):
    """A rounded rectangle about the origin, anticlockwise in (x, z)."""
    pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for s in range(seg + 1):
            a = math.radians(a0 + 90 * s / seg)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def slab(name, parent, w=SW, h=SH, t=PT, xc=XC):
    """Black glass faces (material 0) on a polished chrome rim (material 1); the bevel rounds the rim into the glass."""
    bm = bmesh.new()
    pts = rrect(w, h, R_SLAB)
    front = [bm.verts.new((xc + x, -t / 2, z)) for x, z in pts]
    back = [bm.verts.new((xc + x, t / 2, z)) for x, z in pts]
    bm.faces.new(front).material_index = 0
    bm.faces.new(list(reversed(back))).material_index = 0
    n = len(pts)
    for i in range(n):
        bm.faces.new((front[i], front[(i + 1) % n], back[(i + 1) % n], back[i])).material_index = 1
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = to_object(name, bm, [glass_m, chrome_m], parent)
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width = 0.0016
    mod.segments = 5
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(30)
    mod.material = 1
    mod.harden_normals = True
    return ob


def screen(name, parent, mat, back):
    """A screen laid on one face of a page. Seen from its own side its picture reads the right way round."""
    bm = bmesh.new()
    pts = rrect(SCW, SCH, R_SCREEN)
    y = (PT / 2 + 0.00006) * (1 if back else -1)
    verts = [bm.verts.new((XC + x, y, z)) for x, z in (reversed(pts) if back else pts)]
    face = bm.faces.new(verts)
    uv = bm.loops.layers.uv.new("UVMap")
    for loop in face.loops:
        x, z = loop.vert.co.x - XC, loop.vert.co.z
        loop[uv].uv = ((0.5 - x / SCW) if back else (0.5 + x / SCW), 0.5 + z / SCH)
    return to_object(name, bm, [mat], parent, smooth=False)


# ── The pages ─────────────────────────────────────────────────────────────────
# PL: the first left-hand page (media-0 on its back). P0..P3: the turning pages. B*: blank pages that fill out each
# stack. C*: the covers, a little larger, the last page on each side.
pages = {}


def page(name, front=None, back=None, cover=False):
    pivot = link(bpy.data.objects.new(name, None))
    if cover:
        slab(name + " slab", pivot, w=SW + 0.006, h=SH + 0.008, t=0.0055, xc=GAP0 + (SW + 0.006) / 2)
    else:
        slab(name + " slab", pivot)
    if front:
        screen(name + " front", pivot, screen_mat(front), back=False)
    if back:
        screen(name + " back", pivot, screen_mat(back), back=True)
    pages[name] = pivot
    return pivot


page("PL", back="media-0-hole" if opt["hole"] else "media-0")  # --hole 1: the film's square left dark, for the live film
for i in range(4):
    page(f"P{i}", front=f"ui-{i}", back=f"media-{i + 1}" if i < 3 else None)
for n in ("BL0", "BL1", "BR0", "BR1"):
    page(n)
page("CL", cover=True)
page("CR", cover=True)


def pose(side, j):
    """Angle about the hinge and pivot (x, y) for the page j deep in the right (side 1) or left (side -1) stack."""
    if side > 0:
        return -A + j * D, j * SP * math.sin(A), j * SP * math.cos(A)
    return -(math.pi - A) - j * D, -j * SP * math.sin(A), j * SP * math.cos(A)


def spread(k):
    """Where every page rests when spread k (0..3) is open."""
    left = [f"P{i}" for i in range(k - 1, -1, -1)] + ["PL", "BL0", "BL1", "CL"]
    right = [f"P{i}" for i in range(k, 4)] + ["BR0", "BR1", "CR"]
    s = {n: pose(-1, j) for j, n in enumerate(left)}
    s.update({n: pose(1, j) for j, n in enumerate(right)})
    return s


def ease(p):
    return 4 * p ** 3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2


def set_frame(f):
    k, q = divmod(f, TURN)
    if k >= 3:
        k, q = 3, 0
    a, b, e = spread(k), spread(min(k + 1, 3)), ease(q / TURN)
    for n, ob in pages.items():
        (a0, x0, y0), (a1, x1, y1) = a[n], b[n]
        ob.rotation_euler = (0, 0, a0 + (a1 - a0) * e)
        ob.location = (x0 + (x1 - x0) * e, y0 + (y1 - y0) * e, 0)


# ── The hinge: five polished knuckles on a dark rod, a dark spine behind ──────
HZ = SH / 2 + 0.002
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=48, radius1=0.0043, radius2=0.0043, depth=2 * HZ)
to_object("Hinge rod", bm, [rod_m])
KG = 0.0014
KH = (2 * HZ - 4 * KG) / 5
for i in range(5):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=0.0058, radius2=0.0058, depth=KH)
    ob = to_object(f"Knuckle {i}", bm, [chrome_m])
    ob.location = (0, 0, -HZ + KH / 2 + i * (KH + KG))
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width, mod.segments, mod.limit_method, mod.harden_normals = 0.0009, 3, "ANGLE", True
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 0.02, v.co.y * 0.032 + 0.022, v.co.z * 2 * HZ))
ob = to_object("Spine", bm, [spine_m])
mod = ob.modifiers.new("Bevel", "BEVEL")
mod.width, mod.segments, mod.harden_normals = 0.004, 4, True

# ── The set: a black acrylic floor, a dark backdrop washed in cyan and green ──
FLOOR_Z = -(SH + 0.008) / 2 - 0.0002
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=2.0)
floor = to_object("Floor", bm, [floor_m], coll=set_coll, smooth=False)
floor.location = (0, 0.4, FLOOR_Z)
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.0)
for v in bm.verts:
    v.co = Vector((v.co.x * 2.4, 0, v.co.y * 1.2))
backdrop = to_object("Backdrop", bm, [backdrop_m], coll=set_coll, smooth=False)
backdrop.location = (0, 0.6, 0.25)

world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.0006, 0.0008, 0.001, 1)


def area(name, size, size_y, loc, energy, color, target, receivers, spread=180):
    li = bpy.data.lights.new(name, "AREA")
    li.shape, li.size, li.size_y, li.energy, li.color, li.spread = "RECTANGLE", size, size_y, energy, color, math.radians(spread)
    ob = bpy.data.objects.new(name, li)
    scene.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    ob.light_linking.receiver_collection = receivers
    return ob


CYAN, GREEN = (0.42, 0.78, 1.0), (0.45, 1.0, 0.68)
area("Glow left", 0.3, 0.3, (-0.2, 0.25, 0.04), 1.6, CYAN, (-0.36, 0.6, 0.06), set_coll)
area("Glow right", 0.3, 0.3, (0.2, 0.25, 0.04), 1.6, GREEN, (0.36, 0.6, 0.06), set_coll)
area("Rim left", 0.02, 0.36, (-0.36, 0.26, 0.03), 12, CYAN, (-0.06, 0.0, 0.0), book_coll)
area("Rim right", 0.02, 0.36, (0.36, 0.26, 0.03), 12, GREEN, (0.06, 0.0, 0.0), book_coll)
area("Top strip", 0.8, 0.03, (0.0, -0.18, 0.5), 18, (1, 1, 1), (0, 0, 0.1), book_coll)
area("Top back", 0.7, 0.025, (0.0, 0.2, 0.42), 8, (0.9, 0.96, 1.0), (0, 0, 0.1), book_coll)
area("Key", 0.5, 0.3, (0.38, -0.7, 0.5), 10, (1.0, 0.97, 0.93), (0, 0, 0), book_coll, spread=60)


def sheen(name, loc, facing, roll, size, strength, color=(1, 1, 1)):
    """A strip of light only the glass sees: the long soft reflection that slides over the screens."""
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0] * 2, v.co.y * size[1] * 2, 0))
    ob = to_object(name, bm, [sheen_mat(name, strength, color)], coll=set_coll, smooth=False)
    ob.location = loc
    q = (Vector(facing) - Vector(loc)).to_track_quat("Z", "Y")
    ob.rotation_euler = q.to_euler()
    ob.rotation_euler.rotate_axis("Z", math.radians(roll))
    ob.visible_camera = False
    ob.visible_diffuse = False
    ob.visible_shadow = False
    ob.light_linking.receiver_collection = book_coll
    return ob


# ── Camera ────────────────────────────────────────────────────────────────────
cam_data = bpy.data.cameras.new("Camera")
cam = bpy.data.objects.new("Camera", cam_data)
scene.collection.objects.link(cam)
scene.camera = cam
cam_data.sensor_width = 36
cam_data.lens = 85
cam.location = (0, -1.06, 0.17)
cam.rotation_euler = (Vector((0, 0, -0.012)) - cam.location).to_track_quat("-Z", "Y").to_euler()
focus = bpy.data.objects.new("Focus", None)
scene.collection.objects.link(focus)
focus.location = (0, -0.04, 0)
cam_data.dof.use_dof = True
cam_data.dof.focus_object = focus
cam_data.dof.aperture_fstop = 8.0


def mirror(angle, along, z, dist):
    """Where a light must hang for the camera to see it in a page resting at `angle`, at a point `along` (0..1) its
    width and at height z: the camera ray, reflected off the glass, carried `dist` metres. Returns (light, point)."""
    d = Vector((math.cos(angle), math.sin(angle), 0))
    p = d * (GAP0 + along * SW) + Vector((0, 0, z))
    n = Vector((-d.y, d.x, 0))
    if n.dot(cam.location - p) < 0:
        n = -n
    v = (p - cam.location).normalized()
    return p + (v - 2 * v.dot(n) * n) * dist, p


# Each page's glass carries one long soft diagonal sheen, the same slant on both pages, as from one window
for side, ang, roll in (("left", -(math.pi - A), -34), ("right", -A, 34)):
    loc, at = mirror(ang, 0.42, 0.05, 0.42)
    sheen(f"Sheen on the {side} page", loc, at, roll, (0.022, 0.24), 2.2)

# ── Render ────────────────────────────────────────────────────────────────────
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = 0.01
scene.cycles.max_bounces = 6
scene.cycles.diffuse_bounces = 2
scene.cycles.glossy_bounces = 4
scene.cycles.transmission_bounces = 2
scene.cycles.caustics_reflective = False
scene.cycles.caustics_refractive = False
scene.cycles.blur_glossy = 0.5
scene.cycles.sample_clamp_indirect = 1.0
scene.cycles.sample_clamp_direct = 6.0
try:
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
except Exception as error:
    print("DENOISER unavailable:", error)
    scene.cycles.use_denoising = False
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
for vt in ("Khronos PBR Neutral", "AgX"):
    try:
        scene.view_settings.view_transform = vt
        break
    except TypeError:
        pass
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "8"
scene.render.threads_mode = "FIXED"
scene.render.threads = 4
scene.render.use_persistent_data = True


def quad(f):
    """Where the film sits in frame f (the square in media-0, on PL's back), in pixels: TL, TR, BR, BL."""
    from bpy_extras.object_utils import world_to_camera_view
    set_frame(f)
    bpy.context.view_layer.update()
    pl = pages["PL"]
    out = []
    for px, py in ((60, 190), (940, 190), (940, 1070), (60, 1070)):
        local = Vector((XC + SCW * (0.5 - px / 1000), PT / 2, SCH * (0.5 - py / 1390)))
        u = world_to_camera_view(scene, cam, pl.matrix_world @ local)
        out.append([round(u.x * W, 1), round((1 - u.y) * H, 1)])
    return out


q0 = quad(0)
print("QUAD", json.dumps(q0))
if opt["quad"]:
    with open(opt["quad"], "w") as fh:
        json.dump({"w": W, "h": H, "film": q0}, fh)

if opt["still"]:
    f = int(opt["still"])
    set_frame(f)
    scene.cycles.samples = REST_SAMPLES if f % TURN == 0 else SAMPLES
    scene.render.filepath = opt["out"]
    bpy.ops.render.render(write_still=True)
    print("RENDERED", opt["out"])
else:
    a, b = (int(x) for x in opt["frames"].split("-"))
    os.makedirs(opt["out"], exist_ok=True)
    for f in range(a, b + 1):
        path = os.path.join(opt["out"], f"f{f:04d}.png")
        if os.path.exists(path) and os.path.getsize(path) > 0:
            continue
        set_frame(f)
        scene.cycles.samples = REST_SAMPLES if f % TURN == 0 else SAMPLES
        scene.render.filepath = path + ".tmp.png"
        bpy.ops.render.render(write_still=True)
        os.replace(path + ".tmp.png", path)
        print("FRAME", f, flush=True)
    print("RENDERED", opt["out"])
