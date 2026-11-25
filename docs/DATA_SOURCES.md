# Data sources

Every number the calculators use lives in `data/*.yaml`, with its sources listed in the same file. This
page explains the choices behind those numbers: when two sources disagree, the row says which one is
used and why. Last review: 2026-11-25.

| File | Holds |
| --- | --- |
| `data/cosmetics.yaml` | spawn and rarity tables per patch, bad luck bonus, box slots |
| `data/monsters.yaml` | strength needed per monster, stunned strength, health |
| `data/upgrades.yaml` | upgrade caps, shop slots, truck size, reroll price |
| `data/spawning.yaml` | enemies per tier and level, group chance, despawn and respawn timers |

## Cosmetic boxes

Used: May 25 2026 patch. Spawn 25, 33, 41, 49, 57, 65 percent by step, bad luck bonus +25 percent per
dry level, slot 2 starts at level 6 and slot 3 at level 11. Older tables are not shipped (owner
decision 2026-11-24).

* R.E.P.O. wiki, page Cosmetic Boxes (fandom), updated November 2026.
* Steam guide Cosmetic Boxes Spawn Mechanics, same 25 percent base and +25 bad luck.
* Older guides (kosguides, treyexgaming) say 20 percent and +20. They describe the patch before May
  and are not used.

## Monster strength

Used: itemlevel.net, "How much strength do you need to pick up each monster" (Oct 1 2026), 29 monsters.
Rule: internal strength is 5 per player plus purchased Strength upgrades, and the team total is compared
with 5 plus the listed upgrades.

* Stunned strength and a few values: Deltia's Gaming and gamerblurb strength charts. A stunned monster
  needs 5 plus its `stunned` upgrades and is checked on its own, so a lone Rugrat without upgrades holds it
  when it is knocked out (`stunned: 0`) but not while it is active.
* Effort (yellow in the UI): `hard_ratio` is 0.75 of the strength needed while the monster is active. No
  source gives it, it comes from the owner's play (2026-11-25): a lone Rugrat cannot be lifted with 0 or 1
  upgrades (5 and 6 of 9), two players without upgrades can (10 of 9). With 0.75 the Rugrat is out of reach
  with 0 and 1 upgrades, held with effort with 2 and 3, and clean with 4. It does not apply to the stunned
  figure. The hunter grabbed by the feet or the head when knocked out is a partial grab and is not modeled.
* Conflict, Rugrat: pcgamer says 7 upgrades, itemlevel and gamerblurb say 4. 4 is used, pcgamer is older.
* Conflict, Headman stunned: fantime says 1 and gamerblurb says 4, and no source read settles it. Both are kept
  in `stunned: [1, 4]`, so the site shows the range (6 to 9 internal) and only says a team holds it stunned from
  the highest figure. One value in `stunned` is a sure figure, a list is a range, no key is no data (Pony).
* Research 2026-11-25 on the stunned figures (owner asked for more sources). The in game chart of the Monster
  Update (v0.3.0, 2025-10-30) is copied by Deltia's Gaming, gamerblurb and the awtysm Bae guide, and the three
  agree (Chef 1, Clown 1, Hidden 0, Reaper 0, Robe 4, Trudge 1, Gambit 4, Headman 4, Cleanup Crew 2). They are
  one source, not three, and they predate patch v0.3.1 (2025-11-14), which says "Enemies: corrected required
  grab force for some enemies" without listing them. The wiki table (Chef 2, Clown 3, Hidden 1, Reaper 1,
  Robe 6, Trudge 5, Gambit 3, Cleanup Crew 5) is later, so it stays. fantime is later too but inconsistent
  (Trudge 4 against the wiki 5, Headgrab "???"), so it only counts for Headman. The Steam guide Entity Strength
  Chart (2026) is an image and could not be read. Nothing found shows which Headman figure is right: only a
  test in game does (a lone player with 1 upgrade against a stunned Headman).
* Conflict, Cleanup Crew: 13 in itemlevel, 12 in a newer chart. 13 is used.
* Conflict, Tick: 0 and "do not grab" in itemlevel, 13 in gamerblurb. 0 is used with a note.
* Health: only where a source states it (wiki Monsters, pcgamer, fantime). Missing health stays empty
  for Animal, Hidden, Headgrab, Bowtie, Gambit, Heart Hugger, Oogly, Cleanup Crew, Loom and Tick.
  Fill them from the wiki table when its full text can be read.

