# Blender headless probe: which image each material of a .blend source file uses.
# Quaternius ships FBX/OBJ exports without texture links; the .blend next to them has them.
# Usage: blender --background --factory-startup --python blend-textures.py -- <jobs.json> <out.json>
#   jobs: ["/abs/model.blend", ...]   out: {blend: {"materials": {mat: [image basename, ...]}, "error"?: str}}
import bpy, sys, os, json

args = sys.argv[sys.argv.index('--') + 1:]
jobs = json.load(open(args[0]))
out = {}
for p in jobs:
    try:
        bpy.ops.wm.open_mainfile(filepath=p, load_ui=False)
        mats = {}
        for m in bpy.data.materials:
            imgs = []
            if m.use_nodes and m.node_tree:
                # images feeding the Principled BSDF base colour first, then any other image node
                p_bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
                base = []
                if p_bsdf is not None:
                    for l in m.node_tree.links:
                        if l.to_node == p_bsdf and l.to_socket.name == 'Base Color' and l.from_node.type == 'TEX_IMAGE' \
                                and l.from_node.image:
                            base.append(l.from_node.image)
                others = [n.image for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image and n.image not in base]
                for im in base + others:
                    fp = bpy.path.abspath(im.filepath) if im.filepath else ''
                    name = os.path.basename(im.filepath.replace('\\', '/')) if im.filepath else im.name
                    imgs.append(name)
            mats[m.name] = imgs
        out[p] = {'materials': mats}
    except Exception as e:  # noqa
        out[p] = {'error': str(e)[:300]}
with open(args[1] + '.tmp', 'w') as f:
    json.dump(out, f)
os.replace(args[1] + '.tmp', args[1])
print('PROBED', len(out), flush=True)
