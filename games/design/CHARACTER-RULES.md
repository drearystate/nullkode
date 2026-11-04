# Character design rules (side view + top-down)

Every character the Game Studio designs or animates follows these. Each rule is checkable from the rig, the
drawn frame or the motion data. Units: H = the character's head height.

## 1. Proportions and silhouette (the body must read in motion)
- Head ≤ 1/3 of total height (chibi 3 H, stylised 4–5 H, heroic 7 H). Head width ≤ 1.6× shoulder width.
- Shoulders, waist and hips are visible shapes. No closed cloak, robe or blob that hides the frame; use an open cape, a coat that splits at the hips, or a fitted tunic.
- Silhouette test: filled solid black, idle and the main attack must still read (limbs, weapon, facing).
- Hoods and helmets are shaped (skull, brow, jaw/hem onto the shoulders), never a plain circle.

## 2. Skeleton (one skeleton for every humanoid)
- Joints use the standard humanoid names: pelvis, spine_01/03/05, neck_01, head, clavicle, upperarm, lowerarm, hand, thigh, calf, foot, ball (left and right). Any motion on that skeleton plays on any character.
- Limbs attach at fixed sockets: shoulders on the chest either side of the spine, hips on the pelvis. Only the collarbone may move the shoulder, a little (shrug/drop about 25°, forward/back about 15°).
- End-of-chain parts use their own bone's orientation: head (up + forward), hands (palm), feet (toes). Never derive them from a short neighbouring bone.
- Bone lengths are the character's own; motion supplies directions only (retargeting).
- Extra chains for capes, scarves, hair, tails and hood tips are driven by physics, never by the motion.

## 3. Joints and body mechanics
- Knees and elbows bend one way only. Feet stay planted while weight is on them (no foot skate); heel lifts, toe pushes off.
- Strikes: wind-up → strike → follow-through. Hips lead, then torso, then arms. Shoulders shrug into the wind-up.
- Wrists stay near neutral and lock straight at impact, weapon in line with the forearm. No whipping wrist.
- Large weapons (staffs, two-handed swords, hammers) are held and swung with two hands. Swings travel on a tilted arc across the body (high-behind → low-in-front), not straight over the head.
- At rest: upright spine, knees nearly straight, feet under the hips, shoulders level, free arm relaxed at the side. One hand may hold a staff upright at chest height, elbow down, held out so the item never covers the face.
- Weight stays over the feet unless the move is a fall, a lunge or a dive.

## 4. Building the parts
- Every part pivots at its joint centre and overlaps the next with a rounded end: no seams, no outlines where parts meet. Sleeves grow out of the shirt at the shoulder in the shirt's colour.
- Shoulders are their own piece (chest → shoulder cap); the arm hangs from the cap, not from the torso's edge.
- Clothing is one of three kinds: rigid (armour, moves with its bone), soft (tunic, bends with the spine), flowing (cape, scarf, coat tails, hair: physics).
- Flowing cloth = one physics spine (gravity, damping) with the cloth's width grown from it on the side away from the body, narrow at the attachment and wide at the hem. The body is a wall it cannot pass through and the ground stops it.
- Accessories (scarves, collars, belts, straps, pouches) follow the body part they are worn on and sit at its anatomical place: a scarf wraps the base of the neck just above the shoulder line and turns with the chest, not the head. An accessory never covers a joint it doesn't belong to (a collar never hides the shoulder cap). Loose ends (scarf tails, ribbons, tassels) hang on physics like other flowing cloth.
- Shading: one light direction (top-left) for the whole game; three values per material (base, shade on the far side, rim light on the lit edge). Palette ≤ 6 colours per character plus one glow/accent.

## 5. Depth and drawing order
- Near limbs draw in front of the body, far limbs behind, decided per frame by depth.
- A large head or hood hides a limb that overlaps it unless the limb is clearly in front of the head.
- Weapons and held items stay readable: drawn over the head unless clearly behind it.
- Facing away from the camera shows the back of the head (no face).

## 6. Motion data rules
- Classify every move by what its data does, never by its file name: facing, travel direction (forward / backward / sideways / in place), loop or one-shot, root distance.
- Turn every move to face the same way before use. Run the foot-skate check on every move; reject or correct one whose planted feet slide.
- Moves for unarmed actions hide the weapon (free hands); weapon moves show it.

## 7. Views
- One 3D-lite skeleton serves side view and top-down. Top-down uses the same motion seen from above at 4 or 8 facings, with depth order and foreshortening from the 3D data.

## 8. Originality
- Every character is the game's own: own name, design, palette and costume. Real games and photos are references for mechanics and feel only; never reproduce another game's character, outfit or logo.

## 9. Review checklist (playtester)
Run on idle, run, jump, main attack, hit and death:
1. Head ≤ 1/3 height; shoulders, waist and hips visible?
2. Arms attached at the shoulders on every frame?
3. Feet planted while loaded; no foot skate?
4. Knees/elbows within limits; wrists locked at impact?
5. Two hands on large weapons; swing on a tilted arc?
6. Cloth drapes, trails and lies on the ground; never inside the body?
7. Depth order right (near/far limbs, head over overlapping limbs, weapon readable)?
8. Moves face and travel the way their tags say?
