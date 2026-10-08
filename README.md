# base-strategy-terrain-work

Workers improving the terrain around a player's cities (civ-clone/web-renderer#234), as the computer players do it and
as a standing order for one of a player's units ("automate Settlers", civ-clone/web-renderer#200). Built on
[`base-strategy-ai`](https://github.com/civ-clone/base-strategy-ai).

- `lib/Unit/terrainWork`: the `TerrainPolicy` a ruleset supplies (what each improvement of a tile is worth, and how
  many workers it wants on terrain jobs), choosing a job (`chooseTerrainJob`, `hasOpenTerrainJob`), and doing it:
  `planTerrainJob` starts the job or finds a path to it, the caller walks the worker there, and `finishTerrainJob`
  starts it on arrival. `terrainWork` is the three together, with the walk passed in.
- `Strategies/Unit/TerrainWork`: `new TerrainWork(dependencies, knowledge, policy, travel)`. For a computer player's
  worker, `attempt` keeps it for settling when it should settle, and otherwise does its job, walking there with
  `travel` (the client's own move executor). `order(new UnitOrder(player, unit))` does the next job as a standing
  order, never settling, walking there peacefully (`followPath`); it returns `false` to hand the unit back when there's
  no job it can do or another player's unit is near.
