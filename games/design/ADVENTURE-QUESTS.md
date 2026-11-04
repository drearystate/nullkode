# Adventure games: what the player is doing, where, and why

Reference for the top-down / third-person adventure blueprint and the kit's quest system (NK3D.quests). The old
blueprint (`design/blueprints/top-down-adventure.json`) knows one shape only: overworld + dungeons + tool gates + bosses.
The 517 NES games in `design/classics/nes/` were measured for feel (speed, jumps, sprites, HUD bands), never for story or
quests, so nothing in that research covers what follows.

## 1. Places (what a "site" can be)
A site is any self-contained area the story sends you to. Dungeon is one kind of many.

| Site | What happens there | Typical goal |
|---|---|---|
| Village / town | people, shops, homes, the quest board | talk, trade, deliver, help, defend |
| Temple / shrine | trials, puzzles, a sacred object | prove worth, restore, receive a blessing |
| Mine / quarry | depth, carts, darkness, collapse | rescue miners, reopen it, find ore |
| Ruins | broken paths, old inscriptions | uncover a secret, assemble a relic |
| Tower | climb, view of the world | reach the top, light the beacon, reveal the map |
| Keep / castle | guards, a ruler, a throne room | infiltrate, free a prisoner, take it back |
| Forest / marsh / desert / snow region | getting lost, weather, creatures | find a way through, track someone |
| Lake / river / well / spring | water source | clear, unblock, purify, restore flow |
| Farm / orchard / mill | seasons, animals, machines | repair, protect a harvest, herd |
| Camp / caravan / ship / port | travellers, departures | escort, smuggle, get passage |
| Cave / grotto | small optional rooms | a secret, a hermit, a treasure |
| Lair / arena | one fight | a boss, a challenge |

Rule: every site gets a name, a reason it matters to the people of the world, and a visible before/after.

## 2. Goals (the verbs of a quest)
A quest step is one verb on one target. Combined steps make quests (Doran & Parberry's structural analysis of 750 MMORPG
quests found ~20 actions and 9 motives cover nearly all of them).

| Verb | Example | What the kit checks |
|---|---|---|
| go | reach the tower top | hero enters area/room/tile |
| talk | ask the elder | dialogue with a person ends on a line |
| find | find the lost child | person/item discovered (seen in range) |
| get / gather | 3 river pearls | item count ≥ n |
| bring / deliver | medicine to the healer | item given to a person |
| use / place | the crank on the sluice | item used at a spot |
| repair / restore | rebuild the bridge, clear the spring | world state flag set by a use/place |
| escort / follow | lead the child home | companion reaches a spot alive |
| defend | hold the gate until dawn | survive a timed wave event |
| defeat | the beast in the mill | named enemy dies |
| clear | drive the wolves off the farm | no enemies left in a set of rooms |
| sneak / avoid | slip past the guards | reach a spot without being seen |
| learn / read | the old inscription | read an object, unlocks a clue |
| trade / exchange | swap a fish for a lantern | item A given, item B received |
| choose | free the thief or turn him in | a dialogue choice sets a flag |
| wait / time | come back at night | world clock or a story beat |

Motives (why someone asks): knowledge, comfort, reputation, serenity, protection, conquest, wealth, ability, equipment.
A quest giver always states one of them in their own words.

## 3. Quest shapes that work
- **Main line in acts.** 3–5 acts. Each act: a problem in a place you care about → travel → a site → a change you can see
  → a new problem. A dungeon is only one possible site per act.
- **World changes are the reward.** Restored water flows back into the village (fountain, crops, people return);
  a rebuilt bridge opens a new region; a freed prisoner opens a shop. Show it, don't just set a flag.
- **The trading chain.** Person A wants X; X is owned by B who wants Y… ends in something big (a weapon, a ship).
- **Lost person.** Clue → tracks → the place they went → the find → escort home → the family thanks you, something changes.
- **Restore.** Find why something broke (blocked spring, stolen bell, cursed tree) → fetch or defeat → place/use →
  the world changes, and people react in their next lines.
- **Many small favours fill a hub.** Each person in town has one want; finishing them grows the town (Bastion's earned hub).
- **Optional side quests.** Never needed to finish; pay in hearts, money, an item, a shortcut, or a story secret.
- **Avoid:** generic fetch (generic item, generic trip), escorts with fragile companions, any quest whose middle changes
  nothing.

## 4. Story skeletons (pick one, then make it your own)
1. *The drought*: the village's water stopped; follow the river up to the source (a blocked spring, a dam, a sleeping
   spirit) through 3 places, each fixing one stretch; the last act is the cause.
2. *The lost child*: a child followed a light into the woods; clues lead through marsh, ruins and a tower; the light was a
   spirit who needs help too.
3. *The broken seal*: three temples hold seals; one cracked; restore each before the thing beneath wakes.
4. *The exile returns*: the hero comes home to find the town taken; win the people back one favour at a time, then take
   back the keep.
5. *The festival*: the town's festival is in 3 days; recover the stolen bell, the lantern oil and the musician; time
   passes with each act.
6. *The trader's road*: escort a caravan between towns; each stop has its own trouble.

## 5. The rest of a complete game (beyond quests)
Title + continue + settings; pause; save slots; inventory with real item models + descriptions; equipment; quest log
(active / done, current step, where); minimap + world map with quest markers; dialogue boxes with portrait, name and
choices; scenes (camera, characters, lines) for act starts and ends; shops and prices; a town that changes; music per
region + ambient sound; game over → retry; ending + credits; replay stats.

## 6. How this maps to the kit
- `NK3D.quests(scene, data)`: quests = steps of the verbs above, each step `{do, target, n?, where?, say?}`; completion
  sets flags; flags drive world states (`world.states`: e.g. `water:restored` swaps the dry fountain for a flowing one,
  turns the ponds on, moves people), dialogue lines, map markers (`maps.mark`) and the objective (`rooms.objective`).
- Sites in the world data carry `site` (temple, mine, ruins, tower, keep, well, village…) and a name; the map and the
  quest log use both.
- The world generator plans acts from §3/§4 instead of "N dungeons", and only then decides which acts use a
  dungeon-like site.
