// Generic: a worker improves the terrain around the player's cities (civ-clone/web-renderer#234): it takes a terrain
//  job, or carries on with one, when it has no city site to settle and none it can reach, or when the player wants
//  more workers on terrain jobs than it has, by the ruleset's `TerrainPolicy` (`lib/Unit/terrainWork`). Otherwise it
//  drops any job it has. Handles the action only when the worker has a job to get on with; otherwise the next strategy
//  (`simple-ai-client`'s `WorkerTurn`) carries on as usual.
//
// For one worker of a human player's ("automate Settlers", civ-clone/web-renderer#200), `order` does the next sensible
//  terrain job as a standing order (`UnitOrder`): it never settles, and walks there peacefully (`followPath`).
import terrainWork, {
  TerrainPolicy,
  dropTerrainJob,
  finishTerrainJob,
  planTerrainJob,
  terrainJobs,
} from '../../lib/Unit/terrainWork';
import AIStrategy from '@civ-clone/base-strategy-ai/Strategies/lib/AIStrategy';
import Dependencies from '@civ-clone/base-strategy-ai/lib/Dependencies';
import Knowledge from '@civ-clone/base-strategy-ai/lib/Knowledge';
import Memory from '@civ-clone/base-strategy-ai/lib/Memory';
import { OrderStrategy } from '@civ-clone/base-strategy-ai/Strategies/lib/OrderStrategy';
import Player from '@civ-clone/core-player/Player';
import PlayerAction from '@civ-clone/core-player/PlayerAction';
import Tile from '@civ-clone/core-world/Tile';
import Unit from '@civ-clone/core-unit/Unit';
import UnitOrder from '@civ-clone/base-strategy-ai/PlayerActions/UnitOrder';
import Worker from '@civ-clone/base-unit-type-worker/Worker';
import enemyAdjacent from '@civ-clone/base-strategy-ai/lib/Unit/enemyAdjacent';
import followPath from '@civ-clone/base-strategy-ai/lib/Unit/followPath';
import { lookupActions } from '@civ-clone/base-strategy-ai/lib/actionLookup';
import reachableTiles from '@civ-clone/base-strategy-ai/lib/Unit/reachable';
import unitTurnContextFor from '@civ-clone/base-strategy-ai/Strategies/lib/unitTurnContextFor';

// How a computer player's worker walks to its job, along the path in its player's memory, stopping where it ends with
//  any moves left to the caller: the client's own move executor.
export type TerrainWorkTravel = (
  dependencies: Dependencies,
  player: Player,
  memory: Memory,
  knowledge: Knowledge,
  unit: Unit
) => Promise<void>;

export class TerrainWork extends AIStrategy implements OrderStrategy {
  private _policy: TerrainPolicy;
  private _travel: TerrainWorkTravel;

  constructor(
    dependencies: Dependencies,
    knowledge: Knowledge,
    policy: TerrainPolicy,
    travel: TerrainWorkTravel
  ) {
    super(dependencies, knowledge);

    this._policy = policy;
    this._travel = travel;
  }

  handles(action: PlayerAction): boolean {
    return action.value() instanceof Worker;
  }

  async attempt(action: PlayerAction<Unit>): Promise<boolean> {
    const player = action.player(),
      unit = action.value(),
      memory = this.memoryFor(player),
      jobs = terrainJobs(memory),
      { actions, target, tile } = unitTurnContextFor(
        this.dependencies(),
        action
      );

    // A worker settles rather than improves terrain if it can: it's on its way to a city site or standing on one, or
    //  there's a site it can reach and the player has the terrain workers it wants without it. Asked of every worker
    //  this is offered to: one at work is busy, and isn't offered.
    const others = [...jobs.keys()].filter(
      (other: Unit): boolean => other !== unit
    ).length;

    if (
      target ||
      (actions.foundCity &&
        this.knowledge().shouldBuildCity(this.dependencies(), player, tile)) ||
      (others >= this._policy.workersWanted(this.dependencies(), player) &&
        this.siteInReach(unit, tile, memory.targets.goodSitesForCities))
    ) {
      dropTerrainJob(memory, unit);

      return false;
    }

    return terrainWork(
      this.dependencies(),
      player,
      memory,
      this._policy,
      unit,
      actions,
      (): Promise<void> =>
        this._travel(
          this.dependencies(),
          player,
          memory,
          this.knowledge(),
          unit
        )
    );
  }

  // The next terrain job for the unit, as a standing order: never settling, and handing the unit back (`false`) when
  //  there's no job it can do or another player's unit is near.
  order(action: UnitOrder): boolean {
    const dependencies = this.dependencies(),
      player = action.player(),
      unit = action.value(),
      memory = this.memoryFor(player);

    if (enemyAdjacent(dependencies, player, unit)) {
      return false;
    }

    const plan = planTerrainJob(
      dependencies,
      player,
      memory,
      this._policy,
      unit,
      lookupActions(unit.actions())
    );

    if (typeof plan === 'boolean') {
      return plan;
    }

    if (
      followPath(dependencies, player, memory, this.knowledge(), unit) ===
      'threatened'
    ) {
      return false;
    }

    finishTerrainJob(dependencies, unit, plan);

    return true;
  }

  private siteInReach(unit: Unit, tile: Tile, sites: Tile[]): boolean {
    if (!sites.some((site: Tile): boolean => site !== tile)) {
      return false;
    }

    const reachable = reachableTiles(unit);

    return sites.some(
      (site: Tile): boolean =>
        site !== tile && (reachable === null || reachable.has(site))
    );
  }
}

export default TerrainWork;