## Shop upgrades

Used: wiki pages Purchased Items and Upgrades, and the owner's research notes.

* Caps in circulation: Strength 2, Range 3, Stamina 4, Sprint 3, Crouch Rest 3, Health 2, and 1 each
  for Map Player Count, Tumble Launch, Tumble Wings, Tumble Climb, Extra Jump, Death Head Battery.
  Total 23 units.
* The shop shows up to 10 units. Units bought and not used count as in circulation. The truck holds 16.
* Map Player Count never returns once bought or used.
* Reroll: the first costs 5000 and each next one adds another 5000 (since v0.4.0).
* Open: how the game draws from the available units. The engine assumes every unit is equally likely.
  This only matters when more than 10 units are available. It never changes the guaranteed case.
* The void is the overflow of bought and unused units that do not fit in the 16 slot truck (video
  xYEGPmfww9A, 01:52 and 08:54). They stay out of the pool, new purchases always take truck slots first so
  the void holds the older units, and using units sends them back to the pool and refills the truck from
  the void. The order in which void units come back is not stated, so it is not modeled.
* The ceiling shop that sells Duct Taped Grenade and Human Grenade at a fixed 2000 each is unrelated to
  the void. It is not modeled.

## Videos

Read from captions with `scripts/transcribe.py` (yt-dlp, with a faster-whisper fallback for videos
without captions, Instagram included). Full text in `docs/transcripts/<video id>.txt`, last read 2026-11-25.
A number that differs from these tables must be fixed here and in the data, with the video id and time.

* cYPnWvc24v4 (SiniK, recorded right after update 4, so its spawn numbers are older): box count is 1
  for levels 1 to 5, 2 for 6 to 10 and 3 from 11. Spawn and rarity come from animation curves on
  (levels completed mod 5) / 5. A level without boxes adds the bad luck bonus, it stacks, and it applies to
  every box roll until one succeeds. Odds of at least one box of a rarity use the complement rule, not
  sums: 1 minus the product of (1 minus spawn times rarity). The engine matches this, and a test pins the
  video example. Discrepancy: the video says 5.81 percent for level 16 with three boxes at 60 percent and
  3.27 percent ultra; the same inputs give 5.77 percent, and 5.886 percent is the expected number of
  ultra boxes, not the chance of seeing one. The video's 3.27 is probably rounded.
* xYEGPmfww9A (SiniK): upgrade manipulation. Pool of units, the shop draws 10 from it, the truck holds
  16, the rest of what you hold sits in the void, used units return to the pool except Map Player Count.
  It talked about 21 units; the engine uses 23 after the 2 new upgrades (see the description: 13 units
  stashed, or 12 with Map Player Count). Matches the engine.
* GyCMcu3uPIE (alter ego): spawning. Modeled in `repo_core.spawning`, see the next section.

## Spawning

Used: video GyCMcu3uPIE (alter ego). Enemies per tier by level: levels 1 to 2 one tier 1 and one tier 3,
3 to 5 one of each, 6 to 8 two of each, 9 to 10 an extra tier 2, 11 and up an extra tier 3. A tier 3 spawn
becomes a group 3.2 percent of the time. Despawn is 3 to 4 minutes plus 20 to 40 seconds, and the second part
stops inside a 20 unit bubble. Respawn is 4 to 5 minutes in the first 10 minutes and about immediate after
50, kills triple it, the final extraction sets 1 second, and each second of noise removes 5 seconds.

* itemlevel.net "Spawning, Vision and Noise Detection Explained" (May 2025) gives the same counts per tier
  (1, 0, 1 / 1, 1, 1 / 2, 2, 2 / 2, 3, 2 / 2, 3, 3), so the two sources agree.
* Not modeled: weights per monster and tier membership. The only source is from May 2025, before the
  roster went from 19 to 29 monsters. The timer between 10 and 50 minutes is not stated anywhere read so
  far, so the engine returns "unknown" instead of a guess.
* The late respawn base of 1 second is derived: the video says a killed enemy comes back in 3 seconds after
  50 minutes and kills triple the timer.
