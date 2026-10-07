# Blender headless converter: FBX/OBJ/DAE/STL -> GLB, and Kenney animated-character packs
# (model FBX + separate animation FBX files + skin PNG) -> one GLB with all clips.
# Usage: blender --background --factory-startup --python convert.py -- <jobs.json>
#   jobs: [{ "type": "convert", "input": "...", "output": "...", "result": "..." }
#          { "type": "charpack", "model": "...", "anims": ["..."], "skin": "...|null", "output", "result" }]
import bpy, sys, os, json, time, traceback

args = sys.argv[sys.argv.index('--') + 1:]
jobs = json.load(open(args[0]))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_any(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=path, use_anim=True, ignore_leaf_bones=False)
    elif ext == '.obj':
        bpy.ops.wm.obj_import(filepath=path)
    elif ext == '.dae':
        bpy.ops.wm.collada_import(filepath=path)
    elif ext == '.stl':
        bpy.ops.wm.stl_import(filepath=path)
    elif ext in ('.glb', '.gltf'):
        bpy.ops.import_scene.gltf(filepath=path)
    else:
        raise RuntimeError('unsupported ' + ext)


def strip_extras():
    for o in list(bpy.data.objects):
        if o.type in ('CAMERA', 'LIGHT'):
            bpy.data.objects.remove(o, do_unlink=True)


def export(path, anim_mode='ACTIONS'):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.tmp.glb'
    bpy.ops.export_scene.gltf(
        filepath=tmp, export_format='GLB', export_yup=True, export_apply=False,
        export_animations=True, export_skins=True, export_morph=True,
        export_animation_mode=anim_mode, export_cameras=False, export_lights=False,
        export_extras=False, export_materials='EXPORT', export_image_format='AUTO')
    os.replace(tmp, path)


def set_skin(image_path):
    img = bpy.data.images.load(image_path)
    for m in bpy.data.materials:
        if not m.use_nodes:
            m.use_nodes = True
        nt = m.node_tree
        p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not p:
            continue
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None)
        if not tex:
            tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = img
        tex.interpolation = 'Closest'
        nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])


def charpack(job):
    import_any(job['model'])
    strip_extras()
    arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
    if arm is None:
        raise RuntimeError('no armature in model')
    if arm.animation_data is None:
        arm.animation_data_create()
    # Existing action from the model file (often a bind/T-pose) is dropped.
    arm.animation_data.action = None
    clips = []
    for ap in job['anims']:
        name = os.path.splitext(os.path.basename(ap))[0]
        before = set(bpy.data.objects)
        acts_before = set(bpy.data.actions)
        import_any(ap)
        new_objs = [o for o in bpy.data.objects if o not in before]
        new_acts = [a for a in bpy.data.actions if a not in acts_before]
        src_arm = next((o for o in new_objs if o.type == 'ARMATURE'), None)
        # Kenney anim FBX files hold a 2-frame "Targeting Pose" take plus the real clip:
        # take the longest non-pose action.
        cands = [a for a in new_acts if 'targeting pose' not in a.name.lower()] or new_acts
        act = max(cands, key=lambda a: a.frame_range[1] - a.frame_range[0]) if cands else None
        for a in new_acts:
            if a is not act:
                bpy.data.actions.remove(a)
        for o in new_objs:
            bpy.data.objects.remove(o, do_unlink=True)
        if act is None:
            continue
        act.name = name
        act.use_fake_user = True
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        start = int(act.frame_range[0])
        track.strips.new(name, start, act)
        clips.append(name)
    if job.get('skin'):
        set_skin(job['skin'])
    export(job['output'], anim_mode='NLA_TRACKS')
    return {'clips': clips}


def _base_name(n):
    import re
    return re.sub(r'\.\d{3}$', '', n or '')


def bind_textures(mat_textures):
    """{material name: image path}: link each image to that material's base colour (Quaternius FBX/OBJ
    exports carry no texture links; the names come from the pack's .blend sources)."""
    mats = [m for m in bpy.data.materials if m.users]
    bound = 0
    for m in mats:
        path = mat_textures.get(m.name) or mat_textures.get(_base_name(m.name))
        if not path and len(mat_textures) == 1 and len(mats) == 1:
            path = next(iter(mat_textures.values()))
        if not path:
            continue
        if not m.use_nodes:
            m.use_nodes = True
        nt = m.node_tree
        p = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not p:
            continue
        tex = next((n for n in nt.nodes if n.type == 'TEX_IMAGE'), None) or nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(path, check_existing=True)
        nt.links.new(tex.outputs['Color'], p.inputs['Base Color'])
        bound += 1
    return bound


def fix_alpha():
    """FBX opacity 0 on opaque materials (common in old Quaternius exports) would export as alphaMode MASK
    with alpha 0, i.e. invisible. An untextured alpha below 5 % is never intended: make it opaque."""
    fixed = 0
    for m in bpy.data.materials:
        if not (m.use_nodes and m.node_tree):
            continue
        p = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not p or 'Alpha' not in p.inputs:
            continue
        a = p.inputs['Alpha']
        if not a.is_linked and a.default_value < 0.05:
            a.default_value = 1.0
            fixed += 1
        bc = p.inputs['Base Color']
        if not bc.is_linked and bc.default_value[3] < 0.05:
            bc.default_value[3] = 1.0
        try:
            if m.blend_method != 'OPAQUE' and not a.is_linked and a.default_value >= 0.999:
                m.blend_method = 'OPAQUE'
        except Exception:
            pass
    return fixed


def clean_clip_names():
    """'Armature|Armature|Death' (FBX take names) -> 'Death'."""
    names = set()
    for a in bpy.data.actions:
        n = a.name.split('|')[-1].strip() or a.name
        if n in names:
            continue
        names.add(n)
        a.name = n


def convert(job):
    import_any(job['input'])
    strip_extras()
    if not any(o.type == 'MESH' for o in bpy.data.objects):
        raise RuntimeError('no mesh after import')
    info = {}
    if job.get('matTextures'):
        info['texturesBound'] = bind_textures(job['matTextures'])
    if job.get('fixAlpha'):
        info['alphaFixed'] = fix_alpha()
    if job.get('cleanClips'):
        clean_clip_names()
    export(job['output'])
    return info


for job in jobs:
    t0 = time.time()
    res = {'ok': False}
    try:
        reset()
        info = charpack(job) if job['type'] == 'charpack' else convert(job)
        res = {'ok': True, 'ms': int((time.time() - t0) * 1000), **info}
    except Exception as e:
        res = {'ok': False, 'error': (str(e) or repr(e))[:400], 'trace': traceback.format_exc()[-800:]}
    os.makedirs(os.path.dirname(job['result']), exist_ok=True)
    with open(job['result'], 'w') as f:
        json.dump(res, f)
    print('JOBDONE', job.get('output'), res.get('ok'), flush=True)
