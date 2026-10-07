# Blender headless preview renderer (Workbench, fast, no GPU needed).
# Consistent 3/4 view (azimuth 45 deg, elevation 30 deg), orthographic, transparent background.
# Usage: blender --background --factory-startup --python render.py -- <jobs.json> [size]
#   jobs: [{ "input": "model.glb|gltf", "output": "preview.png", "result": "result.json" }]
import bpy, sys, os, json, math, time, traceback
import mathutils

args = sys.argv[sys.argv.index('--') + 1:]
jobs = json.load(open(args[0]))
SIZE = int(args[1]) if len(args) > 1 else 256


def setup_scene():
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'TEXTURE'
    sh.show_cavity = True
    sh.cavity_type = 'WORLD'
    sh.show_shadows = False
    sh.show_specular_highlight = True
    sh.show_backface_culling = False
    sc.render.resolution_x = SIZE
    sc.render.resolution_y = SIZE
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.display_settings.display_device = 'sRGB'
    sc.view_settings.view_transform = 'Standard'
    sc.render.use_freestyle = False
    sc.display.render_aa = '8'
    return sc


def render(job):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = setup_scene()
    bpy.ops.import_scene.gltf(filepath=job['input'])
    for m in bpy.data.materials:
        if m.use_nodes and m.node_tree:
            p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if p:
                c = p.inputs['Base Color'].default_value
                m.diffuse_color = (c[0], c[1], c[2], 1.0)
    for img in bpy.data.images:
        pass
    sc.frame_set(sc.frame_start)
    pts = _points(sc)
    arms = [o for o in sc.objects if o.type == 'ARMATURE']
    if arms and pts:
        # The first frame of the active clip can fling or squash the mesh (seen in a Quaternius FBX gun whose
        # 'Fire' clip throws a bullet 400 units away). If the posed extent is far from the rest-pose extent,
        # show the rest pose instead.
        for o in arms:
            o.data.pose_position = 'REST'
        bpy.context.view_layer.update()
        rest = _points(sc)
        if rest and not (0.2 <= _span(pts) / max(_span(rest), 1e-6) <= 5.0):
            pts = rest
        else:
            for o in arms:
                o.data.pose_position = 'POSE'
            bpy.context.view_layer.update()
    if not pts:
        raise RuntimeError('no mesh geometry')
    return _shoot(sc, pts, job)


def _span(pts):
    return max(max(p[k] for p in pts) - min(p[k] for p in pts) for k in range(3))


def _points(sc):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in sc.objects:
        if o.type == 'MESH' and not o.hide_render:
            oe = o.evaluated_get(dg)
            try:
                me = oe.to_mesh()
                mw = oe.matrix_world
                vs = me.vertices
                step = max(1, len(vs) // 4000)
                for i in range(0, len(vs), step):
                    pts.append(mw @ vs[i].co)
                oe.to_mesh_clear()
            except Exception:
                pts += [oe.matrix_world @ mathutils.Vector(c) for c in oe.bound_box]
    return pts


def _shoot(sc, pts, job):
    mn = mathutils.Vector([min(p[k] for p in pts) for k in range(3)])
    mx = mathutils.Vector([max(p[k] for p in pts) for k in range(3)])
    center = (mn + mx) / 2
    az, el = math.radians(45), math.radians(30)
    d = mathutils.Vector((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el)))
    rot = (-d).to_track_quat('-Z', 'Y')
    # Fit: project points into camera space, size ortho scale to the larger extent.
    inv = rot.to_matrix().inverted()
    xs, ys = [], []
    for p in pts:
        q = inv @ (p - center)
        xs.append(q.x)
        ys.append(q.y)
    w = max(xs) - min(xs)
    h = max(ys) - min(ys)
    offs = mathutils.Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, 0))
    radius = max((mx - mn).length / 2, 1e-4)
    cam = bpy.data.cameras.new('previewcam')
    cam.type = 'ORTHO'
    cam.ortho_scale = max(w, h, 1e-4) * 1.12
    cam.clip_start = radius * 0.01
    cam.clip_end = radius * 10
    co = bpy.data.objects.new('previewcam', cam)
    sc.collection.objects.link(co)
    sc.camera = co
    co.rotation_euler = rot.to_euler()
    co.location = center + rot.to_matrix() @ offs + d * radius * 4
    os.makedirs(os.path.dirname(job['output']), exist_ok=True)
    sc.render.filepath = job['output']
    bpy.ops.render.render(write_still=True)
    return {}


for job in jobs:
    t0 = time.time()
    try:
        render(job)
        res = {'ok': True, 'ms': int((time.time() - t0) * 1000)}
    except Exception as e:
        res = {'ok': False, 'error': (str(e) or repr(e))[:400], 'trace': traceback.format_exc()[-600:]}
    os.makedirs(os.path.dirname(job['result']), exist_ok=True)
    with open(job['result'], 'w') as f:
        json.dump(res, f)
    print('JOBDONE', job['output'], res['ok'], flush=True)
